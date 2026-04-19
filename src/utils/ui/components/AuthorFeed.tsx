import { useCallback, useEffect, useRef, useState } from "react";
import {
  PAGE,
  fetchJson,
  gateway,
  getAuthorPostsPage,
  toHex,
} from "../../chain";
import type { PostContent, PostEntry } from "../../types";
import { useIntersectionObserver } from "../hooks";
import { PostCard } from "./PostCard";

interface AuthorFeedProps {
  address: string;
  refreshKey?: number;
  emptyTitle?: string;
  emptyBody?: string;
  onAuthorClick?: (address: string) => void;
}

/**
 * Generic "timeline for one address" — powers both the MyPosts tab and the
 * Profile view. Paginated via `getAuthorPostsPage`. The caller decides the
 * empty-state copy and whether author clicks should navigate.
 */
export function AuthorFeed({
  address,
  refreshKey = 0,
  emptyTitle = "No posts yet.",
  emptyBody = "When they post something, it'll show up here.",
  onAuthorClick,
}: AuthorFeedProps) {
  const [entries, setEntries] = useState<PostEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const offsetRef = useRef(0);
  const busyRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (busyRef.current || done) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const res = await getAuthorPostsPage(address, offsetRef.current, PAGE);
      if (!res.success) {
        setDone(true);
        return;
      }
      const { posts, next_offset, done: isDone } = res.value;

      const batch: PostEntry[] = posts.map(p => ({
        postId: p.post_id,
        postIdHex: toHex(p.post_id),
        author: String(p.author),
        contentUri: p.content_uri,
        timestamp: Number(p.timestamp),
      }));

      offsetRef.current = Number(next_offset);
      setEntries(prev => [...prev, ...batch]);
      setDone(Boolean(isDone));

      for (const entry of batch) {
        fetchJson<PostContent>(entry.contentUri, gateway)
          .then(content =>
            setEntries(prev =>
              prev.map(e => (e.postIdHex === entry.postIdHex ? { ...e, content } : e)),
            ),
          )
          .catch(() => {});
      }
    } catch (err) {
      console.error("AuthorFeed load error:", err);
      setDone(true);
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [address, done]);

  // Reset whenever the target address or refresh key changes.
  useEffect(() => {
    offsetRef.current = 0;
    busyRef.current = false;
    setEntries([]);
    setDone(false);
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, refreshKey]);

  const sentinelRef = useIntersectionObserver(loadMore, !done && !loading);

  if (done && entries.length === 0 && !loading) {
    return (
      <div className="feed-empty">
        <h3>{emptyTitle}</h3>
        <p>{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="feed">
      {entries.map(entry => (
        <PostCard key={entry.postIdHex} entry={entry} onAuthorClick={onAuthorClick} />
      ))}
      {loading && <div className="feed-spinner">Loading…</div>}
      {!done && <div ref={sentinelRef} className="sentinel" />}
    </div>
  );
}
