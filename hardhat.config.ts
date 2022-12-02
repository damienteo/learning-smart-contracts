import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

require("dotenv").config();

const {
  STAGING_QUICKNODE_KEY,
  INFURA_API,
  PRIVATE_KEY,
  ETHERSCAN_API,
  POLYGONSCAN_API,
  SNOWTRACE_API,
} = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  // defaultNetwork: "goerli",
  networks: {
    goerli: {
      url: STAGING_QUICKNODE_KEY,
      accounts: [PRIVATE_KEY || ""],
    },
    mumbai: {
      url: "https://matic-mumbai.chainstacklabs.com/",
      accounts: [PRIVATE_KEY || ""],
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [PRIVATE_KEY || ""],
    },
  },
  etherscan: {
    apiKey: {
      goerli: ETHERSCAN_API || "",
      polygonMumbai: POLYGONSCAN_API || "",
      avalancheFujiTestnet: SNOWTRACE_API || "",
    },
  },
  paths: { tests: "tests" },
};

export default config;
