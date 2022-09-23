import { ethers } from "hardhat";
import hre from "hardhat";

const { PRIVATE_KEY = "", HELLO_WORLD_FOUR_ADDRESS = "" } = process.env;

const contract = require("../../artifacts/contracts/HelloWorld/HelloWorldFour.sol/HelloWorldFour.json");
const provider = hre.ethers.provider;
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const helloWorldFourContract = new ethers.Contract(
  HELLO_WORLD_FOUR_ADDRESS,
  contract.abi,
  signer
);

async function main() {
  const message = await helloWorldFourContract.helloWorld();
  console.log(`The message is ${message}`);

  // Set text
  const tx = await helloWorldFourContract.setText(
    `Hi again and again subsequent ${Math.random()}`
  );
  await tx.wait();
  const nextMessage = await helloWorldFourContract.helloWorld();
  console.log(`The new message is ${nextMessage}`);

  // Restore
  const restoreTx = await helloWorldFourContract.restore();
  await restoreTx.wait();
  const restoreMessage = await helloWorldFourContract.helloWorld();
  console.log(`The restored message is ${restoreMessage}`);

  // Set text again
  const nextTx = await helloWorldFourContract.setText(
    `Hi again and again subsequent ${Math.random()}`
  );
  await nextTx.wait();
  const subsequentMessage = await helloWorldFourContract.helloWorld();
  console.log(`The second message is ${subsequentMessage}`);
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
