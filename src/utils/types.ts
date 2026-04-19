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

export type Tab = "feed" | "mine";
