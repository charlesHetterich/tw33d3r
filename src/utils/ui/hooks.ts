import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FixedSizeBinary, HexString } from "polkadot-api";
import {
  fetchJson,
  gateway,
  getContextId,
  getProfileInfo,
  getProfilesPage,
  toHex,
} from "../chain";
import type { PostContent, ProfileMetadata } from "../types";

// ─────────────────────────────────────────────────────────────
// DOM
// ─────────────────────────────────────────────────────────────

export function useIntersectionObserver(
  onIntersect: () => void,
  enabled: boolean,
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onIntersect(); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect, enabled]);

  return ref;
}

// ─────────────────────────────────────────────────────────────
// Chain queries — shared react-query hooks. All are cache-heavy
// because the underlying data is either immutable (CID-addressed
// blobs) or changes rarely (profile metadata, context id).
// ─────────────────────────────────────────────────────────────

/** Fetch + cache the tw33d3r app context id (immutable per deployment). */
export function useContextId() {
  return useQuery({
    queryKey: ["context-id"],
    queryFn: getContextId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/** Full profile record for a given profile id. */
export function useProfileInfo(profileId: FixedSizeBinary<32> | undefined) {
  const { data: contextId } = useContextId();
  const idHex = profileId ? toHex(profileId) : undefined;
  const ctxHex = contextId ? toHex(contextId) : undefined;
  return useQuery({
    queryKey: ["profile-info", ctxHex, idHex],
    queryFn: async () => {
      const res = await getProfileInfo(contextId!, profileId!);
      if (!res.success || !res.value.isSome) return null;
      return res.value.value;
    },
    enabled: !!contextId && !!profileId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch + parse a Bulletin JSON blob by CID. Content-addressed → cached forever. */
export function useBulletinJson<T>(contentUri: string | undefined) {
  return useQuery({
    queryKey: ["bulletin-json", contentUri],
    queryFn: () => fetchJson<T>(contentUri!, gateway),
    enabled: !!contentUri,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 2,
  });
}

/** Convenience: resolve a profile id to its metadata JSON. */
export function useProfileMetadata(profileId: FixedSizeBinary<32> | undefined) {
  const { data: info } = useProfileInfo(profileId);
  return useBulletinJson<ProfileMetadata>(info?.metadata_uri);
}

/** Fetch + parse a post's content JSON by its content_uri. */
export function usePostContent(contentUri: string | undefined) {
  return useBulletinJson<PostContent>(contentUri);
}

/** Paginated list of profiles owned by `address`. First page only for now. */
export function useMyProfiles(address: HexString | string | undefined) {
  const { data: contextId } = useContextId();
  const ctxHex = contextId ? toHex(contextId) : undefined;
  return useQuery({
    queryKey: ["my-profiles", ctxHex, address],
    queryFn: async () => {
      const res = await getProfilesPage(contextId!, address!, 0, 100);
      return res.success ? res.value.profiles : [];
    },
    enabled: !!contextId && !!address,
    staleTime: 30_000,
  });
}
