import * as anchor from '@coral-xyz/anchor';
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import { CandyNftFactory } from "../target/types/candy_nft_factory"; // Ensure the path is correct for your project

describe("candy_nft_factory", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);


  // it("Is initialized!", async () => {

  //   const candyNftFactory = anchor.workspace.CandyNftFactory as Program<CandyNftFactory>
  //   console.log("======",candyNftFactory.programId)

  //   const phaseId = new anchor.BN(0); 

  //   const [phasePda, bump] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("phase")], // seeds
  //     candyNftFactory.programId
  //   );

  //   console.log("phasePda======",phasePda)

  //   const name = "My NFT Collection"; // String 参数
  //   const symbol = "MNFT";            // String 参数
  //   const baseUri = "https://example.com/metadata/"; // String 参数
  //   const maxSupply = new anchor.BN(1000);     
  //   const authority = provider.wallet.publicKey;
  //   const tx = await candyNftFactory.methods
  //     .initPhase(name,symbol,baseUri,maxSupply)
  //     .accounts({
  //       // phase: phasePda,
  //       authority: authority,
  //       // systemProgram: SystemProgram.programId,
  //     })
  //     .signers([])
  //     .rpc()

  //     console.log("Transaction signature:", tx);
  // });

  it("Mint NFT", async () => {
    const nftId = new anchor.BN(0);
    const tokenAccount = await anchor.utils.token.associatedAddress({
      mint: mint.publicKey,
      owner: provider.wallet.publicKey,
    });

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
    const tx = await candyNftFactory.methods
      .mintNft(phaseId,nftId)
      .accounts({
        authority: provider.wallet.publicKey,
        payer: provider.wallet.publicKey,
        metadataProgram: TOKEN_METADATA_PROGRAM_ID,
        phase: phasePda,
      })
      .signers([])
      .rpc();

    // Validate the NFT mint by fetching the mint account
    const mintAccount = await program.provider.connection.getParsedAccountInfo(mint.publicKey);
    assert.ok(mintAccount.value !== null);
  });
});


function numberToBuffer(num: number): Buffer {
  const phaseIdBytes = Buffer.alloc(8); // 64-bit, 8 bytes
  phaseIdBytes.writeBigUInt64BE(BigInt(num)); 
  return phaseIdBytes
}
