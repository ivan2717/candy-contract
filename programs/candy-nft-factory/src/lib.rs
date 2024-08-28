use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{
    create_master_edition_v3, create_metadata_accounts_v3, CreateMasterEditionV3,
    CreateMetadataAccountsV3, Metadata,
};
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};
use mpl_token_metadata::types::{Collection, Creator, DataV2};

declare_id!("5s22UgQDtLFvyy67X2jgV3XhhPdTEBR7drGZe8wf81ec");

const OWNER: &str = "5s22UgQDtLFvyy67X2jgV3XhhPdTEBR7drGZe8wf81ec";

#[program]
pub mod candy_nft_factory {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn init_nft(
        ctx:Context<InitNFT>,
        id: u64,
        name: String,
        symbol: String,
        uri: String,
        max_supply:u64,
    ) -> Result<()>{
        
        let id_bytes = id.to_le_bytes();
        let seeds = &["mint".as_bytes(),id_bytes.as_ref(),&[ctx.bumps.mint],];

        let binding = [&seeds[..]];
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo { 
                mint: ctx.accounts.mint.to_account_info(), 
                to: ctx.accounts.token_account.to_account_info(), 
                authority: ctx.accounts.authority.to_account_info(),
            }, 
            &binding
        );
        mint_to(cpi_context, 1)?;

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                payer:ctx.accounts.payer.to_account_info(),
                mint:ctx.accounts.mint.to_account_info(),
                metadata:ctx.accounts.nft_metadata.to_account_info(),
                mint_authority:ctx.accounts.authority.to_account_info(),
                update_authority:ctx.accounts.authority.to_account_info(),
                system_program:ctx.accounts.system_program.to_account_info(),
                rent:ctx.accounts.rent.to_account_info(),
            },
            &binding,
        );

        let data_v2 = DataV2 { 
            name, 
            symbol, 
            uri, 
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None
         };

         create_metadata_accounts_v3(cpi_context,data_v2,true,true,None)?;

         let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.metadata_program.to_account_info(),
            CreateMasterEditionV3 { 
                edition:ctx.accounts.master_edition_account.to_account_info(),
                payer:ctx.accounts.payer.to_account_info(),
                mint:ctx.accounts.mint.to_account_info(),
                metadata:ctx.accounts.nft_metadata.to_account_info(),
                mint_authority:ctx.accounts.authority.to_account_info(),
                update_authority:ctx.accounts.authority.to_account_info(),
                system_program:ctx.accounts.system_program.to_account_info(),
                token_program:ctx.accounts.token_program.to_account_info(),
                rent:ctx.accounts.rent.to_account_info(),
            },
            &binding
        );

        create_master_edition_v3(cpi_context,Some(max_supply))?;

        Ok(())
    }




}

#[derive(Accounts)]
pub struct Initialize {}






#[derive(Accounts)]
#[instruction(id: u64)]
pub struct InitNFT<'info>{

    #[account(mut)]
    pub authority:Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account( 
        init,
        payer = payer, 
        mint::decimals = 0,
        mint::authority = authority,
        mint::freeze_authority = authority,
        seeds = ["mint".as_bytes(), id.to_le_bytes().as_ref()], 
        bump,
        )]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer,
    )]
    pub token_account: Account<'info, TokenAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub metadata_program: Program<'info, Metadata>,

    #[account(
        mut,
        seeds = [
            b"metadata".as_ref(),
            metadata_program.key().as_ref(),
            mint.key().as_ref(),
            b"edition".as_ref(),
        ],
        bump,
        seeds::program = metadata_program.key()
      )]
    /// CHECK:
    pub master_edition_account: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            b"metadata".as_ref(),
            metadata_program.key().as_ref(),
            mint.key().as_ref(),
        ],
        bump,
        seeds::program = metadata_program.key()
    )]
    /// CHECK:
    pub nft_metadata: UncheckedAccount<'info>,

}




