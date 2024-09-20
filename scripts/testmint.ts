import { CandyNftFactory } from "../target/types/candy_nft_factory";
import { Program } from "@coral-xyz/anchor";
import * as ed from "@noble/ed25519";
import { BN }  from 'bn.js';
import * as anchor from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram, ComputeBudgetProgram } from "@solana/web3.js";
import { Connection, } from "@solana/web3.js";
import { numberToBuffer, hexStringToUint8Array, uint8ArrayToHexString } from "./lib"

//import * as idl from "..target/idl/candy_nft_factory.json";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);


async function main() {

  //      const program = new anchor.Program(idl as anchor.Idl)
        const program = anchor.workspace.CandyNftFactory as Program<CandyNftFactory>
        console.log("programId----",program.programId)

        const lamports = new BN(0.01 * 1e9)
        const expireAt = new BN(1728718561)
        const [phasePda, bump] = PublicKey.findProgramAddressSync(
            [Buffer.from("phase")], // seeds
            program.programId,
          );
        console.log("phasepda", phasePda)
        const authority = new PublicKey("C2fGPcPFnhJHqHZLMvkaMfGkcPWmuWH5e2z4xX3BmchE")
        const user = authority
        console.log("user", authority, lamports, expireAt)
        const msg = hexStringToUint8Array("000094357700000000578ee16600000000")
        const signature = hexStringToUint8Array("e89cce788ef90c79bdf246afe37ebf900058215ad6bdbcca009123f240403ffb0f872f7d2153bfceff64ff383aeee9ec8cbe0aa88793dc809e54c431bb9fab0d")

        //   const lamports = new anchor.BN(sigData.data.price)
        //   const expireAt = new anchor.BN(sigData.data.expireAt)
    
          const tx = new anchor.web3.Transaction()
        /*
          const ix0 =   SystemProgram.transfer({
                fromPubkey: user,
                toPubkey: user,
                lamports: lamports,
          })
        tx.add(ix0)
        */
        const account = {
            authority,
            payer: user,
            phase: phasePda

        }
          tx.add(
            ComputeBudgetProgram.setComputeUnitLimit({
              units: 500_000,
            }),
            anchor.web3.Ed25519Program.createInstructionWithPublicKey({
              // publicKey: authority.toBuffer(), 
              publicKey:new PublicKey("BBgai5MfC5s6z944bXTxFK9FpzR5uLkLBpFBhBgPB6LT").toBuffer(),
            //   message: hexStringToUint8Array(sigData.data.msg), // Replace with actual message
                message:msg,
            //   signature: hexStringToUint8Array(sigData.data.signature) // Replace with actual signature
                signature
            })
          )

          let ix3 = await program.methods.mintNft(lamports, expireAt, Array.from(signature)).accounts(account).signers([]).instruction()
          console.log("user")


          const connection = new Connection("https://solana-devnet.g.alchemy.com/v2/cJkK2SdqwYHK-8eElur2mNY1zbuN5do4")
          const { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash();
          tx.lastValidBlockHeight = lastValidBlockHeight;
          tx.recentBlockhash = blockhash;
          tx.feePayer = user;
        console.log("tx", tx)
}

main().catch(err => {
  console.error(err);
});
