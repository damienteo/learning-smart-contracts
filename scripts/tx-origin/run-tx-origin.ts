import { ethers } from "hardhat";
import hre from "hardhat";

const {
  PRIVATE_KEY = "",
  TX_ORIGIN_VICTIM_ADDRESS = "",
  TX_ORIGIN_ATTACK_ADDRESS = "",
} = process.env;

const victimJson = require("../../artifacts/contracts/TxOrigin/TxOriginVictim.sol/TxOriginVictim.json");
const txOriginAttackJson = require("../../artifacts/contracts/TxOrigin/TxOriginAttack.sol/TxOriginAttack.json");

const provider = hre.ethers.provider;
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const txOriginVictimContract = new ethers.Contract(
  TX_ORIGIN_VICTIM_ADDRESS,
  victimJson.abi,
  signer
);

const txOriginAttackContract = new ethers.Contract(
  TX_ORIGIN_ATTACK_ADDRESS,
  txOriginAttackJson.abi,
  signer
);

async function main() {
  let message = await txOriginVictimContract.getBalance();
  console.log(`The original contract balance is ${message}`);

  // Ensure there is value in original contract
  const [owner] = await ethers.getSigners();
  const funding = await owner.sendTransaction({
    to: TX_ORIGIN_ATTACK_ADDRESS,
    value: ethers.utils.parseEther("0.000000000000000100"),
    gasLimit: 500000,
  });
  await funding.wait();

  message = await txOriginVictimContract.getBalance();
  console.log(`The new contract balance is ${message}`);

  // Send value from victim to attack contract
  const tx = await txOriginVictimContract.transferTo(
    TX_ORIGIN_ATTACK_ADDRESS,
    1
  );
  await tx.wait();

  message = await txOriginVictimContract.getBalance();
  console.log(`Victim balance after is ${message}`);
}

main()
  .then(() => console.log("success"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
