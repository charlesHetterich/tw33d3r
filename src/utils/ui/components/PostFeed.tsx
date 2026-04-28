import { useInfiniteQuery } from "@tanstack/react-query";
import type { FixedSizeBinary } from "polkadot-api";
import { PAGE, type Post, type PostPage, type QueryResult, toHex } from "../../chain";
import { useIntersectionObserver } from "../hooks";
import { PostCard } from "./PostCard";

interface PostFeedProps {
  /** Unique cache key for this feed. Prefix with `["posts"]` so the Composer
   * can invalidate everything post-related on publish. */
  queryKey: readonly unknown[];
  /** Page fetcher — offset/limit in, contract QueryResult<PostPage> out. */
  queryFn: (offset: number, limit: number) => Promise<QueryResult<PostPage>>;
  emptyTitle: string;
  emptyBody: string;
  onAuthorClick?: (profileId: FixedSizeBinary<32>) => void;
}

/**
 * Shared infinite-scroll post list. The only difference between the global
 * feed, a profile's timeline, and a reply thread is the `queryFn` — which
 * ultimately just varies which parent/author is queried from @polkadot/threads.
 */
export function PostFeed({
  queryKey,
  queryFn,
  emptyTitle,
  emptyBody,
  onAuthorClick,
}: PostFeedProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isPending,
    isError,
  } = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => queryFn(pageParam, PAGE),
    getNextPageParam: last =>
      last.success && !last.value.done ? last.value.next_offset : undefined,
  });

  const posts: Post[] = data?.pages.flatMap(p => (p.success ? p.value.posts : [])) ?? [];

  const sentinelRef = useIntersectionObserver(
    () => {
      if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  if (isPending) {
    return <div className="feed-spinner">Loading…</div>;
  }

  if (isError) {
    return (
      <div className="feed-empty">
        <h3>Couldn't load posts.</h3>
        <p>Try refreshing.</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="feed-empty">
        <h3>{emptyTitle}</h3>
        <p>{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="feed">
      {posts.map(post => (
        <PostCard key={toHex(post.post_id)} post={post} onAuthorClick={onAuthorClick} />
      ))}
      {isFetching && <div className="feed-spinner">Loading…</div>}
      {hasNextPage && <div ref={sentinelRef} className="sentinel" />}
    </div>
  );
}
