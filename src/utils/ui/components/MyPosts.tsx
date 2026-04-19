import type { SignerState } from "@polkadot-apps/signer";
import { AuthorFeed } from "./AuthorFeed";

interface MyPostsProps {
  account?: SignerState["selectedAccount"];
  refreshKey: number;
  onAuthorClick?: (address: string) => void;
}

export function MyPosts({ account, refreshKey, onAuthorClick }: MyPostsProps) {
  if (!account) {
    return (
      <div className="feed-empty">
        <h3>My Posts</h3>
        <p>Connect a wallet to see your posts.</p>
      </div>
    );
  }
  return (
    <AuthorFeed
      address={account.h160Address}
      refreshKey={refreshKey}
      emptyTitle="No posts yet."
      emptyBody="When you post something, it'll show up here."
      onAuthorClick={onAuthorClick}
    />
  );
}
