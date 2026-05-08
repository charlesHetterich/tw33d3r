import { truncateAddress } from "@polkadot-apps/address";
import type { FixedSizeBinary } from "polkadot-api";
import type { Profile } from "../../chain";
import { toHex } from "../../chain";
import { useBulletinJson } from "../hooks";
import type { ProfileMetadata } from "../../types";
import { Avatar } from "./Avatar";

interface Props {
  profile: Profile;
  variant: "dropdown" | "page";
  onSelect: (profileId: FixedSizeBinary<32>) => void;
}

/**
 * Shared row used by the search dropdown and the full-page results. Pulls
 * the profile's metadata blob (display name + bio) lazily — the lookup is
 * cached by content-uri so repeated profiles across both surfaces hit cache.
 */
export function ProfileSearchRow({ profile, variant, onSelect }: Props) {
  const { data: metadata } = useBulletinJson<ProfileMetadata>(profile.metadata_uri || undefined);
  const profileHex = toHex(profile.profile_id);
  const username = profile.username?.trim();
  const displayName =
    metadata?.name?.trim() ||
    username ||
    (profile.owner ? truncateAddress(String(profile.owner)) : profileHex.slice(0, 10));
  const bio = metadata?.bio?.trim();

  const handleClick = () => onSelect(profile.profile_id);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      className={`profile-row profile-row-${variant}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      type="button"
    >
      <Avatar seed={profileHex} size={variant === "dropdown" ? 40 : 48} />
      <div className="profile-row-text">
        <span className="profile-row-name">{displayName}</span>
        <span className="profile-row-handle">@{username || profileHex.slice(2, 10)}</span>
        {variant === "page" && bio && <p className="profile-row-bio">{bio}</p>}
      </div>
    </button>
  );
}
