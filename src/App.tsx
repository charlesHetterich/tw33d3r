import { useCallback, useEffect, useRef, useState } from "react";
import { signerManager, useSignerState } from "./utils/chain";
import type { Tab } from "./utils/types";
import { Sidebar } from "./utils/ui/components/Sidebar";
import { TrendsPanel } from "./utils/ui/components/TrendsPanel";
import { Composer, type ComposerHandle } from "./utils/ui/components/Composer";
import { Feed } from "./utils/ui/components/Feed";
import { MyPosts } from "./utils/ui/components/MyPosts";

const TAB_TITLES: Record<Tab, string> = {
  feed: "Home",
  mine: "My Posts",
};

export default function App() {
  const [tab, setTab] = useState<Tab>("feed");
  const [refreshKey, setRefreshKey] = useState(0);
  const signer = useSignerState();
  const account = signer.selectedAccount;

  const composerRef = useRef<ComposerHandle>(null);

  useEffect(() => {
    if (signer.status === "disconnected") signerManager.connect();
  }, [signer.status]);

  const handlePosted = useCallback(() => setRefreshKey(k => k + 1), []);
  const focusComposer = useCallback(() => composerRef.current?.focus(), []);

  return (
    <div className="layout">
      <Sidebar
        tab={tab}
        onTabChange={setTab}
        account={account}
        onComposeClick={focusComposer}
      />

      <main className="main">
        <header className="page-header">
          <h1 className="page-title">{TAB_TITLES[tab]}</h1>
        </header>

        {account && <Composer ref={composerRef} account={account} onPosted={handlePosted} />}

        <div className="page-views">
          <div className={`page-view ${tab === "feed" ? "visible" : "hidden"}`}>
            <Feed refreshKey={refreshKey} />
          </div>
          <div className={`page-view ${tab === "mine" ? "visible" : "hidden"}`}>
            <MyPosts account={account} refreshKey={refreshKey} />
          </div>
        </div>
      </main>

      <TrendsPanel />
    </div>
  );
}
