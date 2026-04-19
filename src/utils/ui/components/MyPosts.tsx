import { useEffect, useState } from "react";
import { fetchJson } from "@polkadot-apps/bulletin";
import type { SignerState } from "@polkadot-apps/signer";
import { FixedSizeBinary } from "polkadot-api";
import { gateway, postsReady } from "../../chain";
import type { PostContent, PostEntry } from "../../types";
import { PostCard } from "./PostCard";

interface MyPostsProps {
  account?: SignerState["selectedAccount"];
  refreshKey: number;
}

export function MyPosts({ account, refreshKey }: MyPostsProps) {
  const [entries, setEntries] = useState<PostEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account) {
      setEntries([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const contract = await postsReady;
        const countRes = await contract.getAuthorPostCount.query(account.h160Address);
        const total = countRes.success ? Number(countRes.value) : 0;

        const batch: PostEntry[] = [];
        for (let i = total - 1; i >= 0; i--) {
          if (cancelled) break;

          const idRes = await contract.getAuthorPostAt.query(account.h160Address, i);
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

        if (!cancelled) {
          await Promise.allSettled(
            batch.map(async entry => {
              try {
                entry.content = await fetchJson<PostContent>(entry.contentUri, gateway);
              } catch {}
            }),
          );
          if (!cancelled) setEntries(batch);
        }
      } catch (err) {
        console.error("MyPosts load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [account?.h160Address, refreshKey]);

  if (!account) {
    return (
      <div className="feed-empty">
        <h3>My Posts</h3>
        <p>Connect a wallet to see your posts.</p>
      </div>
    );
  }
  if (loading && entries.length === 0) {
    return <div className="feed-spinner">Loading your posts…</div>;
  }
  if (!loading && entries.length === 0) {
    return (
      <div className="feed-empty">
        <h3>No posts yet.</h3>
        <p>When you post something, it'll show up here.</p>
      </div>
    );
  }
  return (
    <div className="feed">
      {entries.map(entry => <PostCard key={entry.postIdHex} entry={entry} />)}
    </div>
  );
}
