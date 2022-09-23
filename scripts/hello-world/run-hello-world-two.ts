import { ethers } from "hardhat";
import hre from "hardhat";

const { PRIVATE_KEY = "", HELLO_WORLD_TWO_ADDRESS = "" } = process.env;

const contract = require("../../artifacts/contracts/HelloWorld/HelloWorldTwo.sol/HelloWorldTwo.json");
const provider = hre.ethers.provider;
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const helloWorldTwoContract = new ethers.Contract(
  HELLO_WORLD_TWO_ADDRESS,
  contract.abi,
  signer
);

async function main() {
  const message = await helloWorldTwoContract.helloWorld();
  console.log(`The message is ${message}`);

  const tx = await helloWorldTwoContract.setText(
    `Hi again and again subsequent ${Math.random()}`
  );
  await tx.wait();

  const nextMessage = await helloWorldTwoContract.helloWorld();
  console.log(`The new message is ${nextMessage}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
