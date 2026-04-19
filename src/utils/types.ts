/** JSON payload stored on Bulletin per post. */
export interface PostContent {
  text: string;
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
