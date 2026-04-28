import { FixedSizeBinary } from "polkadot-api";

/**
 * 0x0000…0000 — the conventional "global feed" parent id.
 *
 * Threads is agnostic about what a parent means; the client convention is
 * that the all-zeros id is the app's single public feed. Later we'll add
 * curated feeds owned by profiles and treat those as additional parents.
 */
export const GLOBAL_FEED: FixedSizeBinary<32> = FixedSizeBinary.fromBytes(new Uint8Array(32));

/** Page size for every paginated query. Contract caps at 100. */
export const PAGE = 20;

/** Max characters per post, client-side gate. */
export const MAX_LEN = 280;
