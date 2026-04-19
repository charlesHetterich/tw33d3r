import { useCallback, useEffect, useRef, useState } from "react";
import { truncateAddress } from "@polkadot-apps/address";
import {
  getAuthorPostsPage,
  getPostsPage,
  signerManager,
  useSigner,
} from "./utils/chain";
import type { View } from "./utils/types";
import { Sidebar } from "./utils/ui/components/Sidebar";
import { TrendsPanel } from "./utils/ui/components/TrendsPanel";
import { Composer, type ComposerHandle } from "./utils/ui/components/Composer";
import { PostFeed } from "./utils/ui/components/PostFeed";
import { Profile } from "./utils/ui/components/Profile";

export default function App() {
  const [view, setView] = useState<View>({ kind: "feed" });
  const signer = useSigner();
  const account = signer.selectedAccount;

  const composerRef = useRef<ComposerHandle>(null);

  useEffect(() => {
    if (signer.status === "disconnected") signerManager.connect();
  }, [signer.status]);

  const navigate = useCallback((next: View) => setView(next), []);
  const focusComposer = useCallback(() => composerRef.current?.focus(), []);
  const openAuthor = useCallback(
    (address: string) => setView({ kind: "profile", address }),
    [],
  );

  return (
    <div className="layout">
      <Sidebar
        view={view}
        onNavigate={navigate}
        account={account}
        onComposeClick={focusComposer}
      />

      <main className="main">
        <header className="page-header">
          <h1 className="page-title">{titleForView(view)}</h1>
        </header>

        {account && view.kind !== "profile" && (
          <Composer ref={composerRef} account={account} />
        )}

        {view.kind === "feed" && (
          <PostFeed
            queryKey={["posts", "feed"]}
            queryFn={getPostsPage}
            emptyTitle="Nothing here yet."
            emptyBody="Be the first to post."
            onAuthorClick={openAuthor}
          />
        )}

        {view.kind === "mine" && !account && (
          <div className="feed-empty">
            <h3>My Posts</h3>
            <p>Connect a wallet to see your posts.</p>
          </div>
        )}
        {view.kind === "mine" && account && (
          <PostFeed
            queryKey={["posts", "author", account.h160Address]}
            queryFn={(offset, limit) => getAuthorPostsPage(account.h160Address, offset, limit)}
            emptyTitle="No posts yet."
            emptyBody="When you post something, it'll show up here."
            onAuthorClick={openAuthor}
          />
        )}

        {view.kind === "profile" && (
          <Profile address={view.address} onAuthorClick={openAuthor} />
        )}
      </main>

      <TrendsPanel />
    </div>
  );
}

function titleForView(view: View): string {
  switch (view.kind) {
    case "feed":
      return "Home";
    case "mine":
      return "My Posts";
    case "profile":
      return truncateAddress(view.address);
  }
}
