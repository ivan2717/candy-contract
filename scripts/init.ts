const anchor = require('@coral-xyz/anchor');
const { SystemProgram } = anchor.web3;
import { CandyNftFactory } from "../target/types/candy_nft_factory";
import { Program } from "@coral-xyz/anchor";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const idl = require('../target/idl/candy_nft_factory.json'); 
/*
const programId = new anchor.web3.PublicKey('7sivPuNctFv6j32a1TniBZjtLfx5qaDZAuURjgkZoBDi'); 

// 初始化程序
const program = new anchor.Program(idl, programId, provider);
*/

async function main() {

    const candyNftFactory = anchor.workspace.CandyNftFactory as Program<CandyNftFactory>
    const name = "My NFT Collection"; // String 参数
    const symbol = "MNFT";            // String 参数
    const baseUri = "https://example.com/metadata/"; // String 参数
    const maxSupply = new anchor.BN(1000);     
    const authority = provider.wallet.publicKey;
     console.log(authority)

    const tx = await candyNftFactory.methods
      .initPhase(name,symbol,baseUri,maxSupply)
      .accounts({
        // phase: phasePda,
        authority: authority,
        // systemProgram: SystemProgram.programId,
      })
      .signers([])
      .rpc()
  console.log("Transaction signature", tx);

}

// 运行主函数
main().catch(err => {
  console.error(err);
});
