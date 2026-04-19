import { truncateAddress } from "@polkadot-apps/address";
import { getAuthorPostsPage } from "../../chain";
import { Avatar } from "./Avatar";
import { PostFeed } from "./PostFeed";

interface ProfileProps {
  address: string;
  onAuthorClick?: (address: string) => void;
}

/**
 * Profile view = an address's timeline plus a lightweight header. No
 * on-chain profile metadata yet — that's a future contract extension
 * (set_profile / get_profile). The header derives everything from the
 * address itself so any user can be viewed immediately.
 */
export function Profile({ address, onAuthorClick }: ProfileProps) {
  const handle = shortHandle(address);

  return (
    <div className="profile">
      <div className="profile-header">
        <Avatar address={address} size={80} />
        <div className="profile-identity">
          <span className="profile-name" title={address}>{truncateAddress(address)}</span>
          <span className="profile-handle">@{handle}</span>
        </div>
      </div>

      <PostFeed
        queryKey={["posts", "author", address]}
        queryFn={(offset, limit) => getAuthorPostsPage(address, offset, limit)}
        emptyTitle="No posts."
        emptyBody="This account hasn't posted yet."
        onAuthorClick={onAuthorClick}
      />
    </div>
  );
}

function shortHandle(address: string): string {
  return address.replace(/^0x/i, "").slice(-6).toLowerCase();
}
