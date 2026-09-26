import {
  isAddress,
  type Abi,
  type Account,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient,
} from "viem";
import { readFoundryArtifact } from "./foundry.js";

const localCroquis = readFoundryArtifact("LocalCroquis", "LocalCroquis");

/**
 * ENSv2's own contracts, then everything under croquis.eth and the escrow, as the deploy script
 * builds them. `relayer` signs claims and names people and stickers.
 */
export async function deployCroquisStack({
  publicClient,
  walletClient,
  account,
  chain,
  sticker,
  relayer,
  gatewaySigner,
}: {
  publicClient: PublicClient<Transport, Chain>;
  walletClient: WalletClient<Transport, Chain>;
  account: Account;
  chain: Chain;
  sticker: Address;
  relayer: Address;
  gatewaySigner: Address;
}) {
  const deploy = async (sourceName: string, contractName: string, args: unknown[]) => {
    const { abi, bytecode } = readFoundryArtifact(sourceName, contractName);
    return deployed(abi, bytecode, args);
  };
  const deployed = async (abi: Abi, bytecode: Hex, args: unknown[]) => {
    const hash = await walletClient.deployContract({ abi, bytecode, args, account, chain });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (!receipt.contractAddress) throw new Error("A local ENS deployment returned no address");
    return receipt.contractAddress;
  };
  const read = async (functionName: "escrow" | "names" | "resolver", address: Address) => {
    const value = await publicClient.readContract({ address, abi: localCroquis.abi, functionName });
    if (typeof value !== "string" || !isAddress(value)) {
      throw new Error(`LocalCroquis.${functionName} returned no address`);
    }
    return value;
  };

  const labelStore = await deploy("LabelStore", "LabelStore", [
    "0x0000000000000000000000000000000000000000",
  ]);
  const factory = await deploy("VerifiableFactory", "VerifiableFactory", []);
  const registryImplementation = await deploy("UserRegistry", "UserRegistry", [
    labelStore,
    account.address,
  ]);
  const resolverImplementation = await deploy("PermissionedResolver", "PermissionedResolver", [
    account.address,
  ]);
  const stack = await deployed(localCroquis.abi, localCroquis.bytecode, [
    factory,
    registryImplementation,
    resolverImplementation,
    sticker,
    relayer,
    gatewaySigner,
  ]);
  return {
    escrow: await read("escrow", stack),
    names: await read("names", stack),
    resolver: await read("resolver", stack),
  };
}
