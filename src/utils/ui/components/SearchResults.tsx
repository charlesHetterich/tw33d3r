import type { FixedSizeBinary } from "polkadot-api";
import type { Profile } from "../../chain";
import { toHex } from "../../chain";
import { useIntersectionObserver, useProfileSearch } from "../hooks";
import { ProfileSearchRow } from "./ProfileSearchRow";

interface Props {
  query: string;
  onPickProfile: (profileId: FixedSizeBinary<32>) => void;
}

/**
 * Full-page search results. Same `useProfileSearch(query)` hook as the
 * dropdown → results and pagination state are shared via react-query cache,
 * so the page is instant after submitting from the dropdown.
 */
export function SearchResults({ query, onPickProfile }: Props) {
  const trimmed = query.trim();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isPending,
    isError,
  } = useProfileSearch(trimmed);

  const sentinelRef = useIntersectionObserver(
    () => {
      if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  if (!trimmed) {
    return (
      <div className="feed-empty">
        <h3>Search profiles</h3>
        <p>Type a username to find someone.</p>
      </div>
    );
  }

  if (isPending) return <div className="feed-spinner">Searching…</div>;
  if (isError) {
    return (
      <div className="feed-empty">
        <h3>Couldn't search.</h3>
        <p>Try again.</p>
      </div>
    );
  }

  const profiles: Profile[] =
    data?.pages.flatMap(p => (p.success ? p.value.profiles : [])) ?? [];

  if (profiles.length === 0) {
    return (
      <div className="feed-empty">
        <h3>No profiles match "{trimmed}".</h3>
        <p>Try a shorter prefix.</p>
      </div>
    );
  }

  return (
    <div className="search-results">
      {profiles.map(p => (
        <ProfileSearchRow
          key={toHex(p.profile_id)}
          profile={p}
          variant="page"
          onSelect={onPickProfile}
        />
      ))}
      {isFetching && <div className="feed-spinner">Loading…</div>}
      {hasNextPage && <div ref={sentinelRef} className="sentinel" />}
    </div>
  );
}
