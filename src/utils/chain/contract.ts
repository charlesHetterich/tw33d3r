import type { FixedSizeBinary, HexString } from "polkadot-api";
import { getChainAPI } from "@polkadot-apps/chain-client";
import { ContractManager } from "@polkadot-apps/contracts";
import cdmJson from "../../../cdm.json";
import { signerManager } from "./signer";

/**
 * Lazy singleton contract handle. Starts connecting on module load so the
 * first UI query doesn't pay the full connect cost. The returned handle is
 * already wired to `signerManager` — `.tx()` calls use the logged-in account
 * automatically.
 */
export const postsReady = getChainAPI("paseo").then(async api => {
  const manager = await ContractManager.fromClient(cdmJson as any, api.raw.assetHub, {
    signerManager,
  });
  return manager.getContract("@example/tw33d3r-posts");
});

// ─────────────────────────────────────────────────────────────
// Typed surface over the contract's ABI.
//
// `cdm install` regenerates `.cdm/contracts.d.ts` from the deployed ABI.
// Until the new post-pagination methods are installed there, we cast through
// `any` inside these helpers so the call sites stay clean and fully typed.
// After the next `cdm deploy -n paseo && cdm install`, the casts become
// no-ops — the shapes here still document the intended surface.
// ─────────────────────────────────────────────────────────────

export interface Post {
  post_id: FixedSizeBinary<32>;
  author: HexString;
  content_uri: string;
  timestamp: bigint;
}

export interface PostPage {
  posts: Post[];
  next_offset: number;
  done: boolean;
}

export interface QueryResult<T> {
  success: boolean;
  value: T;
}

/**
 * Fetch one page of the global feed, newest-first.
 * `offset` is counted from the newest post (0 = newest post).
 */
export async function getPostsPage(offset: number, limit: number): Promise<QueryResult<PostPage>> {
  const contract = await postsReady;
  return (contract as any).getPostsPage.query(offset, limit);
}

/** Fetch one page of an author's posts, newest-first. */
export async function getAuthorPostsPage(
  author: HexString | string,
  offset: number,
  limit: number,
): Promise<QueryResult<PostPage>> {
  const contract = await postsReady;
  return (contract as any).getAuthorPostsPage.query(author, offset, limit);
}

/** Total post count for the global feed. */
export async function getPostCount(): Promise<number> {
  const contract = await postsReady;
  const res = await (contract as any).getPostCount.query();
  return res.success ? Number(res.value) : 0;
}

/** Submit a new post; returns the tx result (not awaited for finality). */
export async function publishPost(contentUri: string) {
  const contract = await postsReady;
  return (contract as any).post.tx(contentUri);
}

/** Delete one of your own posts (or any post if you're sudo). */
export async function deletePost(postId: FixedSizeBinary<32>) {
  const contract = await postsReady;
  return (contract as any).deletePost.tx(postId);
}
