import { ethers } from "hardhat";

const convertStringArrayToBytes32 = (array: string[]) =>
  array.map((element) => ethers.utils.formatBytes32String(element));

export default convertStringArrayToBytes32;
