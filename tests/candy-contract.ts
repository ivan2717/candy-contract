import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CandyNftFactory } from "../target/types/candy_nft_factory";
import dotenv from "dotenv";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
dotenv.config();

describe("candy-contract", () => {
  // Configure the client to use the local cluster.
  // anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env(); 
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
        authority: authority,
        payer: authority,
        phase:phasePda
      })
      .signers([])
      .rpc()

      console.log("Transaction signature:", tx);



// 创建一个连接到 Solana 主网的实例
  const connection = new Connection('https://solana-devnet.g.alchemy.com/v2/cJkK2SdqwYHK-8eElur2mNY1zbuN5do4', 'confirmed');

  const accountInfo = await connection.getAccountInfo(phasePda,'confirmed')
  console.log("accountInfo",Buffer.from(accountInfo.data))

  console.log("accountInfo",accountInfo.data.toString('utf8'))

  const a = await candyNftFactory.account.phase.fetch(phasePda)
  console.log("a",a)

  });
});


function numberToBuffer(num: number): Buffer {
  const phaseIdBytes = Buffer.alloc(8); // 64-bit, 8 bytes
  phaseIdBytes.writeBigUInt64BE(BigInt(num)); 
  return phaseIdBytes
}





