import type { FixedSizeBinary } from "polkadot-api";

/** Anything the contract might hand us for a `bytes32` field. */
export type BytesLike = FixedSizeBinary<number> | Uint8Array | `0x${string}` | string;

/**
 * Convert a bytes-like value to a `0x`-prefixed hex string.
 *
 * Defensive over the polkadot-api / sdk-ink ABI decoder, which has historically
 * returned bytes32 as `FixedSizeBinary` (has `.asHex()`), raw `Uint8Array`
 * (`.buffer`, no methods), or already-encoded hex strings depending on version.
 */
export function toHex(value: BytesLike): `0x${string}` {
  if (typeof value === "string") {
    return value.startsWith("0x") ? (value as `0x${string}`) : (`0x${value}` as `0x${string}`);
  }
  if (value instanceof Uint8Array) {
    return bytesToHex(value);
  }
  // FixedSizeBinary-like object
  const anyVal = value as { asHex?: () => `0x${string}`; asBytes?: () => Uint8Array };
  if (typeof anyVal.asHex === "function") return anyVal.asHex();
  if (typeof anyVal.asBytes === "function") return bytesToHex(anyVal.asBytes());
  throw new Error(`Cannot convert value to hex: ${String(value)}`);
}

function bytesToHex(bytes: Uint8Array): `0x${string}` {
  let out = "0x";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out as `0x${string}`;
}
