import type { FixedSizeBinary, HexString } from "polkadot-api";
import { profilesReady } from "./app";
import type { QueryResult } from "./threads";

// ─────────────────────────────────────────────────────────────
// @polkadot/profiles — read-side surface used by the frontend.
// (Writes go through the `createProfile`/`updateProfile` app facade in app.ts.)
// ─────────────────────────────────────────────────────────────

export interface Profile {
  profile_id: FixedSizeBinary<32>;
  owner: HexString;
  metadata_uri: string;
}

export interface ProfilePage {
  profiles: Profile[];
  next_offset: number;
  done: boolean;
}

/** Full profile record (owner + metadata_uri) for a given profile id. */
export async function getProfileInfo(
  contextId: FixedSizeBinary<32>,
  profileId: FixedSizeBinary<32>,
): Promise<QueryResult<{ isSome: boolean; value: Profile }>> {
  const profiles = await profilesReady;
  return (profiles as any).getProfileInfo.query(contextId, profileId);
}

/** Cheap owner lookup — returns the owner address (zero if profile doesn't exist). */
export async function getProfileOwner(
  contextId: FixedSizeBinary<32>,
  profileId: FixedSizeBinary<32>,
): Promise<QueryResult<HexString>> {
  const profiles = await profilesReady;
  return (profiles as any).getProfileOwner.query(contextId, profileId);
}

/** How many profiles `owner` controls (within this context). */
export async function getProfileCount(
  contextId: FixedSizeBinary<32>,
  owner: HexString | string,
): Promise<QueryResult<number>> {
  const profiles = await profilesReady;
  return (profiles as any).getProfileCount.query(contextId, owner);
}

/** Paginated listing of `owner`'s profiles, newest-first. */
export async function getProfilesPage(
  contextId: FixedSizeBinary<32>,
  owner: HexString | string,
  offset: number,
  limit: number,
): Promise<QueryResult<ProfilePage>> {
  const profiles = await profilesReady;
  return (profiles as any).getProfilesPage.query(contextId, owner, offset, limit);
}
