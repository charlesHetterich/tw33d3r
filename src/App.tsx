import { useState, useEffect, useCallback, useRef } from "react";
import { getChainAPI } from "@polkadot-apps/chain-client";
import { ContractManager } from "@polkadot-apps/contracts";
import { fetchJson, getGateway, computeCid, BulletinClient } from "@polkadot-apps/bulletin";
import { truncateAddress } from "@polkadot-apps/address";
import { SignerManager, type SignerState } from "@polkadot-apps/signer";
import { FixedSizeBinary } from "polkadot-api";
import { useIntersectionObserver } from "./utils.ts";
import cdmJson from "../cdm.json";

const gateway = getGateway("paseo");
const PAGE = 20;
const MAX_LEN = 280;

// ---------------------------------------------------------------------------
// Bulletin client (lazy singleton)
// ---------------------------------------------------------------------------

let _bulletinClient: BulletinClient | null = null;
async function getBulletinClient() {
  if (!_bulletinClient) _bulletinClient = await BulletinClient.create("paseo");
  return _bulletinClient;
}

// ---------------------------------------------------------------------------
// Signer
// ---------------------------------------------------------------------------

const signerManager = new SignerManager({ dappName: "tw33d3r" });

function useSignerState(): SignerState {
  const [state, setState] = useState<SignerState>(signerManager.getState());
  useEffect(() => signerManager.subscribe(setState), []);
  return state;
}

// ---------------------------------------------------------------------------
// Contract — lazy singleton, starts connecting on module load
// ---------------------------------------------------------------------------

const postsReady = getChainAPI("paseo").then(api => {
  const manager = new ContractManager(cdmJson as any, api.contracts, { signerManager });
  return manager.getContract("@example/tw33d3r-posts");
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PostContent {
  text: string;
}

interface PostEntry {
  postId: FixedSizeBinary<32>;
  postIdHex: string;
  author: string;
  contentUri: string;
  timestamp: number;
  content?: PostContent;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const [tab, setTab] = useState<"feed" | "mine">("feed");
  const [refreshKey, setRefreshKey] = useState(0);
  const signer = useSignerState();
  const account = signer.selectedAccount;

  useEffect(() => {
    if (signer.status === "disconnected") signerManager.connect();
  }, [signer.status]);

  const handlePosted = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <div className="app">
      <nav className="topbar">
        <span className="brand">tw33d3r</span>
        <div className="tabs">
          <button
            className={`tab ${tab === "feed" ? "active" : ""}`}
            onClick={() => setTab("feed")}
          >
            Feed
          </button>
          <button
            className={`tab ${tab === "mine" ? "active" : ""}`}
            onClick={() => setTab("mine")}
          >
            My Posts
          </button>
        </div>
        <span className="account">
          {account
            ? (account.name ?? truncateAddress(account.address))
            : signer.status === "connecting" ? "connecting…" : "not connected"}
        </span>
      </nav>

      <main className="container">
        {account && <Composer onPosted={handlePosted} />}
        <div className="page-views">
          <div className={`page-view ${tab === "feed" ? "page-visible" : "page-hidden"}`}>
            <Feed refreshKey={refreshKey} />
          </div>
          <div className={`page-view ${tab === "mine" ? "page-visible" : "page-hidden"}`}>
            <MyPosts account={account} refreshKey={refreshKey} />
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------

function Composer({ onPosted }: { onPosted: () => void }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "posting" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || status === "posting") return;

    setStatus("posting");
    setStatusMsg("Preparing…");
    try {
      const content: PostContent = { text: trimmed };
      const bytes = new TextEncoder().encode(JSON.stringify(content));
      const cid = computeCid(bytes);

      // Parallel: upload content to Bulletin + submit tx with the pre-computed CID.
      // Same pattern playground-app uses for app metadata.
      setStatusMsg("Uploading & posting…");
      const contract = await postsReady;

      const bulletinPromise = (async () => {
        const client = await getBulletinClient();
        await client.batchUpload([{ data: bytes, label: "post" }], undefined);
      })();

      const postPromise = (async () => {
        const result = await contract.post.tx(cid);
        if (!result.ok) throw new Error("Post transaction failed");
      })();

      const results = await Promise.allSettled([bulletinPromise, postPromise]);
      const failures = results.filter(r => r.status === "rejected") as PromiseRejectedResult[];
      if (failures.length) throw failures[0].reason;

      setText("");
      setStatus("idle");
      setStatusMsg("");
      onPosted();
    } catch (err: unknown) {
      setStatus("error");
      setStatusMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const len = text.length;
  const disabled = !text.trim() || status === "posting" || len > MAX_LEN;

  return (
    <div className="composer">
      <textarea
        className="composer-input"
        placeholder="What's happening?"
        value={text}
        onChange={e => setText(e.target.value)}
        rows={3}
      />
      <div className="composer-actions">
        <span className={`char-count ${len > MAX_LEN ? "over" : ""}`}>
          {len}/{MAX_LEN}
        </span>
        {status === "error" && <span className="composer-error">{statusMsg}</span>}
        {status === "posting" && <span className="composer-status">{statusMsg}</span>}
        <button className="btn btn-post" onClick={submit} disabled={disabled}>
          {status === "posting" ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feed — global, auto-scrolling
// Mirrors playground-app: getPostCount + iterate backwards via getPostAt,
// resolve each id to its full record via getPost. Bulletin content is
// back-filled async so cards render immediately.
// ---------------------------------------------------------------------------

function Feed({ refreshKey }: { refreshKey: number }) {
  const [entries, setEntries] = useState<PostEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadedRef = useRef(0);
  const totalRef = useRef(-1);
  const busyRef = useRef(false);
  const resetRef = useRef(refreshKey);

  // Reset on refreshKey bump (new post published)
  if (resetRef.current !== refreshKey) {
    resetRef.current = refreshKey;
    loadedRef.current = 0;
    totalRef.current = -1;
    busyRef.current = false;
  }

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
      setEntries(prev => (refreshKey !== resetRef.current ? prev : [...prev, ...batch]));
      setHasMore(loaded + scanned < total);

      // Back-fill content from Bulletin as each resolves
      for (const entry of batch) {
        fetchJson<PostContent>(entry.contentUri, gateway)
          .then(content => setEntries(prev =>
            prev.map(e => (e.postIdHex === entry.postIdHex ? { ...e, content } : e)),
          ))
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

  // Initial + refresh-on-new-post
  useEffect(() => {
    setEntries([]);
    setHasMore(true);
    loadMore();
  }, [refreshKey, loadMore]);

  const sentinelRef = useIntersectionObserver(loadMore, hasMore && !loading);

  return (
    <div className="feed">
      {entries.map(entry => <PostCard key={entry.postIdHex} entry={entry} />)}
      {loading && <div className="spinner">Loading…</div>}
      {!hasMore && entries.length === 0 && !loading && (
        <div className="empty">No posts yet. Be the first!</div>
      )}
      {hasMore && <div ref={sentinelRef} className="sentinel" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// My Posts — per-author index
// Mirrors playground-app MyApps: getAuthorPostCount + iterate via
// getAuthorPostAt, then resolve each id to its record.
// ---------------------------------------------------------------------------

function MyPosts({
  account,
  refreshKey,
}: {
  account?: SignerState["selectedAccount"];
  refreshKey: number;
}) {
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
          await Promise.allSettled(batch.map(async entry => {
            try { entry.content = await fetchJson<PostContent>(entry.contentUri, gateway); } catch {}
          }));
          if (!cancelled) setEntries(batch);
        }
      } catch (err) {
        console.error("MyPosts load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [account?.h160Address, refreshKey]);

  if (!account) {
    return <div className="empty">Connect a wallet to see your posts.</div>;
  }
  if (loading && entries.length === 0) {
    return <div className="spinner">Loading your posts…</div>;
  }
  if (!loading && entries.length === 0) {
    return <div className="empty">You haven't posted yet.</div>;
  }
  return (
    <div className="feed">
      {entries.map(entry => <PostCard key={entry.postIdHex} entry={entry} />)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Post card
// ---------------------------------------------------------------------------

function PostCard({ entry }: { entry: PostEntry }) {
  return (
    <article className="post">
      <header className="post-header">
        <span className="post-author" title={entry.author}>
          {truncateAddress(entry.author)}
        </span>
        <time className="post-time">{formatTime(entry.timestamp)}</time>
      </header>
      <p className="post-body">
        {entry.content?.text ?? <span className="post-loading">…</span>}
      </p>
    </article>
  );
}

function formatTime(unixSeconds: number): string {
  if (!unixSeconds) return "";
  const now = Math.floor(Date.now() / 1000);
  const delta = now - unixSeconds;
  if (delta < 60) return `${delta}s`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`;
  if (delta < 604800) return `${Math.floor(delta / 86400)}d`;
  return new Date(unixSeconds * 1000).toLocaleDateString();
}
