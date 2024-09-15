const anchor = require('@coral-xyz/anchor');
import { CandyNftFactory } from "../target/types/candy_nft_factory";
import { Program } from "@coral-xyz/anchor";
import * as ed from "@noble/ed25519";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { Connection, } from "@solana/web3.js";
import { numberToBuffer, hexStringToUint8Array, uint8ArrayToHexString } from "./lib"

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

// 加载 IDL 和合约地址
//const idl = require('../target/idl/candy_nft_factory.json'); 
/*
const programId = new anchor.web3.PublicKey('7sivPuNctFv6j32a1TniBZjtLfx5qaDZAuURjgkZoBDi'); 

// 初始化程序
const program = new anchor.Program(idl, programId, provider);
*/

async function main() {

    const candyNftFactory = anchor.workspace.CandyNftFactory as Program<CandyNftFactory>
        console.log("programId",candyNftFactory.programId)

  const [phasePda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("phase")], // seeds
    candyNftFactory.programId
  );
  console.log("phasePda======",phasePda)

  const phaseData = await candyNftFactory.account.phase.fetch(phasePda)
  console.log("phaseData", phaseData)

  const [collectionPda, bump1] = PublicKey.findProgramAddressSync(
    [Buffer.from("collection"),numberToBuffer(1)], // seeds
    candyNftFactory.programId
  );
  console.log("collectionPda======",collectionPda)


  const authority = provider.wallet.publicKey;
  const phaseId = new anchor.BN(1)
  const nftId = new anchor.BN(2)
  const lamports = new anchor.BN(1000000)
  const time =Math.floor(Date.now()/1000) + 60 * 5 // 过期时间5分钟
  console.log("expireAt: ",time)
  const expireAt = new anchor.BN(time)
  // const expireAt = Math.floor(Date.now()/1000) + 60 * 60
  const msg = Uint8Array.from([...provider.wallet.publicKey.toBuffer(),...lamports.toBuffer("le",8),...expireAt.toBuffer("le",8)])
  console.log("=====msg====",msg)
  const secretKey = Uint8Array.from([100,205,108,196,120,101,128,100,161,22,234,238,168,3,158,161,161,186,131,135,185,33,43,90,27,122,101,130,16,182,12,129,151,81,110,147,30,22,255,161,199,207,128,60,115,4,106,222,159,118,12,159,73,249,129,57,214,143,115,219,210,118,170,236])
  const keyPair = Keypair.fromSecretKey(secretKey)
  const addr = keyPair.publicKey.toBase58()
    console.log("addr", addr)
  const signature = await ed.sign(msg,keyPair.secretKey.slice(0,32))
    console.log("sig",Array.from(signature))
  
  let msg1 = hexStringToUint8Array("000094357700000000578ee16600000000")
  let sig1 = await ed.sign(msg1, keyPair.secretKey.slice(0, 32))
    console.log("sig1",uint8ArrayToHexString(sig1))


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
          publicKey: new PublicKey("BBgai5MfC5s6z944bXTxFK9FpzR5uLkLBpFBhBgPB6LT").toBuffer(),
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

  const signedTx = await provider.wallet.signTransaction(tx)

  const hash = await provider.connection.sendRawTransaction(tx.serialize())
  
  console.log("hash=====>",hash)
}

// 运行主函数
main().catch(err => {
  console.error(err);
});
