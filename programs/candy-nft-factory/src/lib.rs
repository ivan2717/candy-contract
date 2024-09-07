use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{
    create_master_edition_v3, create_metadata_accounts_v3, CreateMasterEditionV3,
    CreateMetadataAccountsV3, Metadata,
};
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};
use mpl_token_metadata::types::{DataV2,Collection};


declare_id!("9UaULu8Zx4wEMq7RS8chMjWVxHKd8fuH6peufJL9xWBN");

#[program]
pub mod candy_nft_factory {
    use super::*;

    pub fn init_phase(
        ctx:Context<InitPhase>,
        name:String,
        symbol:String,
        base_uri:String,
        max_supply:u64,

    ) -> Result<()>{
        ctx.accounts.phase.phase_id += 1;
        ctx.accounts.phase.max_supply = max_supply;
        ctx.accounts.phase.name = name;
        ctx.accounts.phase.symbol = symbol;
        ctx.accounts.phase.base_uri = base_uri;
        ctx.accounts.phase.current_nft_id = 0;
        Ok(())
    }

    pub fn mint_nft(
        ctx:Context<MintNFT>,
        phase_id:u64,
        nft_id: u64,
    ) -> Result<()>{
        
        if ctx.accounts.phase.current_nft_id >= ctx.accounts.phase.max_supply {
            msg!("Maximum supply limit reached!");
            return Err(CandyError::MaxSupplyLimit.into());
        }

        if phase_id != ctx.accounts.phase.phase_id {
            msg!("Phase id Mismatch: {}",ctx.accounts.phase.phase_id);
            return Err(CandyError::PhaseIdMismatch.into());
        }

        if nft_id != ctx.accounts.phase.current_nft_id {
            msg!("Nft id Mismatch: {}",ctx.accounts.phase.current_nft_id);
            return Err(CandyError::NftIdMismatch.into());
        }
        let id_bytes = ctx.accounts.phase.current_nft_id.to_be_bytes();
        ctx.accounts.phase.current_nft_id = nft_id + 1;

        let phase_id_bytes = ctx.accounts.phase.phase_id.to_be_bytes();

        msg!("===========1");

        let (_pda,bump) = Pubkey::find_program_address(&["mint".as_bytes(),id_bytes.as_ref(),phase_id_bytes.as_ref()], ctx.program_id);
        msg!("===========2");

        let seeds = &["mint".as_bytes(),id_bytes.as_ref(),phase_id_bytes.as_ref(),&[bump]];

        let seeds_binding = [&seeds[..]];
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo { 
                mint: ctx.accounts.mint.to_account_info(), 
                to: ctx.accounts.token_account.to_account_info(), 
                authority: ctx.accounts.authority.to_account_info(),
            }, 
            &seeds_binding
        );
        msg!("===========3");
        mint_to(cpi_context, 1)?;
        msg!("===========4");

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
            &seeds_binding,
        );

        msg!("===========5");
        let (collection_pda,_bump) = Pubkey::find_program_address(&["collection".as_bytes(),phase_id_bytes.as_ref()], ctx.program_id);
        msg!("===========6");

        let data_v2 = DataV2 { 
            name:ctx.accounts.phase.name.clone(), 
            symbol:ctx.accounts.phase.symbol.clone(), 
            uri:ctx.accounts.phase.base_uri.clone() + &nft_id.to_string() +".png", 
            seller_fee_basis_points: 0,
            creators: None,
            collection: Some(Collection { verified: false, key: collection_pda }),
            uses: None
         };
         msg!("===========7");

         create_metadata_accounts_v3(cpi_context,data_v2,true,true,None)?;
         
         msg!("===========8");

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
            &seeds_binding
        );

        create_master_edition_v3(cpi_context,Some(0))?;

        msg!("Minting NFT with details:");
        msg!("Payer: {}", ctx.accounts.payer.key());
        msg!("Token ID: {}", nft_id);

        Ok(())
    }




}


#[account]
#[derive(InitSpace)]
pub struct Phase {
    pub phase_id: u64,
    pub current_nft_id: u64,
    pub max_supply:u64,
    #[max_len(200)]
    pub base_uri: String,
    #[max_len(20)]
    pub name: String,
    #[max_len(10)]
    pub symbol: String,
}


#[derive(Accounts)]
pub struct InitPhase<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Phase::INIT_SPACE,
        seeds = ["phase".as_bytes()],
        bump

    )] // 计算存储空间大小
    pub phase: Account<'info, Phase>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(phase_id:u64,nft_id: u64)]
pub struct MintNFT<'info>{

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
        seeds = ["mint".as_bytes(),phase_id.to_le_bytes().as_ref(), nft_id.to_le_bytes().as_ref()], 
        // seeds = ["mint".as_bytes()], 
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

    #[account(mut)]
    pub phase:Account<'info, Phase>,

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


#[error_code]
pub enum CandyError {
    #[msg("Maximum supply limit reached!")]
    MaxSupplyLimit,
    #[msg("Nft id Mismatch")]
    NftIdMismatch,
    #[msg("Phase id Mismatch")]
    PhaseIdMismatch,
}


