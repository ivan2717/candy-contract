import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.CandyNftFactory as anchor.Program;
const payer = provider.wallet.publicKey;

const network = 'devnet'; // Choose 'mainnet-beta', 'testnet', or 'devnet'
const connection = new Connection(clusterApiUrl(network), 'confirmed');

const programId = program.programId;

async function listenForLogs() {
  console.log(`Listening for logs on program ${programId.toBase58()}...`);

  // Subscribe to program logs
  const subscriptionId = connection.onLogs(programId, (log) => {
    if (log.err) {
      console.error("Error in transaction:", log.err);
      return;
    }

    const { result } = log;
    if (result) {
      console.log("Transaction logs:", result.value.logs);
      
      // Parse logs to extract Payer, TokenId, and Payment Amount
      result.value.logs.forEach(logLine => {
        if (logLine.includes('Minting NFT with details:')) {
          const payerMatch = logLine.match(/Payer: (\w+)/);
          const tokenIdMatch = logLine.match(/Token ID: (\d+)/);
          const paymentAmountMatch = logLine.match(/Payment Amount: (\d+)/);

          if (payerMatch) {
            console.log('Payer:', payerMatch[1]);
          }
          if (tokenIdMatch) {
            console.log('Token ID:', tokenIdMatch[1]);
          }
          if (paymentAmountMatch) {
            console.log('Payment Amount:', paymentAmountMatch[1]);
          }
        }
      });
    }
  }, 'jsonParsed');

  // Optional: Stop listening after some time
  setTimeout(() => {
    connection.removeOnLogs(subscriptionId);
    console.log('Stopped listening for logs.');
  }, 60000); // Stop after 1 minute
}

async function run() {
  // Call init_nft method to trigger logs
  try {
    await listenForLogs();
  } catch (err) {
    console.error("Error minting NFT:", err);
  }
}

run().catch(console.error);
