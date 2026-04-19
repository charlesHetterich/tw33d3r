import {
  BulletinClient,
  computeCid,
  fetchJson,
  getGateway,
} from "@polkadot-apps/bulletin";

export const gateway = getGateway("paseo");

/** Lazy singleton — connecting to Bulletin is expensive, share one client. */
let _client: BulletinClient | null = null;
export async function getBulletinClient(): Promise<BulletinClient> {
  if (!_client) _client = await BulletinClient.create("paseo");
  return _client;
}

/**
 * Low-level: upload a single blob. Throws on failure so callers can `await`
 * without checking the return. Used as a building block by `uploadJson` and
 * by callers that want to run the upload in parallel with a contract tx
 * (since the CID is content-addressed and can be computed locally first).
 *
 * When running inside the Polkadot Desktop/Mobile host, signing + submission
 * is handled by the host's preimage API. Standalone, it falls back to a dev
 * signer (only funded on test chains).
 */
export async function uploadBytes(bytes: Uint8Array, label: string): Promise<void> {
  const client = await getBulletinClient();
  const results = await client.batchUpload([{ data: bytes, label }], undefined);
  const failure = results.find(r => !r.success);
  if (failure) {
    const reason = "error" in failure ? String(failure.error) : "unknown";
    throw new BulletinUploadError(`Bulletin upload failed: ${reason}`, failure);
  }
}

/**
 * Convenience: serialize a value to JSON, compute its CID, and upload it.
 * For parallel flows (upload + on-chain tx at once), use `computeCid` +
 * `uploadBytes` directly instead — the CID is known before the upload
 * completes.
 */
export async function uploadJson<T>(value: T): Promise<{ cid: string }> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const cid = computeCid(bytes);
  await uploadBytes(bytes, "json");
  return { cid };
}

/**
 * Pre-flight: check whether an account is allowed to store data on Bulletin.
 * Surfaces a clean "you're not authorized" UX instead of a mid-tx failure.
 */
export async function checkAuthorization(address: string) {
  const client = await getBulletinClient();
  return client.checkAuthorization(address);
}

export class BulletinUploadError extends Error {
  constructor(message: string, public readonly result: unknown) {
    super(message);
    this.name = "BulletinUploadError";
  }
}

export { computeCid, fetchJson };
