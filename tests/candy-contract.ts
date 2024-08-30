import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CandyNftFactory } from "../target/types/candy_nft_factory";
import dotenv from "dotenv";
import { PublicKey, SystemProgram } from "@solana/web3.js";
dotenv.config();

describe("candy-contract", () => {
  // Configure the client to use the local cluster.
  // anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env(); 
  anchor.setProvider(provider);

  // anchor.getProvider().

  it("Is initialized!", async () => {
    // Add your test here.
    // const tx = await program.methods.initialize().rpc();
    // console.log("Your transaction signature", tx);

    const candyNftFactory = anchor.workspace.CandyNftFactory as Program<CandyNftFactory>
    console.log("======",candyNftFactory.programId)

    const phaseId = new anchor.BN(0); 

    const [phasePda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("phase"), phaseId.toArrayLike(Buffer, "be", 8)], // seeds
      candyNftFactory.programId
    );

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
  });
});



