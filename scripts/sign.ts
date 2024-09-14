import * as ed from "@noble/ed25519";
import * as anchor from '@coral-xyz/anchor';
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { hexStringToUint8Array, uint8ArrayToHexString } from "./lib"

const idl = require('../target/idl/candy_nft_factory.json'); 

const provider = anchor.AnchorProvider.env()
const lamports = new anchor.BN(1000000000)

async function main() {

  // const time =Math.floor(Date.now()/1000) + 86400 * 30 // 过期时间5分钟
  const time = 1728718561
  console.log("expireAt: ",time)
  const expireAt = new anchor.BN(time)
    console.log(provider.wallet.publicKey)
    console.log("user",provider.wallet.publicKey.toBase58())
  const msg = Uint8Array.from([...provider.wallet.publicKey.toBuffer(),...lamports.toBuffer("le",8),...expireAt.toBuffer("le",8)])
  console.log("=====msg====",msg)
  const pk = '64cd6cc478658064a116eaeea8039ea1a1ba8387b9212b5a1b7a658210b60c8197516e931e16ffa1c7cf803c73046ade9f760c9f49f98139d68f73dbd276aaec'
  const secretKey = hexStringToUint8Array(pk)
  const keyPair = Keypair.fromSecretKey(secretKey)
  const signature = await ed.sign(msg,keyPair.secretKey.slice(0,32))
  console.log("signature", uint8ArrayToHexString(signature))

  const secretKey1 = Uint8Array.from([100,205,108,196,120,101,128,100,161,22,234,238,168,3,158,161,161,186,131,135,185,33,43,90,27,122,101,130,16,182,12,129,151,81,110,147,30,22,255,161,199,207,128,60,115,4,106,222,159,118,12,159,73,249,129,57,214,143,115,219,210,118,170,236])

  const keyPair1 = Keypair.fromSecretKey(secretKey)
  const signature1 = await ed.sign(msg,keyPair.secretKey.slice(0,32))
  console.log("signature", uint8ArrayToHexString(signature1))

}

main().catch(err => {
  console.error(err);
});
