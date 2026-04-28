import type { FixedSizeBinary } from "polkadot-api";

/** JSON payload stored on Bulletin per post. */
export interface PostContent {
  text: string;
}

/**
 * JSON payload stored on Bulletin per profile. All fields optional so users
 * can incrementally fill their profile without breaking anything.
 */
export interface ProfileMetadata {
  name?: string;
  bio?: string;
  avatar_uri?: string;
}

/**
 * Active view.
 * - `feed` — global timeline
 * - `mine` — currently-selected profile's timeline
 * - `profile` — some profile's timeline (arrived at by clicking an author)
 */
export type View =
  | { kind: "feed" }
  | { kind: "mine" }
  | { kind: "profile"; profileId: FixedSizeBinary<32> };

export type Tab = View["kind"];
