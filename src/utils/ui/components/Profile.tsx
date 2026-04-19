import { truncateAddress } from "@polkadot-apps/address";
import { Avatar } from "./Avatar";
import { AuthorFeed } from "./AuthorFeed";

interface ProfileProps {
  address: string;
  refreshKey?: number;
  onAuthorClick?: (address: string) => void;
}

/**
 * Profile view = an address's full post timeline plus a lightweight header.
 * No on-chain profile metadata yet — that's a future contract extension
 * (set_profile / get_profile). For now the header derives everything from
 * the address itself so any user can be viewed immediately.
 */
export function Profile({ address, refreshKey = 0, onAuthorClick }: ProfileProps) {
  const handle = address.replace(/^0x/i, "").slice(-6).toLowerCase();

  return (
    <div className="profile">
      <div className="profile-header">
        <Avatar address={address} size={80} />
        <div className="profile-identity">
          <span className="profile-name" title={address}>{truncateAddress(address)}</span>
          <span className="profile-handle">@{handle}</span>
        </div>
      </div>

      <AuthorFeed
        address={address}
        refreshKey={refreshKey}
        emptyTitle="No posts."
        emptyBody="This account hasn't posted yet."
        onAuthorClick={onAuthorClick}
      />
    </div>
  );
}
