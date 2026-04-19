import { truncateAddress } from "@polkadot-apps/address";
import type { PostEntry } from "../../types";
import { formatTime } from "../../time";
import { Avatar } from "./Avatar";
import { ReplyIcon, RepostIcon, LikeIcon, ShareIcon } from "./Icons";

export function PostCard({ entry }: { entry: PostEntry }) {
  const handle = shortHandle(entry.author);
  const display = truncateAddress(entry.author);

  return (
    <article className="post">
      <Avatar address={entry.author} />
      <div className="post-main">
        <header className="post-header">
          <span className="post-name" title={entry.author}>{display}</span>
          <span className="post-handle">@{handle}</span>
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
  // h160 addresses don't have handles — use last 6 hex chars as a pseudo-handle
  return address.replace(/^0x/i, "").slice(-6).toLowerCase();
}
