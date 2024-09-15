use std::str::FromStr;

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::sysvar::instructions::{ID as IX_ID,load_instruction_at_checked};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{
    create_master_edition_v3, create_metadata_accounts_v3, CreateMasterEditionV3,
    CreateMetadataAccountsV3, Metadata,
};
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};
use mpl_token_metadata::types::{DataV2,Collection};
use anchor_lang::solana_program::ed25519_program::ID as ED25519_ID;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::program::invoke_signed;


declare_id!("BdnJUuLWJy38K2At7zdUuCGu64SVwwMTDg4MSsNT6jxx");

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
        let owner = get_owner()?;
        if ctx.accounts.authority.key() != owner {
            return Err(CandyError::OnlyOwner.into());
        }
        ctx.accounts.phase.phase_id += 1;
        ctx.accounts.phase.max_supply = max_supply;
        ctx.accounts.phase.name = name;
        ctx.accounts.phase.symbol = symbol;
        ctx.accounts.phase.base_uri = base_uri;
        ctx.accounts.phase.current_nft_id = 0;
        ctx.accounts.phase.signer = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn mint_nft(
        ctx:Context<MintNFT>,
        lamports:u64,
        expire_at:i64,
        signature:[u8;64]
    ) -> Result<()>{

        let mut ix_ed25519_index = 0;
        while let Ok(ix) =load_instruction_at_checked(ix_ed25519_index,&ctx.accounts.ix_sysvar)   {
            if ix.program_id == ED25519_ID {
                break;
            }
            ix_ed25519_index += 1;
        }

        let ix = load_instruction_at_checked(ix_ed25519_index, &ctx.accounts.ix_sysvar)?;
        msg!("expire_at:{}",expire_at);
        msg!("signature: {:?}",signature);
        let mut message = Vec::new();
        message.extend_from_slice(&ctx.accounts.payer.key.to_bytes());
        message.extend_from_slice(&lamports.to_le_bytes());
        message.extend_from_slice(&expire_at.to_le_bytes());
        msg!("lamports: {}",lamports);

        msg!("message: {:?}",message);
        let owner = get_owner()?;
        verify_ed25519_ix(&ix, owner.as_ref(), &message, &signature)?;

        msg!("verify success");
        msg!("contract_vault:{}",ctx.accounts.contract_vault.key);

        // if ctx.accounts.authority.key() != owner {
        //     return Err(CandyError::OnlyOwner.into());
        // }
        

        if ctx.accounts.phase.current_nft_id >= ctx.accounts.phase.max_supply {
            msg!("Maximum supply limit reached!");
            return Err(CandyError::MaxSupplyLimit.into());
        }

        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;
        msg!("current_timestamp:{} expire_at:{}",current_timestamp,expire_at);
        if  current_timestamp > expire_at{
            msg!("signature expired");
            return Err(CandyError::SignatureExpired.into());
        }

        msg!("contract_vault: {} ",ctx.accounts.contract_vault.key());

        let transfer_ix = system_instruction::transfer(ctx.accounts.payer.key,  ctx.accounts.contract_vault.key, lamports);
        invoke(&transfer_ix, &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.contract_vault.to_account_info(),
            ctx.accounts.system_program.to_account_info()
        ])?;

        let nft_id = ctx.accounts.phase.current_nft_id;
        let id_bytes = ctx.accounts.phase.current_nft_id.to_be_bytes();
        let phase_id_bytes = ctx.accounts.phase.phase_id.to_be_bytes();

        ctx.accounts.phase.current_nft_id += 1;

        let (_pda,bump) = Pubkey::find_program_address(&["mint".as_bytes(),id_bytes.as_ref(),phase_id_bytes.as_ref()], ctx.program_id);
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
            &seeds_binding,
        );

        let (collection_pda,_bump) = Pubkey::find_program_address(&["collection".as_bytes(),phase_id_bytes.as_ref()], ctx.program_id);

        let data_v2 = DataV2 { 
            name:ctx.accounts.phase.name.clone(), 
            symbol:ctx.accounts.phase.symbol.clone(), 
            uri:ctx.accounts.phase.base_uri.clone() + &nft_id.to_string() +".png", 
            seller_fee_basis_points: 0,
            creators: None,
            collection: Some(Collection { verified: false, key: collection_pda }),
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
            &seeds_binding
        );

        create_master_edition_v3(cpi_context,Some(0))?;

        msg!("Minting NFT with details:");
        msg!("Payer: {}", ctx.accounts.payer.key());
        msg!("Token ID: {}", nft_id);
        msg!("Mint Address: {}", ctx.accounts.mint.to_account_info().key());
        msg!("Payment Amount: {}", lamports);

        Ok(())
    }


    pub fn claim(
        ctx:Context<Claim>,
        rewards:u64,
        signature:[u8;64]
    )->Result<()>{

        let mut ix_ed25519_index = 0;
        while let Ok(ix) =load_instruction_at_checked(ix_ed25519_index,&ctx.accounts.ix_sysvar)   {
            if ix.program_id == ED25519_ID {
                break;
            }
            ix_ed25519_index += 1;
        }

        let ix = load_instruction_at_checked(ix_ed25519_index, &ctx.accounts.ix_sysvar)?;

        let mut message = Vec::new();
        message.extend_from_slice(&ctx.accounts.payer.key.to_bytes());
        message.extend_from_slice(&ctx.accounts.mint.key().to_bytes());
        message.extend_from_slice(&rewards.to_le_bytes());

        let owner = get_owner()?;
        verify_ed25519_ix(&ix, owner.as_ref(), &message, &signature)?;

        msg!("verify signature success");
        if ctx.accounts.claim_record.is_claimed {
            return Err(CandyError::DuplicatedClaimError.into());
        }

        if ctx.accounts.token_account.owner != ctx.accounts.payer.key() {
            return  Err(CandyError::InvalidOwnerError.into());
        }

        // let seeds = &[b"vault".as_ref()];
        let (contract_vault,bump) = Pubkey::find_program_address(&[b"vault"], ctx.program_id);

        msg!("bump1: {} bump2{}",bump,ctx.bumps.contract_vault);
        msg!("mint: {} token_account: {}",ctx.accounts.mint.key(),ctx.accounts.token_account.key());
        msg!("contract_vault1: {} contract_vault2: {} ",contract_vault, ctx.accounts.contract_vault.key());
        msg!("reward: {}",rewards);
        let transfer_instruction = system_instruction::transfer(
            &ctx.accounts.contract_vault.key(),
            &ctx.accounts.payer.key(),
            rewards,
        );

        // let seeds = &[&[b"vault"],&[bump]];
        let seeds = &["vault".as_bytes(),&[bump]];
        let seeds_binding = [&seeds[..]];
        invoke_signed(
            &transfer_instruction, 
            &[
                ctx.accounts.contract_vault.to_account_info(),
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.system_program.to_account_info()
            ], 
            &seeds_binding
        )?;
        
        ctx.accounts.claim_record.is_claimed = true;
        Ok(())
    }


}

fn verify_ed25519_ix(ix: &Instruction, pubkey: &[u8], msg: &[u8], sig: &[u8]) -> Result<()> {

    msg!("ix.program_id: {} ED25519_ID: {}",ix.program_id,ED25519_ID);
    msg!("ix.accounts.len(): {}",ix.accounts.len());
    msg!("left: {} right: {}",ix.data.len() ,16 + 64 + 32 + msg.len());
    msg!("ix.data: {:?}",ix.data);
    msg!("msg: {:?}",msg);
    if  ix.program_id       != ED25519_ID                   ||  // The program id we expect
        ix.accounts.len()   != 0                            ||  // With no context accounts
        ix.data.len()       != (16 + 64 + 32 + msg.len())       // And data of this size
    {
        return Err(CandyError::SigVerificationFailed.into());    // Otherwise, we can already throw err
    }

    check_ed25519_data(&ix.data, pubkey, msg, sig)?;            // If that's not the case, check data

    Ok(())
}

fn get_owner()->Result<Pubkey> {
    let pubkey_str = "BBgai5MfC5s6z944bXTxFK9FpzR5uLkLBpFBhBgPB6LT"; 
    let pubkey = Pubkey::from_str(pubkey_str);
    match pubkey {
        Ok(pubkey) => Ok(pubkey),
        Err(_) => Err(CandyError::ParsePubkeyError.into()),
    }
    
}

pub fn check_ed25519_data(data: &[u8], pubkey: &[u8], msg: &[u8], sig: &[u8]) -> Result<()> {
    // According to this layout used by the Ed25519Program
    // https://github.com/solana-labs/solana-web3.js/blob/master/src/ed25519-program.ts#L33

    // "Deserializing" byte slices

    let num_signatures                  = &[data[0]];        // Byte  0
    let padding                         = &[data[1]];        // Byte  1
    let signature_offset                = &data[2..=3];      // Bytes 2,3
    let signature_instruction_index     = &data[4..=5];      // Bytes 4,5
    let public_key_offset               = &data[6..=7];      // Bytes 6,7
    let public_key_instruction_index    = &data[8..=9];      // Bytes 8,9
    let message_data_offset             = &data[10..=11];    // Bytes 10,11
    let message_data_size               = &data[12..=13];    // Bytes 12,13
    let message_instruction_index       = &data[14..=15];    // Bytes 14,15

    let data_pubkey                     = &data[16..16+32];  // Bytes 16..16+32
    let data_sig                        = &data[48..48+64];  // Bytes 48..48+64
    let data_msg                        = &data[112..];      // Bytes 112..end

    // Expected values

    let exp_public_key_offset:      u16 = 16; // 2*u8 + 7*u16
    let exp_signature_offset:       u16 = exp_public_key_offset + pubkey.len() as u16;
    let exp_message_data_offset:    u16 = exp_signature_offset + sig.len() as u16;
    let exp_num_signatures:          u8 = 1;
    let exp_message_data_size:      u16 = msg.len().try_into().unwrap();

    // Header and Arg Checks

    msg!("check header");

    // Header
    if  num_signatures                  != &exp_num_signatures.to_le_bytes()        ||
        padding                         != &[0]                                     ||
        signature_offset                != &exp_signature_offset.to_le_bytes()      ||
        signature_instruction_index     != &u16::MAX.to_le_bytes()                  ||
        public_key_offset               != &exp_public_key_offset.to_le_bytes()     ||
        public_key_instruction_index    != &u16::MAX.to_le_bytes()                  ||
        message_data_offset             != &exp_message_data_offset.to_le_bytes()   ||
        message_data_size               != &exp_message_data_size.to_le_bytes()     ||
        message_instruction_index       != &u16::MAX.to_le_bytes()  
    {   
        return Err(CandyError::SigVerificationFailed.into());
    }

    msg!("data_pubkey{:?}",data_pubkey);
    msg!("pubkey{:?}",pubkey);
    msg!("data_msg{:?}",data_msg);
    msg!("msg{:?}",msg);
    msg!("data_sig{:?}",data_sig);
    msg!("sig{:?}",sig);
    // Arguments
    if  data_pubkey != pubkey   ||
        data_msg    != msg      ||
        data_sig    != sig
    {
        return Err(CandyError::SigVerificationFailed.into());
    }

    Ok(())
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
    pub signer:Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct ClaimRecord {
    is_claimed:bool,
}


#[derive(Accounts)]
pub struct InitPhase<'info> {
    #[account(
        init_if_needed,
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


// #[instruction(phase_id:u64,nft_id: u64)]
// #[instruction(phase_id:u64)]
#[derive(Accounts)]
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
        // seeds = ["mint".as_bytes(),phase_id.to_le_bytes().as_ref(), nft_id.to_le_bytes().as_ref()], 
        seeds = ["mint".as_bytes(),phase.phase_id.to_le_bytes().as_ref(), phase.current_nft_id.to_le_bytes().as_ref()], 
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

    /// CHECK: The address check is needed because otherwise
    /// the supplied Sysvar could be anything else.
    /// The Instruction Sysvar has not been implemented
    /// in the Anchor framework yet, so this is the safe approach.
    #[account(address = IX_ID)]
    pub ix_sysvar: AccountInfo<'info>, 

    /// CHECK:
    #[account(
        mut,
        seeds = [
            b"vault".as_ref()
        ],
        bump,
    )]
    pub contract_vault: UncheckedAccount<'info>
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + ClaimRecord::INIT_SPACE,
        seeds = [&mint.key().to_bytes()],
        bump,
    )]
    pub claim_record:Account<'info,ClaimRecord>,

    pub system_program: Program<'info, System>,

    /// CHECK: The address check is needed because otherwise
    /// the supplied Sysvar could be anything else.
    /// The Instruction Sysvar has not been implemented
    /// in the Anchor framework yet, so this is the safe approach.
    #[account(address = IX_ID)]
    pub ix_sysvar: AccountInfo<'info>, 

    
    #[account(mut)]
    pub mint: Account<'info,Mint>, 

    #[account(
        constraint = token_account.mint == mint.key() // Check that the Token Account's mint matches the passed mint
    )]
    pub token_account: Account<'info, TokenAccount>,

    /// CHECK:
    #[account(
        mut,
        seeds = [
            b"vault".as_ref()
        ],
        bump,
    )]
    pub contract_vault: UncheckedAccount<'info>
}



#[error_code]
pub enum CandyError {
    #[msg("Maximum supply limit reached!")]
    MaxSupplyLimit,
    #[msg("Nft id Mismatch")]
    NftIdMismatch,
    #[msg("Phase id Mismatch")]
    PhaseIdMismatch,
    #[msg("Signature expired")]
    SignatureExpired,
    #[msg("Invalid signature")]
    SigVerificationFailed,
    #[msg("Invalid pubkey str")]
    ParsePubkeyError,
    #[msg("You have already claimed")]
    DuplicatedClaimError,
    #[msg("Invalid owner")]
    InvalidOwnerError,
    #[msg("Only owner")]
    OnlyOwner
}


