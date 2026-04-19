import type { FixedSizeBinary } from "polkadot-api";

export interface PostContent {
  text: string;
}

export interface PostEntry {
  postId: FixedSizeBinary<32>;
  postIdHex: string;
  author: string;
  contentUri: string;
  timestamp: number;
  content?: PostContent;
}

/**
 * Active view. `feed` = global timeline, `mine` = signed-in user's posts,
 * `{ kind: "profile", address }` = someone else's timeline.
 */
export type View =
  | { kind: "feed" }
  | { kind: "mine" }
  | { kind: "profile"; address: string };

export type Tab = View["kind"];
