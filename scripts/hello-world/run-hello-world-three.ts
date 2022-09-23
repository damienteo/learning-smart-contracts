import { ethers } from "hardhat";
import hre from "hardhat";

const { PRIVATE_KEY = "", HELLO_WORLD_THREE_ADDRESS = "" } = process.env;

const contract = require("../../artifacts/contracts/HelloWorld/HelloWorldThree.sol/HelloWorldThree.json");
const provider = hre.ethers.provider;
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const helloWorldThreeContract = new ethers.Contract(
  HELLO_WORLD_THREE_ADDRESS,
  contract.abi,
  signer
);

async function main() {
  const message = await helloWorldThreeContract.helloWorld();
  console.log(`The message is ${message}`);

  // Set text
  const tx = await helloWorldThreeContract.setText(
    `Hi again and again subsequent ${Math.random()}`
  );
  await tx.wait();
  const nextMessage = await helloWorldThreeContract.helloWorld();
  console.log(`The new message is ${nextMessage}`);

  // Restore
  const restoreTx = await helloWorldThreeContract.restore();
  await restoreTx.wait();
  const restoreMessage = await helloWorldThreeContract.helloWorld();
  console.log(`The new message is ${restoreMessage}`);

  // Set text again
  const nextTx = await helloWorldThreeContract.setText(
    `Hi again and again subsequent ${Math.random()}`
  );
  await nextTx.wait();
  const subsequentMessage = await helloWorldThreeContract.helloWorld();
  console.log(`The new message is ${subsequentMessage}`);
}

(async () => {
  while (true) {
    await main()
      .then(() => console.log("success"))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
})();
