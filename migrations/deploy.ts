// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

// const anchor = require("@coral-xyz/anchor");
import anchor from "@coral-xyz/anchor"
import * as fs from "fs"



module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  // Add your deploy script here.

  const idl = JSON.parse(fs.readFileSync("../target/idl/candy_contract.json","utf8"))
  const pg = new anchor.Program(idl)
  await pg.methods.initialize().rpc()
  
};
