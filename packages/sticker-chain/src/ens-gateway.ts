import {
  concatHex,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  hexToBytes,
  keccak256,
  numberToHex,
  parseAbi,
  toHex,
  type Address,
  type Hex,
  type LocalAccount,
  zeroAddress,
} from "viem";
import { packetToBytes } from "viem/ens";

/**
 * The CCIP-Read (EIP-3668) gateway's half of CroquisResolver: it answers `resolve(name, data)` for
 * people whose name isn't onchain yet, and signs the answer the way `resolveWithProof` checks it.
 */

const resolveAbi = parseAbi(["function resolve(bytes name, bytes data) view returns (bytes)"]);
const profileAbi = parseAbi([
  "function addr(bytes32 node) view returns (address)",
  "function addr(bytes32 node, uint256 coinType) view returns (bytes)",
  "function text(bytes32 node, string key) view returns (string)",
  "function multicall(bytes[] calls) view returns (bytes[])",
]);

const COIN_TYPE_ETH = 60n;

/** What the gateway knows about a name. Anything missing answers empty, as ENS clients expect. */
export interface GatewayRecords {
  address?: Address;
  texts: Record<string, string>;
}

/** DNS-encoded name bytes as dotted text. */
export function dnsToText(name: Hex): string {
  const bytes = hexToBytes(name);
  const labels: string[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    const length = bytes[offset] ?? 0;
    if (length === 0) break;
    labels.push(new TextDecoder().decode(bytes.subarray(offset + 1, offset + 1 + length)));
    offset += 1 + length;
  }
  return labels.join(".");
}

/** The name a gateway request asks about, as dotted text. */
export function requestedName(request: Hex): string {
  const { args } = decodeFunctionData({ abi: resolveAbi, data: request });
  return dnsToText(args[0]);
}

function answerCall(call: Hex, records: GatewayRecords): Hex {
  const decoded = decodeFunctionData({ abi: profileAbi, data: call });
  if (decoded.functionName === "multicall") {
    const results = decoded.args[0].map((inner) => answerCall(inner, records));
    return encodeAbiParameters([{ type: "bytes[]" }], [results]);
  }
  if (decoded.functionName === "text") {
    const value = records.texts[decoded.args[1]] ?? "";
    return encodeAbiParameters([{ type: "string" }], [value]);
  }
  if (decoded.functionName === "addr" && decoded.args.length === 2) {
    const bytes = decoded.args[1] === COIN_TYPE_ETH && records.address ? records.address : "0x";
    return encodeAbiParameters([{ type: "bytes" }], [bytes]);
  }
  if (decoded.functionName === "addr") {
    return encodeAbiParameters([{ type: "address" }], [records.address ?? zeroAddress]);
  }
  throw new Error(`The gateway doesn't answer ${call.slice(0, 10)}`);
}

/** The result bytes `resolve(name, data)` returns for `request`, from `records`. */
export function answerGatewayRequest(request: Hex, records: GatewayRecords): Hex {
  const { args } = decodeFunctionData({ abi: resolveAbi, data: request });
  return answerCall(args[1], records);
}

/** CroquisResolver.gatewayDigest: EIP-191 version 0, bound to the resolver. */
export function gatewayDigest(resolver: Address, expires: bigint, request: Hex, result: Hex) {
  return keccak256(
    concatHex([
      "0x1900",
      resolver,
      numberToHex(expires, { size: 8 }),
      keccak256(request),
      keccak256(result),
    ]),
  );
}

/** The gateway's response body's `data`: abi.encode(result, expires, signature). */
export async function signGatewayAnswer({
  signer,
  resolver,
  request,
  result,
  expires,
}: {
  signer: LocalAccount;
  resolver: Address;
  request: Hex;
  result: Hex;
  /** Unix seconds after which the resolver refuses the answer. */
  expires: bigint;
}): Promise<Hex> {
  if (!signer.sign) throw new Error("The gateway signer can't sign a raw digest");
  const signature = await signer.sign({ hash: gatewayDigest(resolver, expires, request, result) });
  return encodeAbiParameters(
    [{ type: "bytes" }, { type: "uint64" }, { type: "bytes" }],
    [result, expires, signature],
  );
}

/** A `resolve(name, data)` call, as a client sends it to the gateway. */
export function encodeGatewayRequest(name: string, call: Hex): Hex {
  return encodeFunctionData({
    abi: resolveAbi,
    functionName: "resolve",
    args: [toHex(packetToBytes(name)), call],
  });
}
