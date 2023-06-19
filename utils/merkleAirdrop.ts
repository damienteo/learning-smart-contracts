import { ethers } from "hardhat";
import keccak256 from "keccak256";
import MerkleTree from "merkletreejs";

export type IAirDropDetails = {
  decimals: number;
  airdrop: Record<string, number>;
};

export const generateLeaf = (address: string, value: string): Buffer => {
  return Buffer.from(
    ethers.utils
      .solidityKeccak256(["address", "uint256"], [address, value])
      .slice(2),
    "hex"
  );
};

export const getParsedValue = (amount: number, decimals: number) => {
  return ethers.utils.parseUnits(amount.toString(), decimals).toString();
};

export const generateMerkleTree = (details: IAirDropDetails): MerkleTree => {
  return new MerkleTree(
    Object.entries(details.airdrop).map(([address, amount]) => {
      return generateLeaf(
        ethers.utils.getAddress(address),
        getParsedValue(amount, details.decimals)
      );
    }),
    keccak256,
    { sortPairs: true }
  );
};

export const multiplyBigNumbers = (a: number, b: number) => {
  return BigInt(a) * BigInt(b);
};

export const divideBigNumbers = (a: number, b: number) => {
  return BigInt(a) / BigInt(b);
};

export const getMerkleProof = (
  address: string,
  value: number,
  details: IAirDropDetails
): string[] => {
  const nextAddress = ethers.utils.getAddress(address);
  const nextValue = getParsedValue(value, details.decimals);

  const leaf: Buffer = generateLeaf(nextAddress, nextValue);
  const tree = generateMerkleTree(details);

  return tree.getHexProof(leaf);
};
