import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson } from "@polkadot-apps/bulletin";
import { FixedSizeBinary } from "polkadot-api";
import { PAGE, gateway, postsReady } from "../../chain";
import type { PostContent, PostEntry } from "../../types";
import { useIntersectionObserver } from "../hooks";
import { PostCard } from "./PostCard";

export function Feed({ refreshKey }: { refreshKey: number }) {
  const [entries, setEntries] = useState<PostEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadedRef = useRef(0);
  const totalRef = useRef(-1);
  const busyRef = useRef(false);
  const refreshRef = useRef(refreshKey);

  const loadMore = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const contract = await postsReady;

      if (totalRef.current === -1) {
        const r = await contract.getPostCount.query();
        totalRef.current = r.success ? Number(r.value) : 0;
      }

      const total = totalRef.current;
      const loaded = loadedRef.current;
      if (loaded >= total) {
        setHasMore(false);
        return;
      }

      const batch: PostEntry[] = [];
      let scanned = 0;

      while (batch.length < PAGE && loaded + scanned < total) {
        const idx = total - 1 - loaded - scanned;
        scanned++;

        const idRes = await contract.getPostAt.query(idx);
        if (!idRes.success || !idRes.value?.isSome) continue;
        const postId = idRes.value.value as FixedSizeBinary<32>;

        const postRes = await contract.getPost.query(postId);
        if (!postRes.success || !postRes.value?.isSome) continue;
        const info = postRes.value.value;

        batch.push({
          postId,
          postIdHex: postId.asHex(),
          author: String(info.author),
          contentUri: info.content_uri,
          timestamp: Number(info.timestamp),
        });
      }

      loadedRef.current = loaded + scanned;
      setEntries(prev => [...prev, ...batch]);
      setHasMore(loaded + scanned < total);

      // Back-fill Bulletin content async — cards render immediately
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
      console.error("Feed load error:", err);
      setHasMore(false);
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, []);

  // Reset on refreshKey bump (e.g. after a new post)
  useEffect(() => {
    if (refreshRef.current === refreshKey) {
      loadMore();
      return;
    }
    refreshRef.current = refreshKey;
    loadedRef.current = 0;
    totalRef.current = -1;
    busyRef.current = false;
    setEntries([]);
    setHasMore(true);
    loadMore();
  }, [refreshKey, loadMore]);

  const sentinelRef = useIntersectionObserver(loadMore, hasMore && !loading);

  return (
    <div className="feed">
      {entries.map(entry => <PostCard key={entry.postIdHex} entry={entry} />)}
      {loading && <div className="feed-spinner">Loading…</div>}
      {!hasMore && entries.length === 0 && !loading && (
        <div className="feed-empty">
          <h3>Nothing here yet.</h3>
          <p>Be the first to post.</p>
        </div>
      )}
      {hasMore && <div ref={sentinelRef} className="sentinel" />}
    </div>
  );
}
