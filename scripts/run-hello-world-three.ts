import { ethers } from "hardhat";
import hre from "hardhat";

const { PRIVATE_KEY = "", HELLO_WORLD_Three_ADDRESS = "" } = process.env;

const contract = require("../artifacts/contracts/HelloWorldThree.sol/HelloWorldThree.json");
const provider = hre.ethers.provider;
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const helloWorldThreeContract = new ethers.Contract(
  HELLO_WORLD_Three_ADDRESS,
  contract.abi,
  signer
);

async function main() {
  const message = await helloWorldThreeContract.helloWorld();
  console.log(`The message is ${message}`);

  const tx = await helloWorldThreeContract.setText(
    `Hi again and again subsequent ${Math.random()}`
  );
  await tx.wait();

  const nextMessage = await helloWorldThreeContract.helloWorld();
  console.log(`The new message is ${nextMessage}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
