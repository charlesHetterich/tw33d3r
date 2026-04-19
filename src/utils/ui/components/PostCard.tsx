import { truncateAddress } from "@polkadot-apps/address";
import { useQuery } from "@tanstack/react-query";
import { fetchJson, gateway, type Post, toHex } from "../../chain";
import { formatTime } from "../../time";
import type { PostContent } from "../../types";
import { Avatar } from "./Avatar";
import { LikeIcon, ReplyIcon, RepostIcon, ShareIcon } from "./Icons";

interface PostCardProps {
  post: Post;
  onAuthorClick?: (address: string) => void;
}

export function PostCard({ post, onAuthorClick }: PostCardProps) {
  const author = String(post.author);
  const handle = shortHandle(author);
  const display = truncateAddress(author);

  // Content is content-addressed on Bulletin, so it never changes for a
  // given CID — cache forever. React-query also dedupes concurrent fetches
  // of the same CID across cards, which matters when the same post shows
  // up in both a profile view and the global feed.
  const { data: content } = useQuery({
    queryKey: ["bulletin-content", post.content_uri],
    queryFn: () => fetchJson<PostContent>(post.content_uri, gateway),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 2,
  });

  const openAuthor = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAuthorClick?.(author);
  };

  return (
    <article className="post" data-post-id={toHex(post.post_id)}>
      <button
        className="post-avatar-btn"
        onClick={openAuthor}
        type="button"
        aria-label="Open profile"
      >
        <Avatar address={author} />
      </button>
      <div className="post-main">
        <header className="post-header">
          <button
            className="post-name post-link"
            type="button"
            title={author}
            onClick={openAuthor}
          >
            {display}
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

function shortHandle(address: string): string {
  return address.replace(/^0x/i, "").slice(-6).toLowerCase();
}
