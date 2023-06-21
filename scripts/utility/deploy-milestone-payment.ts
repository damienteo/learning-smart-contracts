import { ethers } from "hardhat";
import MerkleTree from "merkletreejs";

import verify from "../verify-contract";

import { generateMerkleTree } from "../../utils/merkleAirdrop";

const amounts = {
  1: 10000,
  2: 20000,
  3: 30000,
};
const treasuryAmt = ethers.utils.parseEther("10000");
const PERIOD = 12;

const TEST_USD_CONTRACT_ADDRESS = "0x96a2C26142715633cd3C0a343fd8B7Fdfb17Cd3a";
const OWNER_ADDRESS = "0x5Cb289b2604120022A6C6A188B14b1c74365289A";

async function deployMilestonePaymentAgreement() {
  const TestUSDContract = await ethers.getContractAt(
    "TestUSD",
    TEST_USD_CONTRACT_ADDRESS
  );
  const decimals = await TestUSDContract.decimals();

  const paymentDetails = {
    decimals,
    airdrop: {
      [OWNER_ADDRESS]: amounts[1],
      "0x863592E345ca6b414043a091Ad526e0767Cce151": amounts[2],
      "0x8F187b0B55d09a5d9f669392517a7117c2800dcd": amounts[3],
    },
  };

  const merkleTree = generateMerkleTree(paymentDetails);
  const merkleRoot = merkleTree.getHexRoot();

  //================================================================================
  // Deploy Contract
  //================================================================================

  console.log("Deploying...");

  // Initializer

  const MilestonePaymentsInitializableFactory = await ethers.getContractFactory(
    "MilestonePaymentsInitializable"
  );
  const MilestonePaymentsInitializableContract =
    await MilestonePaymentsInitializableFactory.deploy();

  await MilestonePaymentsInitializableContract.deployTransaction.wait(5);

  console.log(
    `Initializer Contract deployed to ${MilestonePaymentsInitializableContract.address}`
  );

  // Factory
  const MilestonePaymentsProxyFactoryFactory = await ethers.getContractFactory(
    "MilestonePaymentsProxyFactory"
  );
  const MilestonePaymentsProxyFactoryContract =
    await MilestonePaymentsProxyFactoryFactory.deploy(
      MilestonePaymentsInitializableContract.address
    );

  await MilestonePaymentsProxyFactoryContract.deployTransaction.wait(5);
  console.log(
    `Factory Contract deployed to ${MilestonePaymentsProxyFactoryContract.address}`
  );

  // Create New Agreement
  const CreateTxn =
    await MilestonePaymentsProxyFactoryContract.createNewAgreement(
      merkleRoot,
      TEST_USD_CONTRACT_ADDRESS,
      PERIOD,
      OWNER_ADDRESS
    );
  await CreateTxn.wait(5);

  const cloneAddress = await MilestonePaymentsProxyFactoryContract.allClones(0);
  const MilestonePaymentsCloneContract = await ethers.getContractAt(
    "MilestonePaymentsInitializable",
    cloneAddress
  );
  console.log(
    `Agreement deployed to ${MilestonePaymentsCloneContract.address}`
  );

  await TestUSDContract.mint(
    MilestonePaymentsCloneContract.address,
    treasuryAmt
  );

  // AGREEMENT

  //================================================================================
  // Verify Contract
  //================================================================================

  await verify(
    MilestonePaymentsInitializableContract.address,
    [],
    ethers.provider.network.chainId
  );
  await verify(
    MilestonePaymentsProxyFactoryContract.address,
    [MilestonePaymentsInitializableContract.address],
    ethers.provider.network.chainId
  );
  await verify(
    MilestonePaymentsCloneContract.address,
    [merkleRoot, TEST_USD_CONTRACT_ADDRESS, PERIOD, OWNER_ADDRESS],
    ethers.provider.network.chainId
  );
}

deployMilestonePaymentAgreement()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
