import { truncateAddress } from "@polkadot-apps/address";
import type { FixedSizeBinary } from "polkadot-api";
import { toHex, type Post } from "../../chain";
import { formatTime } from "../../time";
import { Avatar } from "./Avatar";
import { LikeIcon, ReplyIcon, RepostIcon, ShareIcon } from "./Icons";
import { usePostContent, useProfileInfo, useProfileMetadata } from "../hooks";

interface PostCardProps {
  post: Post;
  onAuthorClick?: (profileId: FixedSizeBinary<32>) => void;
}

export function PostCard({ post, onAuthorClick }: PostCardProps) {
  const authorHex = toHex(post.author);

  // Nested resolution: profile id → profile info (owner + metadata_uri) →
  // metadata JSON (name/bio). Each layer is cached independently so two
  // posts by the same author share the info and metadata fetches.
  const { data: profileInfo } = useProfileInfo(post.author);
  const { data: metadata } = useProfileMetadata(post.author);
  const { data: content } = usePostContent(post.content_uri);

  const ownerAddr = profileInfo?.owner ? String(profileInfo.owner) : undefined;
  const displayName =
    metadata?.name?.trim() || (ownerAddr ? truncateAddress(ownerAddr) : shortId(authorHex));
  const handle = ownerAddr ? shortHandle(ownerAddr) : shortHandle(authorHex);

  const openAuthor = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAuthorClick?.(post.author);
  };

  return (
    <article className="post" data-post-id={toHex(post.post_id)}>
      <button
        className="post-avatar-btn"
        onClick={openAuthor}
        type="button"
        aria-label="Open profile"
      >
        <Avatar seed={authorHex} />
      </button>
      <div className="post-main">
        <header className="post-header">
          <button
            className="post-name post-link"
            type="button"
            title={ownerAddr ?? authorHex}
            onClick={openAuthor}
          >
            {displayName}
          </button>
          <button className="post-handle post-link" type="button" onClick={openAuthor}>
            @{handle}
          </button>
          <span className="post-sep">·</span>
          <time className="post-time">{formatTime(Number(post.timestamp))}</time>
        </header>

        <p className="post-body">
          {content
            ? content.text
            : <span className="post-loading">Loading…</span>}
        </p>

        <div className="post-actions">
          <ActionButton icon={<ReplyIcon />} label="Reply" />
          <ActionButton icon={<RepostIcon />} label="Repost" variant="repost" />
          <ActionButton icon={<LikeIcon />} label="Like" variant="like" />
          <ActionButton icon={<ShareIcon />} label="Share" />
        </div>
      </div>
    </article>
  );
}

function ActionButton({
  icon,
  label,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  variant?: "like" | "repost";
}) {
  const cls = variant ? `post-action post-action-${variant}` : "post-action";
  return (
    <button className={cls} aria-label={label} type="button">
      <span className="post-action-icon">{icon}</span>
    </button>
  );
}

function shortHandle(hex: string): string {
  return hex.replace(/^0x/i, "").slice(-6).toLowerCase();
}

function shortId(hex: string): string {
  const clean = hex.replace(/^0x/i, "");
  return `${clean.slice(0, 6)}…${clean.slice(-4)}`;
}
