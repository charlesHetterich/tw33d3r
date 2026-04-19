import { truncateAddress } from "@polkadot-apps/address";
import type { PostEntry } from "../../types";
import { formatTime } from "../../time";
import { Avatar } from "./Avatar";
import { LikeIcon, ReplyIcon, RepostIcon, ShareIcon } from "./Icons";

interface PostCardProps {
  entry: PostEntry;
  onAuthorClick?: (address: string) => void;
}

export function PostCard({ entry, onAuthorClick }: PostCardProps) {
  const handle = shortHandle(entry.author);
  const display = truncateAddress(entry.author);

  const openAuthor = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAuthorClick?.(entry.author);
  };

  return (
    <article className="post">
      <button
        className="post-avatar-btn"
        onClick={openAuthor}
        type="button"
        aria-label="Open profile"
      >
        <Avatar address={entry.author} />
      </button>
      <div className="post-main">
        <header className="post-header">
          <button
            className="post-name post-link"
            type="button"
            title={entry.author}
            onClick={openAuthor}
          >
            {display}
          </button>
          <button
            className="post-handle post-link"
            type="button"
            onClick={openAuthor}
          >
            @{handle}
          </button>
          <span className="post-sep">·</span>
          <time className="post-time">{formatTime(entry.timestamp)}</time>
        </header>

        <p className="post-body">
          {entry.content
            ? entry.content.text
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

function shortHandle(address: string): string {
  return address.replace(/^0x/i, "").slice(-6).toLowerCase();
}
