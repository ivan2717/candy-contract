
const anchor = require('@coral-xyz/anchor');
import { CandyNftFactory } from "../target/types/candy_nft_factory";
import { Program } from "@coral-xyz/anchor";
import * as ed from "@noble/ed25519";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { Connection, } from "@solana/web3.js";
import {  hexStringToUint8Array, uint8ArrayToHexString } from "./lib"
import { getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { Metadata, Metaplex } from "@metaplex-foundation/js";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const candyNftFactory = anchor.workspace.CandyNftFactory as Program<CandyNftFactory>
getUserNFTs(candyNftFactory.programId,1,provider.wallet.publicKey)



function numberToBuffer(num: number): Buffer {
  const phaseIdBytes = Buffer.alloc(8); // 64-bit, 8 bytes
  phaseIdBytes.writeBigUInt64BE(BigInt(num)); 
  // phaseIdBytes.writeBigUInt64LE(BigInt(num))
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

  console.log("collectionPda: ",collectionPda)
 console.log(nfts)
  const userNFTs = nfts.filter((nft)=>{
    if(nft?.collection?.address){
      return nft?.collection?.address.toBase58() === collectionPda.toBase58()
    }
    return false

  })

  console.log("userNFTs",userNFTs)

  return userNFTs
}
