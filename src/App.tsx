import { useCallback, useEffect, useRef, useState } from "react";
import { signerManager, useSigner } from "./utils/chain";
import { truncateAddress } from "@polkadot-apps/address";
import type { View } from "./utils/types";
import { Sidebar } from "./utils/ui/components/Sidebar";
import { TrendsPanel } from "./utils/ui/components/TrendsPanel";
import { Composer, type ComposerHandle } from "./utils/ui/components/Composer";
import { Feed } from "./utils/ui/components/Feed";
import { MyPosts } from "./utils/ui/components/MyPosts";
import { Profile } from "./utils/ui/components/Profile";

export default function App() {
  const [view, setView] = useState<View>({ kind: "feed" });
  const [refreshKey, setRefreshKey] = useState(0);
  const signer = useSigner();
  const account = signer.selectedAccount;

  const composerRef = useRef<ComposerHandle>(null);

  useEffect(() => {
    if (signer.status === "disconnected") signerManager.connect();
  }, [signer.status]);

  const handlePosted = useCallback(() => setRefreshKey(k => k + 1), []);
  const focusComposer = useCallback(() => composerRef.current?.focus(), []);
  const navigate = useCallback((next: View) => setView(next), []);
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
          <Composer ref={composerRef} account={account} onPosted={handlePosted} />
        )}

        {view.kind === "feed" && (
          <Feed refreshKey={refreshKey} onAuthorClick={openAuthor} />
        )}
        {view.kind === "mine" && (
          <MyPosts account={account} refreshKey={refreshKey} onAuthorClick={openAuthor} />
        )}
        {view.kind === "profile" && (
          <Profile
            address={view.address}
            refreshKey={refreshKey}
            onAuthorClick={openAuthor}
          />
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
