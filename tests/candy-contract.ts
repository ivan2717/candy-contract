import * as ed from "@noble/ed25519";
import * as anchor from '@coral-xyz/anchor';
import { Program } from "@coral-xyz/anchor";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { assert, use } from "chai";
// const ed  = require("@noble/ed25519")
import { CandyNftFactory } from "../target/types/candy_nft_factory"; // Ensure the path is correct for your project
import 'dotenv/config'
import { Metadata, Metaplex } from "@metaplex-foundation/js";
import { min } from "bn.js";
import { AuthorityType, createSetAuthorityInstruction, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { createMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  UpdateMetadataAccountV2InstructionData,
  DataV2,
} from '@metaplex-foundation/mpl-token-metadata';

  // const provider = anchor.AnchorProvider.local();

  console.log("rpc======",  process.env.ANCHOR_PROVIDER_URL)
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const secretKey = Uint8Array.from([100,205,108,196,120,101,128,100,161,22,234,238,168,3,158,161,161,186,131,135,185,33,43,90,27,122,101,130,16,182,12,129,151,81,110,147,30,22,255,161,199,207,128,60,115,4,106,222,159,118,12,159,73,249,129,57,214,143,115,219,210,118,170,236] )
  const keyPair = Keypair.fromSecretKey(secretKey)

  console.log("keyPair===========",keyPair.publicKey.toBase58())

const init = async () => {

  const candyNftFactory = anchor.workspace.CandyNftFactory as Program<CandyNftFactory>
  console.log("======",candyNftFactory.programId)

  const phaseId = new anchor.BN(0); 

  const [phasePda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("phase")], // seeds
    candyNftFactory.programId
  );

  console.log("phasePda======",phasePda)

  const name = "My NFT Collection"; // String 参数
  const symbol = "MNFT";            // String 参数
  const baseUri = "https://example.com/metadata/"; // String 参数
  const maxSupply = new anchor.BN(1000);     
  const authority = provider.wallet.publicKey;
  const tx = await candyNftFactory.methods
    .initPhase(name,symbol,maxSupply)
    .accounts({
      // phase: phasePda,
      authority: authority,
      // systemProgram: SystemProgram.programId,
    })
    .signers([])
    .rpc()

    console.log("Transaction signature:", tx);
}

const initFund = async ()=>{
  const usdtMint = "5gCDxsFnGJZw5k9cu5A4EhzfzCBpGgqnVt3ZBhEng7Bh"
  const candyNftFactory = anchor.workspace.CandyNftFactory as Program<CandyNftFactory>
  const [fund_holder,bump] = PublicKey.findProgramAddressSync([Buffer.from("fund_holder")],candyNftFactory.programId)
  console.log("fund_holder",fund_holder.toBase58())
  const ata = await getOrCreateAssociatedTokenAccount(provider.connection,keyPair,new PublicKey(usdtMint),fund_holder,true)
  console.log("ata: ",ata)
}

const mintNFT = async () => {


  const candyNftFactory = anchor.workspace.CandyNftFactory as Program<CandyNftFactory>
  console.log("programId======",candyNftFactory.programId)

  // const phaseId = new anchor.BN(0); 

  const [phasePda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("phase")], // seeds
    candyNftFactory.programId
  );
  console.log("phasePda======",phasePda)

  const [collectionPda, bump1] = PublicKey.findProgramAddressSync(
    [Buffer.from("collection"),numberToBuffer(1)], // seeds
    candyNftFactory.programId
  );
  console.log("collectionPda======",collectionPda)


  const authority = provider.wallet.publicKey;
  const phaseId = new anchor.BN(1)
  const nftId = new anchor.BN(1)
  const classs = 1
  const lamports = new anchor.BN(1000000000)
  // const time =Math.floor(Date.now()/1000) + 60 * 5 // 过期时间5分钟
  const time = 1728718561
  console.log("expireAt: ",time)
  const expireAt = new anchor.BN(time)
  // const expireAt = Math.floor(Date.now()/1000) + 60 * 60
  console.log("user",provider.wallet.publicKey.toBase58())
  const uri = "https://cdn.pixabay.com/photo/2023/12/22/12/30/trees-8463651_1280.png"
  const msg = Uint8Array.from([...provider.wallet.publicKey.toBuffer(),...new anchor.BN(classs).toBuffer(),...lamports.toBuffer("le",8),...expireAt.toBuffer("le",8), ...Buffer.from(uri, 'utf-8')])
  console.log("=====msg====",msg)
  const secretKey = Uint8Array.from([100,205,108,196,120,101,128,100,161,22,234,238,168,3,158,161,161,186,131,135,185,33,43,90,27,122,101,130,16,182,12,129,151,81,110,147,30,22,255,161,199,207,128,60,115,4,106,222,159,118,12,159,73,249,129,57,214,143,115,219,210,118,170,236])

  const keyPair = Keypair.fromSecretKey(secretKey)
  const signature = await ed.sign(msg,keyPair.secretKey.slice(0,32))

  console.log("pubkey",provider.wallet.publicKey.toBuffer())
  console.log("pubkey",provider.wallet.publicKey.toBase58())
  console.log("message",msg)
  console.log("signature",signature)

  let tx = new anchor.web3.Transaction()

  .add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 500_000,
    }),
      // Ed25519 instruction
      anchor.web3.Ed25519Program.createInstructionWithPublicKey({
          publicKey: new PublicKey("BBgai5MfC5s6z944bXTxFK9FpzR5uLkLBpFBhBgPB6LT").toBuffer(),
          // publicKey: provider.wallet.publicKey.toBuffer(),
          message: msg,
          signature: signature,
      })
  )
  .add(
      await candyNftFactory.methods
    .mintNft(classs,lamports,expireAt,uri,Array.from(signature))
    .accounts({
      authority: provider.wallet.publicKey,
      payer: provider.wallet.publicKey,
      // metadataProgram: TOKEN_METADATA_PROGRAM_ID,
      phase: phasePda,
    })
    .signers([])
    .instruction()
  );
  const { lastValidBlockHeight, blockhash } =
  await provider.connection.getLatestBlockhash();
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.recentBlockhash = blockhash;
  tx.feePayer = provider.wallet.publicKey;
  console.log("xxxxxb",tx.instructions.length)
  // tx.sign(keyPair)
  const signedTx = await provider.wallet.signTransaction(tx)
  console.log("provider.wallet: ",provider.wallet.publicKey.toBase58())
  console.log("xxxxxa",tx.instructions.length)

  const hash = await provider.connection.sendRawTransaction(signedTx.serialize())
  
  console.log("hash=====>",hash)
}


const claim = async () => {


  const candyNftFactory = anchor.workspace.CandyNftFactory as Program<CandyNftFactory>
  console.log("programId======",candyNftFactory.programId)

  // const phaseId = new anchor.BN(0); 

  const [phasePda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("phase")], // seeds
    candyNftFactory.programId
  );
  console.log("phasePda======",phasePda)

  const [collectionPda, bump1] = PublicKey.findProgramAddressSync(
    [Buffer.from("collection"),numberToBuffer(1)], // seeds
    candyNftFactory.programId
  );
  const phaseId = 1
  console.log("collectionPda======",collectionPda)

  const userNFTs = await getUserNFTs(candyNftFactory.programId,phaseId,provider.publicKey)
  

  console.log("NFT=========",userNFTs[0])
  console.log("mint========",userNFTs[0]["mintAddress"])
  // return

  // const rewards = new anchor.BN(10000)
  const mint = new PublicKey(userNFTs[0]["mintAddress"])

  // const msg = Uint8Array.from([...provider.wallet.publicKey.toBuffer(),...mint.toBuffer() ,...rewards.toBuffer("le",8)])
  // console.log("=====msg====",msg)

  // const signature = await ed.sign(msg,keyPair.secretKey.slice(0,32))

  const tokenAccount = await getAssociatedTokenAddress(mint,provider.publicKey)  //user NFT token account
  console.log("tokenAccount====",tokenAccount.toBase58())

  const [contractVault,contractVaultBump] = PublicKey.findProgramAddressSync([Buffer.from("vault")],candyNftFactory.programId)
  const [fundHolder,fundHolderBump] = PublicKey.findProgramAddressSync([Buffer.from("fund_holder")],candyNftFactory.programId)
  const usdtMint = new PublicKey("5gCDxsFnGJZw5k9cu5A4EhzfzCBpGgqnVt3ZBhEng7Bh")
  const fundHolderUsdtAta = await getOrCreateAssociatedTokenAccount(provider.connection,keyPair,usdtMint,fundHolder,true)
  const user = provider.wallet.publicKey
  console.log("user: ",user.toBase58())
  const userUsdtAta = await getOrCreateAssociatedTokenAccount(provider.connection,keyPair,usdtMint,user)

  const rewards = [{fromAta:contractVault,amount:new anchor.BN(10000)},{fromAta:fundHolderUsdtAta.address,amount:new anchor.BN(1000)}]
  // const msg = Uint8Array.from([...provider.wallet.publicKey.toBuffer(),...mint.toBuffer() ,...rewards.toBuffer("le",8)])

  let rewardString = "{"
  rewards.map((reward)=>{
    rewardString = rewardString+ "from_ata: " + reward.fromAta +", amount: " + reward.amount.toNumber()+"}, {"
  })

  rewardString = rewardString.slice(0,rewardString.length-3).trim()

  console.log("rewardString:  ",rewardString)

  const msg = Uint8Array.from([...provider.wallet.publicKey.toBuffer(),...mint.toBuffer() ,...Buffer.from(rewardString)])
  const signature = await ed.sign(msg,keyPair.secretKey.slice(0,32))

  console.log("contractVault",contractVault)
  console.log("fundHolder",fundHolder)
  console.log("fundHolderUsdtAta",fundHolderUsdtAta.address)
  console.log("user",user)
  console.log("userUsdtAta",userUsdtAta.address)

  let tx = new anchor.web3.Transaction()
  .add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 500_000,
    }),
      // Ed25519 instruction
      anchor.web3.Ed25519Program.createInstructionWithPublicKey({
          publicKey: new PublicKey("BBgai5MfC5s6z944bXTxFK9FpzR5uLkLBpFBhBgPB6LT").toBuffer(),
          message: msg,
          signature: signature,
      })
  )
  .add(
      // Our instruction
      await candyNftFactory.methods
    // .claim(rewards,Array.from(signature))

    .claim(rewards,Array.from(signature))
    .accounts({
      payer: provider.wallet.publicKey,
      mint,
      tokenAccount,
  
      
    })
    .remainingAccounts([
      {
        pubkey:contractVault,
        isSigner:false,
        isWritable:true
      },
      {
        pubkey:user,
        isSigner:false,
        isWritable:true
      },
      {
        pubkey:fundHolderUsdtAta.address,
        isSigner:false,
        isWritable:true
      },
      {
        pubkey:userUsdtAta.address,
        isSigner:false,
        isWritable:true
      },
    ])
    .signers([])
    .instruction()
  );
  const { lastValidBlockHeight, blockhash } =
  await provider.connection.getLatestBlockhash();
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.recentBlockhash = blockhash;
  tx.feePayer = provider.wallet.publicKey;
  // tx.sign(keyPair)
  
  const signedTx = await provider.wallet.signTransaction(tx)

  console.log("=============260")


    const hash = await provider.connection.sendRawTransaction(signedTx.serialize())
    console.log("hash=====>",hash)



}


const issuseToken = async ()=>{

  // const secretKey = Uint8Array.from([230, 109, 50, 211, 175, 46, 93, 251, 3, 61, 145, 143, 249, 157, 49, 108, 76, 88, 183, 91, 128, 24, 243, 220, 59, 253, 3, 90, 199, 182, 196, 140, 127, 169, 53, 83, 83, 137, 243, 116, 227, 171, 199, 158, 192, 2, 196, 206, 59, 87, 63, 33, 121, 189, 78, 66, 252, 27, 76, 123, 75, 100, 175, 108]  )
  const secretKey = Uint8Array.from([100,205,108,196,120,101,128,100,161,22,234,238,168,3,158,161,161,186,131,135,185,33,43,90,27,122,101,130,16,182,12,129,151,81,110,147,30,22,255,161,199,207,128,60,115,4,106,222,159,118,12,159,73,249,129,57,214,143,115,219,210,118,170,236])
  const keyPair = Keypair.fromSecretKey(secretKey)
  // const mint = await createMint(
  //   connection,      // Solana 连接对象
  //   payer,           // 支付 SOL 的账户
  //   payer.publicKey, // 初始 mint 权限
  //   null,            // 冻结权限（null 代表不设置冻结）
  //   9,               // Decimals 小数点位数（这里是 9）
  //   TOKEN_PROGRAM_ID // Token Program ID（固定值）
  // );

  console.log("kp: ",keyPair.publicKey.toBase58())
  console.log("pk: ",provider.wallet.publicKey.toBase58())

  const mint = await createMint(
    provider.connection,
    keyPair,
    provider.wallet.publicKey,
    null,
    9,
  )
  // return 
  console.log(`Token mint: ${mint.toBase58()}`);
  // const ata = await getOrCreateAssociatedTokenAccount(provider.connection,keyPair,new PublicKey("5gCDxsFnGJZw5k9cu5A4EhzfzCBpGgqnVt3ZBhEng7Bh"),keyPair.publicKey)
  // console.log(`ata: ${ata.address}`);


  // const tx = await mintTo(provider.connection,keyPair,new PublicKey("5gCDxsFnGJZw5k9cu5A4EhzfzCBpGgqnVt3ZBhEng7Bh"),new PublicKey("EkNraY2uFaXqGfFFnPcE7CxrMMZMcscQth66g3aXGFgs"),keyPair,100000000 * 1e9)
  // console.log(`tx: ${tx}`);
  
}




// init()
// initFund()
mintNFT()
// claim()

// issuseToken()

const transaction = new Transaction();

// 创建设置权限的指令
// const setAuthorityIx = createSetAuthorityInstruction(
//     new PublicKey("2CLSQsWTXYcDVFAiR8w69ADShRL8qoYHFZ1TFeAhNAWF"),
//     new PublicKey("BBgai5MfC5s6z944bXTxFK9FpzR5uLkLBpFBhBgPB6LT"),
//     null, // 将 update authority 设置为 null
//     AuthorityType.
// );



function numberToBuffer(num: number): Buffer {
  const phaseIdBytes = Buffer.alloc(8); // 64-bit, 8 bytes
  phaseIdBytes.writeBigUInt64BE(BigInt(num)); 
  return phaseIdBytes
}

async function getUserNFTs(programId:PublicKey,phaseId:number,user:PublicKey) {
  const tokenAccounts = await provider.connection.getParsedTokenAccountsByOwner(user,{programId:new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")})
  const nftAccounts = tokenAccounts.value.filter(
    (account) => account.account.data.parsed.info.tokenAmount.uiAmount === 1
    );
  const mintList:Array<PublicKey> = []
  nftAccounts.map(async (account) => {
    mintList.push(new PublicKey(account.account.data.parsed.info.mint))
  });

  const mx = Metaplex.make(provider.connection)
  const nfts = await mx.nfts().findAllByMintList({
    mints:mintList
  })

  const phaseIdBytes = Buffer.alloc(8); // 64-bit, 8 bytes
  phaseIdBytes.writeBigUInt64BE(BigInt(phaseId)); 
  const [collectionPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("collection"),phaseIdBytes], // seeds
    programId
  );

  const userNFTs = nfts.filter((nft)=>{
    if(nft?.collection?.address){
      return nft?.collection?.address.toBase58() === collectionPda.toBase58()
    }
    return false

  })

  return userNFTs
}

