import type { FixedSizeBinary } from "polkadot-api";
import { getChainAPI } from "@polkadot-apps/chain-client";
import { ContractManager } from "@polkadot-apps/contracts";
import cdmJson from "../../../cdm.json";
import { signerManager } from "./signer";

/**
 * Single manager, shared across all three contracts. Starts connecting on
 * module load so the first UI query doesn't pay the full connect cost.
 */
export const managerReady = getChainAPI("paseo").then(async api => {
  const manager = await ContractManager.fromClient(cdmJson as any, api.raw.assetHub, {
    signerManager,
  });
  return {
    app: manager.getContract("@example/tw33d3r"),
    threads: manager.getContract("@polkadot/threads"),
    profiles: manager.getContract("@polkadot/profiles"),
  };
});

export const appReady = managerReady.then(m => m.app);
export const threadsReady = managerReady.then(m => m.threads);
export const profilesReady = managerReady.then(m => m.profiles);

// ─────────────────────────────────────────────────────────────
// tw33d3r (@example/tw33d3r) — the thin app facade. Writes only.
// Reads go directly to @polkadot/threads and @polkadot/profiles.
//
// `cdm install` regenerates `.cdm/contracts.d.ts` from the deployed ABI;
// until that lands, the `as any` casts inside these helpers keep call sites
// fully typed at the helper boundary. The shapes here document the surface.
// ─────────────────────────────────────────────────────────────

/** App-level `get_context_id()`; used to derive the ContextId for system-contract reads. */
export async function getContextId(): Promise<FixedSizeBinary<32>> {
  const app = await appReady;
  const res = await (app as any).getContextId.query();
  return res.value as FixedSizeBinary<32>;
}

/** Create a new profile owned by the caller. Returns the new profile id. */
export async function createProfile(metadataUri: string) {
  const app = await appReady;
  return (app as any).createProfile.tx(metadataUri);
}

/** Update the metadata URI of a profile the caller owns. */
export async function updateProfile(profileId: FixedSizeBinary<32>, metadataUri: string) {
  const app = await appReady;
  return (app as any).updateProfile.tx(profileId, metadataUri);
}

/** Post as `author` (a profile the caller owns) under each parent. */
export async function publishPost(
  author: FixedSizeBinary<32>,
  parents: FixedSizeBinary<32>[],
  contentUri: string,
) {
  const app = await appReady;
  return (app as any).post.tx(author, parents, contentUri);
}

/** Delete one of your own posts (or any post if you're sudo). */
export async function deletePost(postId: FixedSizeBinary<32>) {
  const app = await appReady;
  return (app as any).deletePost.tx(postId);
}
