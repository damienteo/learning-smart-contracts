import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";

require("dotenv").config();

const {
  STAGING_QUICKNODE_KEY,
  INFURA_API,
  LINEA_GOERLI_RPC_URL,
  MUMBAI_POLYGON_RPC_URL,
  PRIVATE_KEY,
  ETHERSCAN_API,
  POLYGONSCAN_API,
  SNOWTRACE_API,
} = process.env;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  // defaultNetwork: "goerli",
  networks: {
    goerli: {
      url: STAGING_QUICKNODE_KEY,
      accounts: [PRIVATE_KEY || ""],
    },
    mumbai: {
      url: MUMBAI_POLYGON_RPC_URL,
      accounts: [PRIVATE_KEY || ""],
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [PRIVATE_KEY || ""],
    },
    sepolia: {
      url: "https://rpc.sepolia.org",
      accounts: [PRIVATE_KEY || ""],
    },
    linea: {
      url: LINEA_GOERLI_RPC_URL,
      accounts: [PRIVATE_KEY || ""],
    },
  },
  etherscan: {
    apiKey: {
      goerli: ETHERSCAN_API || "",
      sepolia: ETHERSCAN_API || "",
      polygonMumbai: POLYGONSCAN_API || "",
      avalancheFujiTestnet: SNOWTRACE_API || "",
    },
  },
  paths: { tests: "tests" },
  gasReporter: {
    enabled: true,
  },
};

export default config;
