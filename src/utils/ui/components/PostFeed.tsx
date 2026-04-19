import { useInfiniteQuery } from "@tanstack/react-query";
import { PAGE, type Post, type PostPage, type QueryResult, toHex } from "../../chain";
import { useIntersectionObserver } from "../hooks";
import { PostCard } from "./PostCard";

interface PostFeedProps {
  /** Unique key identifying this feed — react-query caches pages under it. */
  queryKey: readonly unknown[];
  /** How to fetch a page. Takes offset/limit, returns a paginated contract result. */
  queryFn: (offset: number, limit: number) => Promise<QueryResult<PostPage>>;
  emptyTitle: string;
  emptyBody: string;
  onAuthorClick?: (address: string) => void;
}

/**
 * Shared infinite-scroll post list — the only difference between the global
 * feed, "my posts", and a profile timeline is the page source, so they
 * collapse into one component parameterized by `queryFn` + `queryKey`.
 *
 * React-query handles cancellation, page caching, stale-while-revalidate,
 * StrictMode double-invoke, and dedupe by query key — none of the manual
 * generation/ref bookkeeping the previous hand-rolled version needed.
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
