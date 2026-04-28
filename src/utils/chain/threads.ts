import type { FixedSizeBinary, HexString } from "polkadot-api";
import { threadsReady } from "./app";

// ─────────────────────────────────────────────────────────────
// @polkadot/threads — read-side surface used by the frontend.
// ─────────────────────────────────────────────────────────────

export interface Post {
  post_id: FixedSizeBinary<32>;
  author: FixedSizeBinary<32>;        // a profile id
  parents: FixedSizeBinary<32>[];     // feeds / posts / profiles it was published to
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
 * Batch-fetch posts under `parent`, newest-first.
 * - `parent = GLOBAL_FEED` → global feed
 * - `parent = <post_id>` → replies under that post
 * - `parent = <profile_id>` → wall posts on that profile
 */
export async function getParentPostsPage(
  contextId: FixedSizeBinary<32>,
  parent: FixedSizeBinary<32>,
  offset: number,
  limit: number,
): Promise<QueryResult<PostPage>> {
  const threads = await threadsReady;
  return (threads as any).getParentPostsPage.query(contextId, parent, offset, limit);
}

/** Batch-fetch posts authored by `author` (a profile id), newest-first. */
export async function getAuthorPostsPage(
  contextId: FixedSizeBinary<32>,
  author: FixedSizeBinary<32>,
  offset: number,
  limit: number,
): Promise<QueryResult<PostPage>> {
  const threads = await threadsReady;
  return (threads as any).getAuthorPostsPage.query(contextId, author, offset, limit);
}

/** Single post by id. Used for reply-context lookups. */
export async function getPost(
  contextId: FixedSizeBinary<32>,
  postId: FixedSizeBinary<32>,
): Promise<QueryResult<{ isSome: boolean; value: Post }>> {
  const threads = await threadsReady;
  return (threads as any).getPost.query(contextId, postId);
}

export type { HexString };
