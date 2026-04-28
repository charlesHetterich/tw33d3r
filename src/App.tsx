import { useCallback, useEffect, useRef, useState } from "react";
import { truncateAddress } from "@polkadot-apps/address";
import type { SignerState } from "@polkadot-apps/signer";
import type { FixedSizeBinary } from "polkadot-api";
import {
  GLOBAL_FEED,
  getParentPostsPage,
  signerManager,
  toHex,
  useSigner,
} from "./utils/chain";
import type { View } from "./utils/types";
import { useContextId, useMyProfiles, useProfileInfo, useProfileMetadata } from "./utils/ui/hooks";
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
  const { data: contextId } = useContextId();

  useEffect(() => {
    if (signer.status === "disconnected") signerManager.connect();
  }, [signer.status]);

  const navigate = useCallback((next: View) => setView(next), []);
  const focusComposer = useCallback(() => composerRef.current?.focus(), []);
  const openAuthor = useCallback(
    (profileId: FixedSizeBinary<32>) => setView({ kind: "profile", profileId }),
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
          <PageTitle view={view} />
        </header>

        {account && view.kind !== "profile" && (
          <Composer ref={composerRef} account={account} />
        )}

        {view.kind === "feed" && contextId && (
          <PostFeed
            queryKey={["posts", "feed", toHex(contextId)]}
            queryFn={(offset, limit) =>
              getParentPostsPage(contextId, GLOBAL_FEED, offset, limit)
            }
            emptyTitle="Nothing here yet."
            emptyBody="Be the first to post."
            onAuthorClick={openAuthor}
          />
        )}

        {view.kind === "mine" && (
          <MyTimeline account={account} onAuthorClick={openAuthor} />
        )}

        {view.kind === "profile" && (
          <Profile profileId={view.profileId} onAuthorClick={openAuthor} />
        )}
      </main>

      <TrendsPanel />
    </div>
  );
}

/**
 * "Profile" tab = the user's first profile's page. If they have none yet,
 * prompt them to create one via the composer. If they're not connected,
 * prompt them to connect.
 */
function MyTimeline({
  account,
  onAuthorClick,
}: {
  account?: SignerState["selectedAccount"];
  onAuthorClick: (profileId: FixedSizeBinary<32>) => void;
}) {
  const { data: profiles, isPending } = useMyProfiles(account?.h160Address);

  if (!account) {
    return (
      <div className="feed-empty">
        <h3>Profile</h3>
        <p>Connect a wallet to see your profile.</p>
      </div>
    );
  }
  if (isPending) return <div className="feed-spinner">Loading…</div>;
  if (!profiles || profiles.length === 0) {
    return (
      <div className="feed-empty">
        <h3>No profile yet.</h3>
        <p>Create one from the composer above to start posting.</p>
      </div>
    );
  }
  return <Profile profileId={profiles[0].profile_id} onAuthorClick={onAuthorClick} />;
}

/** Page title — "Home" for the feed, the profile's display name for profile views. */
function PageTitle({ view }: { view: View }) {
  if (view.kind === "feed") return <h1 className="page-title">Home</h1>;
  if (view.kind === "mine") return <h1 className="page-title">Profile</h1>;
  return <ProfilePageTitle profileId={view.profileId} />;
}

function ProfilePageTitle({ profileId }: { profileId: FixedSizeBinary<32> }) {
  const { data: info } = useProfileInfo(profileId);
  const { data: metadata } = useProfileMetadata(profileId);
  const title =
    metadata?.name?.trim() ||
    (info?.owner ? truncateAddress(String(info.owner)) : toHex(profileId).slice(0, 10) + "…");
  return <h1 className="page-title">{title}</h1>;
}
