# tw33d3r

A minimal Twitter-like feed on Polkadot. Posts are indexed on-chain by the `@example/tw33d3r-posts` contract on Paseo; post content lives on Bulletin. The UI has two views:

- **Feed** — auto-scrolling global feed (reverse chronological), paginated from the contract's global post index.
- **My Posts** — your posts only, paginated from the per-author index.

Both views mirror the indexing/query patterns from [`paritytech/playground-app`](https://github.com/paritytech/playground-app).

## Development

```bash
pnpm install
pnpm dev
```

## Build & Deploy

```bash
pnpm build              # TypeScript compile + Vite build → dist/
pnpm build:contracts    # Build PVM contracts via CDM
pnpm deploy             # Deploy contracts to Paseo
pnpm deploy:frontend    # Deploy dist/ to tw33d3r.dot via Bulletin
```

Rust contracts require nightly toolchain (configured in `rust-toolchain.toml`).

## Contract

`@example/tw33d3r-posts` stores:

- `post_count` + `post_at(idx) -> EntityId` — global feed index
- `author_post_count(addr)` + `author_post_at(addr, idx) -> EntityId` — per-author index
- `info(post_id) -> PostData { author, content_uri, timestamp }` — post record

Post IDs are `EntityId` (`[u8; 32]`) from the `common` crate, generated deterministically from the global nonce via `generate_id`. The contract registers a `ContextId` with `@polkadot/contexts` in its constructor so it can later integrate with context-scoped system contracts (reputation, disputes).

## Stack

- React 19 + TypeScript + Vite
- `@polkadot-apps/*` for chain client, contracts, bulletin, signer
- Rust / PolkaVM smart contract (built with `cargo-pvm-contract`, managed via `cdm`)
