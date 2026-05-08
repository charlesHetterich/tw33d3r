import { useEffect, useRef, useState } from "react";
import type { FixedSizeBinary } from "polkadot-api";
import type { Profile } from "../../chain";
import { toHex } from "../../chain";
import { useDebouncedValue, useIntersectionObserver, useProfileSearch } from "../hooks";
import { SearchIcon } from "./Icons";
import { ProfileSearchRow } from "./ProfileSearchRow";

interface Props {
  /** Open the full-page results view for `query`. */
  onSubmit: (query: string) => void;
  /** Open a profile from a clicked dropdown row. */
  onPickProfile: (profileId: FixedSizeBinary<32>) => void;
  /** When the parent navigates away from search, drive the input from outside. */
  externalQuery?: string;
}

/**
 * Search input + mid-typing dropdown.
 *
 * - Typing schedules a search for 1s after the last keystroke (debounced).
 * - The dropdown shows a paged list of matching profiles, with the same
 *   query-key as the full results page → they share cache and scroll
 *   position.
 * - Enter submits → parent navigates to the full page; clicking a row picks
 *   that profile.
 * - Click-outside or Escape closes the dropdown.
 */
export function SearchBox({ onSubmit, onPickProfile, externalQuery }: Props) {
  const [query, setQuery] = useState(externalQuery ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLFormElement>(null);
  const debounced = useDebouncedValue(query, 1000);

  // Sync controlled query when the parent's view changes (e.g. user clicked
  // back to home, then opened search again).
  useEffect(() => {
    if (externalQuery !== undefined) setQuery(externalQuery);
  }, [externalQuery]);

  // Click-outside handler.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    onSubmit(q);
  };

  const handlePick = (id: FixedSizeBinary<32>) => {
    setOpen(false);
    onPickProfile(id);
  };

  return (
    <form ref={containerRef} className="search-box" onSubmit={handleSubmit} role="search">
      <span className="search-icon"><SearchIcon /></span>
      <input
        className="search-input"
        type="search"
        placeholder="Search profiles"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={e => {
          if (e.key === "Escape") {
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
        autoComplete="off"
        spellCheck={false}
      />
      {open && debounced.trim().length > 0 && (
        <SearchDropdown query={debounced} liveQuery={query} onPick={handlePick} onSeeAll={() => {
          setOpen(false);
          onSubmit(query.trim());
        }} />
      )}
    </form>
  );
}

interface DropdownProps {
  /** The (debounced) prefix actually being searched. */
  query: string;
  /** What's currently in the input — drives the "still typing…" placeholder. */
  liveQuery: string;
  onPick: (profileId: FixedSizeBinary<32>) => void;
  onSeeAll: () => void;
}

function SearchDropdown({ query, liveQuery, onPick, onSeeAll }: DropdownProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isPending,
  } = useProfileSearch(query);

  const sentinelRef = useIntersectionObserver(
    () => {
      if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  // While the user is still typing (live ≠ debounced), we may not yet have
  // results for the new prefix — show the existing ones but mark the panel
  // as stale so the spinner reads correctly.
  const stillTyping = query !== liveQuery.trim();
  const profiles: Profile[] =
    data?.pages.flatMap(p => (p.success ? p.value.profiles : [])) ?? [];

  return (
    <div className="search-dropdown" role="listbox">
      {isPending && (
        <div className="search-empty">{stillTyping ? "Still typing…" : "Searching…"}</div>
      )}
      {!isPending && profiles.length === 0 && (
        <div className="search-empty">No profiles match "{query}".</div>
      )}
      {profiles.map(p => (
        <ProfileSearchRow
          key={toHex(p.profile_id)}
          profile={p}
          variant="dropdown"
          onSelect={onPick}
        />
      ))}
      {isFetching && profiles.length > 0 && (
        <div className="search-empty">Loading…</div>
      )}
      {hasNextPage && <div ref={sentinelRef} className="sentinel" />}
      {profiles.length > 0 && (
        <button className="search-see-all" type="button" onClick={onSeeAll}>
          See all results for "{query}"
        </button>
      )}
    </div>
  );
}
