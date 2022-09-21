import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

require("dotenv").config();

const { STAGING_QUICKNODE_KEY, PRIVATE_KEY } = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  defaultNetwork: "goerli",
  networks: {
    goerli: {
      url: STAGING_QUICKNODE_KEY,
      accounts: [PRIVATE_KEY || ""],
    },
  },
};

export default config;
