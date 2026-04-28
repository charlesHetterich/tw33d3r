import { truncateAddress } from "@polkadot-apps/address";
import type { FixedSizeBinary } from "polkadot-api";
import { getAuthorPostsPage, toHex } from "../../chain";
import { useContextId, useProfileInfo, useProfileMetadata } from "../hooks";
import { Avatar } from "./Avatar";
import { PostFeed } from "./PostFeed";

interface ProfileProps {
  profileId: FixedSizeBinary<32>;
  onAuthorClick?: (profileId: FixedSizeBinary<32>) => void;
}

/**
 * Profile view = profile header + the profile's timeline. The header pulls
 * owner + metadata_uri from @polkadot/profiles, then the metadata JSON from
 * Bulletin for name/bio. The timeline is the author-scoped thread index.
 */
export function Profile({ profileId, onAuthorClick }: ProfileProps) {
  const { data: contextId } = useContextId();
  const { data: info } = useProfileInfo(profileId);
  const { data: metadata } = useProfileMetadata(profileId);

  const profileIdHex = toHex(profileId);
  const ownerAddr = info?.owner ? String(info.owner) : undefined;
  const displayName = metadata?.name?.trim() || (ownerAddr ? truncateAddress(ownerAddr) : shortId(profileIdHex));
  const bio = metadata?.bio?.trim();
  const handle = ownerAddr ? shortHandle(ownerAddr) : shortHandle(profileIdHex);

  return (
    <div className="profile">
      <div className="profile-header">
        <Avatar seed={profileIdHex} size={80} />
        <div className="profile-identity">
          <span className="profile-name" title={ownerAddr ?? profileIdHex}>{displayName}</span>
          <span className="profile-handle">@{handle}</span>
          {ownerAddr && ownerAddr !== displayName && (
            <span className="profile-meta">{truncateAddress(ownerAddr)}</span>
          )}
          {bio && <p className="profile-bio">{bio}</p>}
        </div>
      </div>

      {contextId && (
        <PostFeed
          queryKey={["posts", "author", toHex(contextId), profileIdHex]}
          queryFn={(offset, limit) => getAuthorPostsPage(contextId, profileId, offset, limit)}
          emptyTitle="No posts."
          emptyBody="This profile hasn't posted yet."
          onAuthorClick={onAuthorClick}
        />
      )}
    </div>
  );
}

function shortHandle(hex: string): string {
  return hex.replace(/^0x/i, "").slice(-6).toLowerCase();
}

function shortId(hex: string): string {
  const clean = hex.replace(/^0x/i, "");
  return `${clean.slice(0, 6)}…${clean.slice(-4)}`;
}
