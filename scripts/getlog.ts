const anchor = require('@coral-xyz/anchor');
import * as dotenv from 'dotenv';
import { Program } from "@coral-xyz/anchor";
import Redis from 'ioredis';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { CandyNftFactory } from "../target/types/candy_nft_factory";

dotenv.config()

const redis = new Redis( {
    db: 7
})

interface ApiResponse {
  code: number;
  message: string;
  data: any;
}

const API = process.env.CANDY_API
const ADMIN_TOKEN = process.env.CANDY_ADMIN_TOKEN

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function postData(uri: string, data: any): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API}/${uri}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'adminToken': ADMIN_TOKEN
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json() as ApiResponse;
    console.log(`${uri} ${result}`, result);
    return result
  } catch (error) {
    console.error(`${uri} ${error}`);
    return {
        code: 500,
        message: "internal error",
        data: {}
    }
  }
}

async function getData(uri: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API}/${uri}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json() as ApiResponse;
    console.log(`${uri} ${result}`, result);
    return result
  } catch (error) {
    console.error(`${uri} ${error}`);
    return {
        code: 500,
        message: "internal error",
        data: {}
    }
  }
}

async function filterProgramLogs(programPublicKey: PublicKey) {
  const connection = new Connection("https://solana-devnet.g.alchemy.com/v2/cJkK2SdqwYHK-8eElur2mNY1zbuN5do4", 'confirmed');
  const deployedAt = '5Pg41SjAtD6sK3ysTFGbyP4Ge6g6V7McoL3nHGFdoCHghrezexjz13ioFAYm9CWiHTJ3SybpgUQpECHW3A4KyaG5'

  console.log(`Fetching signatures for program ID: ${programPublicKey.toBase58()}`);
  let beforeSignature: string | undefined;
  let untilSignature: string| undefined = await redis.get("untilSignature");
  let beforeSlot: string | 0;
  let startAtSlot: string | 0;
  let signatures;
  let mintlog;
  let signature0: string | undefined;
  let payer: string;
  let tokenId: string;
  
  if (!untilSignature) {
      await redis.set("untilSignature", deployedAt)
  }

  do {
      beforeSignature = await redis.get('beforeSignature');
      untilSignature  = await redis.get('untilSignature');
      beforeSlot = await redis.get("beforeSlot")
      startAtSlot = await redis.get("startAtSlot")
      signature0 = await redis.get("signature0")

      // Fetch transaction signatures associated with the program
      connection.getConfirmedSignaturesForAddress2
      signatures = await connection.getSignaturesForAddress(programPublicKey, {
        before: beforeSignature,
        limit: 3, // Adjust the number of signatures as needed
      });

      if (signatures.length === 0) {
          break
      }
      console.log(`Found ${signatures.length} signatures. Fetching logs...`);

      for (const signatureInfo of signatures) {
        const signature = signatureInfo.signature;


        if (!signature0) {
            signature0 = signature
            await redis.set("signature0", signature0)
        }

        const txDetails = await connection.getTransaction(signature, { commitment: 'confirmed' });

        if (txDetails && txDetails.meta) {
          const logs = txDetails.meta.logMessages;

          if (logs) {
            console.log(`Logs for transaction: ${signature} ${signatureInfo.slot}`);
            for (let idx in logs) {
                let log = logs[idx]
                if (log.includes("Minting NFT with details")) {
                    mintlog = true
                }
                if (mintlog){

                  const payerMatch = log.match(/Payer: (\w+)/);
                  const tokenIdMatch = log.match(/Token ID: (\d+)/);
                  const mintAddress = log.match(/Mint Address: (\w+)/);

                  if (payerMatch) {
                    payer = payerMatch[1];
                  }
                  if (tokenIdMatch) {
                    tokenId = tokenIdMatch[1];
                      console.log("tokenId", tokenId)
                  }
                  if (mintAddress) {
                    console.log('Mint Address:', mintAddress[1]);
                    let data = await getData(`user/${payer}`)
                    if (data.code != 200) {
                        await postData(`user/new`, {"address": payer, "score": 0})
                    }
                    data = await getData(`user/${payer}`)
                    if (data.code != 200) {
                        console.log(`Failed to get user info ${payer}`)
                        throw `Failed to get user info ${payer}`
                    }
                    await postData("user/nft", {"tokenId": tokenId, "userId": data.data.id, "txId": signature, "nftId": 1, "mint": mintAddress[1]})
                    mintlog = false
                  }
                }
            }
          }
        } else {
          console.log(`No logs found for transaction: ${signature}`);
        }
        if (!beforeSlot || Number(beforeSlot) > Number(signatureInfo.slot)) {
            beforeSignature = signature
            await redis.set("beforeSignature", signature)
            await redis.set("beforeSlot", signatureInfo.slot)
        }

        if (signature == untilSignature) {
            await redis.set("untilSignature", signature0)
            await redis.del("beforeSignature")
            await redis.del("beforeSlot")
            await redis.del("signature0")
            signature0 = undefined
            await sleep(5000)
            break
        }
      }


  } while (signatures.length > 0)
}

const candyNftFactory = anchor.workspace.CandyNftFactory as Program<CandyNftFactory>
// Replace with your program ID
const programId = candyNftFactory.programId

filterProgramLogs(programId).catch((err) => {
  console.error('Error fetching logs:', err);
});
