import { ethers } from "hardhat";
import hre from "hardhat";

const { PRIVATE_KEY = "", HELLO_WORLD_ADDRESS = "" } = process.env;

const contract = require("../artifacts/contracts/HelloWorld.sol/HelloWorld.json");
const provider = hre.ethers.provider;
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const helloWorldContract = new ethers.Contract(
  HELLO_WORLD_ADDRESS,
  contract.abi,
  signer
);

async function main() {
  const message = await helloWorldContract.message();
  console.log(`The message is ${message}`);

  const tx = await helloWorldContract.update(
    `Hi again and again ${Math.random()}`
  );
  await tx.wait();

  const nextMessage = await helloWorldContract.message();
  console.log(`The new message is ${nextMessage}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
