import { ethers } from "hardhat";
import hre from "hardhat";

const {
  PRIVATE_KEY = "",
  HELLO_WORLD_FIVE_ADDRESS = "",
  GREETING_READER_ADDRESS = "",
  NOT_HELLO_WORLD_ADDRESS = "",
} = process.env;

const helloWorldFiveJson = require("../../artifacts/contracts/Greeter/HelloWorldFive.sol/HelloWorldFive.json");
const greetingReaderJson = require("../../artifacts/contracts/Greeter/GreetingReader.sol/GreetingReader.json");
const notHelloWorldJson = require("../../artifacts/contracts/Greeter/NotHelloWorld.sol/NotHelloWorld.json");
const provider = hre.ethers.provider;
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const helloWorldFiveContract = new ethers.Contract(
  HELLO_WORLD_FIVE_ADDRESS,
  helloWorldFiveJson.abi,
  signer
);

const greetingReaderContract = new ethers.Contract(
  GREETING_READER_ADDRESS,
  greetingReaderJson.abi,
  signer
);

const notHelloWorldContract = new ethers.Contract(
  NOT_HELLO_WORLD_ADDRESS,
  notHelloWorldJson.abi,
  signer
);

async function main() {
  const message = await helloWorldFiveContract.helloWorld();
  console.log(`The HelloWorldFive contract message is ${message}`);

  const readMessage = await greetingReaderContract.read(
    HELLO_WORLD_FIVE_ADDRESS
  );
  console.log(
    `The read message from GreetingReader contract is ${readMessage}`
  );

  // Set text from Greeting Reader
  const nextTx = await greetingReaderContract.setText(
    HELLO_WORLD_FIVE_ADDRESS,
    `Hello from Greeting Reader`
  );
  await nextTx.wait();
  const subsequentMessage = await helloWorldFiveContract.helloWorld();
  console.log(`The text set by Greeting Reader is ${subsequentMessage}`);

  // Restore HelloWorld
  const restoreTx = await helloWorldFiveContract.restore();
  await restoreTx.wait();
  const restoreMessage = await helloWorldFiveContract.helloWorld();
  console.log(`The restored message in HelloWorld is ${restoreMessage}`);

  // NOT HELLO WORLD

  const notHelloWorldMsg = await notHelloWorldContract.helloWorld();
  console.log(`The NotHelloWorld contract message is ${notHelloWorldMsg}`);

  const nextReadMessage = await greetingReaderContract.read(
    NOT_HELLO_WORLD_ADDRESS
  );
  console.log(
    `The read message from GreetingReader contract is ${nextReadMessage}`
  );

  // Set text from Greeting Reader
  const nextNHWMsg = await greetingReaderContract.setText(
    NOT_HELLO_WORLD_ADDRESS,
    `Hello from Greeting Reader`
  );
  await nextNHWMsg.wait();
  const nextSetNHWMsg = await notHelloWorldContract.helloWorld();
  console.log(`The text set by Greeting Reader is ${nextSetNHWMsg}`);

  // Restore NotHelloWorld
  let restoreNHWTx = await notHelloWorldContract.restore();
  await restoreNHWTx.wait();
  let restoredNHWMessage = await notHelloWorldContract.helloWorld();
  console.log(`The restored message in NotHelloWorld is ${restoredNHWMessage}`);

  // Pay NotHelloWorld
  const [owner] = await ethers.getSigners();
  // receive function: it only triggers when the calldata is empty
  // receive function -> trigger on [CONTRACT].call(<value>) and not on [CONTRACT].<functionSelector>(<value>).
  // fallback function -> trigger on any mismatched function selectors, and it can be payable to react to receiving eth sent together with those calls.
  await owner.sendTransaction({
    to: NOT_HELLO_WORLD_ADDRESS,
    value: ethers.utils.parseEther("0.000000000000000001"),
  });

  const nHWMsgAfterPaid = await notHelloWorldContract.helloWorld();
  console.log(
    `The message after payment in notHelloWorld is ${nHWMsgAfterPaid}`
  );

  // Restore NotHelloWorld
  restoreNHWTx = await notHelloWorldContract.restore();
  await restoreNHWTx.wait();
  restoredNHWMessage = await notHelloWorldContract.helloWorld();
  console.log(`The restored message in HelloWorld is ${restoredNHWMessage}`);
}

main()
  .then(() => console.log("success"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
