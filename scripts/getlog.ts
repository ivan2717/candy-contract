const anchor = require('@coral-xyz/anchor');
import { Program } from "@coral-xyz/anchor";
import Redis from 'ioredis';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { CandyNftFactory } from "../target/types/candy_nft_factory";
const redis = new Redis( {
    db: 7
})

async function filterProgramLogs(programPublicKey: PublicKey) {
  const connection = new Connection("https://solana-devnet.g.alchemy.com/v2/cJkK2SdqwYHK-8eElur2mNY1zbuN5do4", 'confirmed');

  console.log(`Fetching signatures for program ID: ${programPublicKey.toBase58()}`);
  let beforeSignature: string | undefined = await redis.get('beforeSignature');
  let untilSignature: string | undefined = await redis.get('untilSignature');
  let signatures;
  let mintlog;

  do {
      // Fetch transaction signatures associated with the program
      signatures = await connection.getSignaturesForAddress(programPublicKey, {
        before: beforeSignature,
        limit: 2, // Adjust the number of signatures as needed
      });

      if (signatures.length === 0) {
          break
      }
      console.log(`Found ${signatures.length} signatures. Fetching logs...`);

      for (const signatureInfo of signatures) {
        const signature = signatureInfo.signature;
        if (!untilSignature) {
            untilSignature = signature
            await redis.set("untilSignature", untilSignature)
        }
        const txDetails = await connection.getTransaction(signature, { commitment: 'confirmed' });

        if (txDetails && txDetails.meta) {
          const logs = txDetails.meta.logMessages;

          if (logs) {
            console.log(`Logs for transaction: ${signature}`);
            logs.forEach((log) => {
                if (log.includes("Minting NFT with details")) {
                    mintlog = true
                }
                if (mintlog){

                  const payerMatch = log.match(/Payer: (\w+)/);
                  const tokenIdMatch = log.match(/Token ID: (\d+)/);
                  const paymentAmountMatch = log.match(/Payment Amount: (\d+)/);

                  if (payerMatch) {
                    console.log('Payer:', payerMatch[1]);
                  }
                  if (tokenIdMatch) {
                    console.log('Token ID:', tokenIdMatch[1]);
                  }
                  if (paymentAmountMatch) {
                    console.log('Payment Amount:', paymentAmountMatch[1]);
                    mintlog = false
                  }
                }
            });
          }
        } else {
          console.log(`No logs found for transaction: ${signature}`);
        }
        let beforeSlot = await redis.get("beforeSlot")
        if (beforeSlot < signatureInfo.slot) {
            await redis.set("beforeSignature", signature)
            await redis.set("beforeSlot", signatureInfo.slot)
        }
      }

      beforeSignature = signatures[signatures.length - 1].signature;

  } while (signatures.length > 0)
}

const candyNftFactory = anchor.workspace.CandyNftFactory as Program<CandyNftFactory>
// Replace with your program ID
const programId = candyNftFactory.programId

filterProgramLogs(programId).catch((err) => {
  console.error('Error fetching logs:', err);
});
