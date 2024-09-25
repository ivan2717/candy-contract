const anchor = require('@coral-xyz/anchor');
import { CandyNftFactory } from "../target/types/candy_nft_factory";
import { Program } from "@coral-xyz/anchor";
import * as ed from "@noble/ed25519";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { Connection, } from "@solana/web3.js";
import { numberToBuffer, hexStringToUint8Array, uint8ArrayToHexString } from "./lib"
import { getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { Metadata, Metaplex } from "@metaplex-foundation/js";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const secretKey = Uint8Array.from([100,205,108,196,120,101,128,100,161,22,234,238,168,3,158,161,161,186,131,135,185,33,43,90,27,122,101,130,16,182,12,129,151,81,110,147,30,22,255,161,199,207,128,60,115,4,106,222,159,118,12,159,73,249,129,57,214,143,115,219,210,118,170,236] )
const keyPair = Keypair.fromSecretKey(secretKey)

async function main() {

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
    return

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

main().catch(err => {
  console.error(err);
});

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
      /*
    if(nft?.collection?.address){
      return nft?.collection?.address.toBase58() === collectionPda.toBase58()
    }
    return false
    */
      return true

  })

  return userNFTs
}

