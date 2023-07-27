import { run } from "hardhat";

const network: Record<number, string> = {
  80001: "polygon_mumbai",
  137: "polygon",
  11155111: "sepolia",
};

const verify = async (
  contractAddress: string,
  args: any[],
  chainId?: number
) => {
  console.log("Verifying contract...");

  if (!chainId || !network[chainId]) {
    console.log("Invalid ChainId");
    return;
  }

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
      network: network[chainId],
    });
  } catch (e) {
    console.log(e);
  }
};
export default verify;
