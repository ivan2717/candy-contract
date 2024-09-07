const anchor = require('@coral-xyz/anchor');
const { SystemProgram } = anchor.web3;
import { CandyNftFactory } from "../target/types/candy_nft_factory";
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

// 加载 IDL 和合约地址
const idl = require('../target/idl/candy_nft_factory.json'); 
/*
const programId = new anchor.web3.PublicKey('7sivPuNctFv6j32a1TniBZjtLfx5qaDZAuURjgkZoBDi'); 

// 初始化程序
const program = new anchor.Program(idl, programId, provider);
*/

async function main() {

    const candyNftFactory = anchor.workspace.CandyNftFactory as Program<CandyNftFactory>
      console.log(candyNftFactory.programId)
    const [phasePda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("phase")], // seeds
      candyNftFactory.programId
    );
    console.log("phasePda======",phasePda)


    const authority = provider.wallet.publicKey;
    console.log(authority)
    const nftId = new anchor.BN(10)
    const tx = await candyNftFactory.methods
      .mintNft(nftId)
      .accounts({
        authority: authority,
        payer: authority,
        phase:phasePda
      })
      .signers([])
      .rpc()
  console.log("Transaction signature", tx);

    /*
  const connection = new Connection('https://solana-devnet.g.alchemy.com/v2/cJkK2SdqwYHK-8eElur2mNY1zbuN5do4', 'confirmed');

  const accountInfo = await connection.getAccountInfo(phasePda,'confirmed')
  console.log("accountInfo",Buffer.from(accountInfo.data))

  console.log("accountInfo",accountInfo.data.toString('utf8'))

  const a = await candyNftFactory.account.phase.fetch(phasePda)
  console.log("a",a)
  */
}

// 运行主函数
main().catch(err => {
  console.error(err);
});
