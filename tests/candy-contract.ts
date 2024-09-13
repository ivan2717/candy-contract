import * as ed from "@noble/ed25519";
import * as anchor from '@coral-xyz/anchor';
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
// const ed  = require("@noble/ed25519")
import { CandyNftFactory } from "../target/types/candy_nft_factory"; // Ensure the path is correct for your project
import 'dotenv/config'
import { Metadata, Metaplex } from "@metaplex-foundation/js";
import { min } from "bn.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

  // const provider = anchor.AnchorProvider.local();

  console.log("rpc======",  process.env.ANCHOR_PROVIDER_URL)
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

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
    .initPhase(name,symbol,baseUri,maxSupply)
    .accounts({
      // phase: phasePda,
      authority: authority,
      // systemProgram: SystemProgram.programId,
    })
    .signers([])
    .rpc()

    console.log("Transaction signature:", tx);
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
  const lamports = new anchor.BN(1000000000)
  // const time =Math.floor(Date.now()/1000) + 60 * 5 // 过期时间5分钟
  const time = 1728718561
  console.log("expireAt: ",time)
  const expireAt = new anchor.BN(time)
  // const expireAt = Math.floor(Date.now()/1000) + 60 * 60
  const msg = Uint8Array.from([...provider.wallet.publicKey.toBuffer(),...lamports.toBuffer("le",8),...expireAt.toBuffer("le",8)])
  console.log("=====msg====",msg)
  const secretKey = Uint8Array.from([100,205,108,196,120,101,128,100,161,22,234,238,168,3,158,161,161,186,131,135,185,33,43,90,27,122,101,130,16,182,12,129,151,81,110,147,30,22,255,161,199,207,128,60,115,4,106,222,159,118,12,159,73,249,129,57,214,143,115,219,210,118,170,236])
  const keyPair = Keypair.fromSecretKey(secretKey)
  const signature = await ed.sign(msg,keyPair.secretKey.slice(0,32))

  console.log("pubkey",provider.wallet.publicKey.toBuffer())
  console.log("pubkey",provider.wallet.publicKey.toBase58())
  console.log("message",msg)
  console.log("signature",signature)

  // return 

  // const tx = await candyNftFactory.methods
  //   // .mintNft(phaseId,nftId)
  //   .mintNft(provider.wallet.publicKey,lamports,expireAt,Array.from(signature))
  //   .accounts({
  //     authority: provider.wallet.publicKey,
  //     payer: provider.wallet.publicKey,
  //     // metadataProgram: TOKEN_METADATA_PROGRAM_ID,
  //     phase: phasePda,
  //   })
  //   .signers([])
  //   .rpc();
  let tx = new anchor.web3.Transaction()
  .add(
      // Ed25519 instruction
      anchor.web3.Ed25519Program.createInstructionWithPublicKey({
          publicKey: provider.wallet.publicKey.toBuffer(),
          message: msg,
          signature: signature,
      })
  )
  .add(
      // Our instruction
      await candyNftFactory.methods
    // .mintNft(phaseId,nftId)
    .mintNft(lamports,expireAt,Array.from(signature))
    // .mintNft(expireAt,Buffer.from(msg),Array.from(signature))
    // .mintNft(provider.wallet.publicKey,lamports,expireAt,Buffer.from(msg),Array.from(signature))
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
  console.log("xxxxxb",tx)
  tx.sign(keyPair)
  console.log("xxxxxa",tx)
  const hash = await provider.connection.sendRawTransaction(tx.serialize())
  
  console.log("hash=====>",hash)
}


const claim= async () => {


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

  const rewards = new anchor.BN(10000)
  const mint = new PublicKey(userNFTs[0]["mintAddress"])

  const msg = Uint8Array.from([...provider.wallet.publicKey.toBuffer(),...mint.toBuffer() ,...rewards.toBuffer("le",8)])
  console.log("=====msg====",msg)
  const secretKey = Uint8Array.from([100,205,108,196,120,101,128,100,161,22,234,238,168,3,158,161,161,186,131,135,185,33,43,90,27,122,101,130,16,182,12,129,151,81,110,147,30,22,255,161,199,207,128,60,115,4,106,222,159,118,12,159,73,249,129,57,214,143,115,219,210,118,170,236])
  const keyPair = Keypair.fromSecretKey(secretKey)
  const signature = await ed.sign(msg,keyPair.secretKey.slice(0,32))

  const tokenAccount = await getAssociatedTokenAddress(mint,provider.publicKey)
  console.log("tokenAccount====",tokenAccount.toBase58())
  let tx = new anchor.web3.Transaction()
  .add(
      // Ed25519 instruction
      anchor.web3.Ed25519Program.createInstructionWithPublicKey({
          publicKey: provider.wallet.publicKey.toBuffer(),
          message: msg,
          signature: signature,
      })
  )
  .add(
      // Our instruction
      await candyNftFactory.methods
    .claim(rewards,Array.from(signature))

    .accounts({
      payer: provider.wallet.publicKey,
      mint,
      tokenAccount
    })
    .signers([])
    .instruction()
  );
  const { lastValidBlockHeight, blockhash } =
  await provider.connection.getLatestBlockhash();
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.recentBlockhash = blockhash;
  tx.feePayer = provider.wallet.publicKey;
  tx.sign(keyPair)

  const hash = await provider.connection.sendRawTransaction(tx.serialize())
  
  console.log("hash=====>",hash)
}




// init()
// mintNFT()
claim()


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
