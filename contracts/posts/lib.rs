#![no_main]
#![no_std]

// Note: don't `use alloc::vec::Vec;` at outer scope — the `#[pvm::contract]`
// macro below emits one itself for the generated dispatch code around the
// module, and the two imports collide (E0252). `PostPage`'s field uses the
// fully-qualified `alloc::vec::Vec<Post>` so the outer scope doesn't need
// the import, and the module below imports Vec locally for its own use.
use alloc::string::String;
use common::{generate_id, revert, ContextId, EntityId};
use parity_scale_codec::{Decode, Encode};
use pvm::storage::Mapping;
use pvm::{caller, Address};
use pvm_contract as pvm;

cdm::import!("@polkadot/contexts");

const MAX_PAGE_LIMIT: u32 = 100;

/// On-chain post record (SCALE-encoded in storage).
#[derive(Default, Clone, Encode, Decode)]
pub struct PostData {
    pub author: Address,
    pub content_uri: String,
    pub timestamp: u64,
}

/// ABI-facing view of a post (Solidity-encoded in returns). Carries its own
/// id so a single call can fully describe a post for the client.
#[derive(Default, pvm::SolAbi)]
pub struct Post {
    pub post_id: EntityId,
    pub author: Address,
    pub content_uri: String,
    pub timestamp: u64,
}

/// Paginated response. `next_offset` is the offset to pass on the next
/// call to continue where this page left off — works correctly even if
/// slots were deleted (they get skipped but still advance the cursor).
/// `done` flips true when the cursor has walked off the end of the index.
#[derive(Default, pvm::SolAbi)]
pub struct PostPage {
    pub posts: alloc::vec::Vec<Post>,
    pub next_offset: u32,
    pub done: bool,
}

#[pvm::storage]
struct Storage {
    // --- Context ---
    context_id: ContextId,

    // --- Global feed index ---
    post_count: u32,
    post_at: Mapping<u32, EntityId>,

    // --- Per-author index ---
    author_post_count: Mapping<[u8; 20], u32>,
    author_post_at: Mapping<([u8; 20], u32), EntityId>,

    // --- Post data ---
    info: Mapping<EntityId, PostData>,

    // --- Admin ---
    sudo: Address,
}

/// Build a `Post` from an id and its stored record. Cheap enough to inline,
/// called from every page-getter once per post.
fn post_from(post_id: EntityId, data: PostData) -> Post {
    Post {
        post_id,
        author: data.author,
        content_uri: data.content_uri,
        timestamp: data.timestamp,
    }
}

#[pvm::contract(cdm = "@example/tw33d3r-posts")]
mod tw33d3r_posts {
    use super::{
        caller, contexts, generate_id, post_from, pvm, revert, Address, ContextId, EntityId,
        Post, PostData, PostPage, Storage, String, MAX_PAGE_LIMIT,
    };
    use alloc::vec::Vec;

    #[pvm::constructor]
    pub fn new() -> Result<(), Error> {
        let mut addr = [0u8; 20];
        pvm::api::address(&mut addr);
        let mut context_id: ContextId = [0u8; 32];
        context_id[..20].copy_from_slice(&addr);

        if let Err(_) = contexts::cdm_reference().register_context(context_id) {
            revert(b"RegisterContextFailed");
        }

        Storage::context_id().set(&context_id);
        Storage::sudo().set(&caller());

        Ok(())
    }

    /// Publish a new post. `content_uri` is a Bulletin/IPFS CID pointing to JSON like `{ "text": "..." }`.
    #[pvm::method]
    pub fn post(content_uri: String) -> EntityId {
        let caller = caller();
        let caller_bytes = *caller.as_fixed_bytes();

        // Deterministic post id from global nonce
        let count = Storage::post_count().get().unwrap_or(0);
        let post_id: EntityId = generate_id(count as u64);

        // Timestamp (seconds since epoch, first 8 bytes of the 32-byte LE buffer)
        let mut buf = [0u8; 32];
        pvm::api::now(&mut buf);
        let timestamp = u64::from_le_bytes(buf[0..8].try_into().unwrap_or([0u8; 8]));

        // Global index (append)
        Storage::post_at().insert(&count, &post_id);
        Storage::post_count().set(&(count + 1));

        // Per-author index (append)
        let ac = Storage::author_post_count().get(&caller_bytes).unwrap_or(0);
        Storage::author_post_at().insert(&(caller_bytes, ac), &post_id);
        Storage::author_post_count().insert(&caller_bytes, &(ac + 1));

        Storage::info().insert(
            &post_id,
            &PostData {
                author: caller,
                content_uri,
                timestamp,
            },
        );

        post_id
    }

    /// Delete a post. Caller must be the author or the sudo admin.
    /// Index slots are left in place; a deleted post is skipped by page getters.
    #[pvm::method]
    pub fn delete_post(post_id: EntityId) {
        let data = match Storage::info().get(&post_id) {
            Some(d) => d,
            None => revert(b"PostNotFound"),
        };

        let is_author = data.author == caller();
        let is_sudo = Storage::sudo().get().map_or(false, |s| s == caller());
        if !is_author && !is_sudo {
            revert(b"Unauthorized");
        }

        Storage::info().remove(&post_id);
    }

    // --- Context ---

    #[pvm::method]
    pub fn get_context_id() -> ContextId {
        Storage::context_id().get().unwrap_or([0u8; 32])
    }

    // --- Global queries (Feed) ---

    #[pvm::method]
    pub fn get_post_count() -> u32 {
        Storage::post_count().get().unwrap_or(0)
    }

    #[pvm::method]
    pub fn get_post_at(index: u32) -> Option<EntityId> {
        Storage::post_at().get(&index)
    }

    /// Batch-fetch a page of the global feed in reverse-chronological order.
    /// `offset` is counted from the newest post (0 = newest). `limit` is
    /// capped at `MAX_PAGE_LIMIT`. Deleted posts are skipped, but `next_offset`
    /// still advances over them so the client never loops.
    #[pvm::method]
    pub fn get_posts_page(offset: u32, limit: u32) -> PostPage {
        let total = Storage::post_count().get().unwrap_or(0);
        let cap = if limit > MAX_PAGE_LIMIT { MAX_PAGE_LIMIT } else { limit };

        if offset >= total || cap == 0 {
            return PostPage {
                posts: Vec::new(),
                next_offset: total,
                done: true,
            };
        }

        let mut posts: Vec<Post> = Vec::with_capacity(cap as usize);
        let mut scanned: u32 = 0;

        while posts.len() < cap as usize && offset + scanned < total {
            let idx = total - 1 - offset - scanned;
            scanned += 1;

            if let Some(post_id) = Storage::post_at().get(&idx) {
                if let Some(data) = Storage::info().get(&post_id) {
                    posts.push(post_from(post_id, data));
                }
            }
        }

        let next_offset = offset + scanned;
        let done = next_offset >= total;
        PostPage { posts, next_offset, done }
    }

    // --- Per-author queries ---

    #[pvm::method]
    pub fn get_author_post_count(author: Address) -> u32 {
        Storage::author_post_count()
            .get(author.as_fixed_bytes())
            .unwrap_or(0)
    }

    #[pvm::method]
    pub fn get_author_post_at(author: Address, index: u32) -> Option<EntityId> {
        Storage::author_post_at().get(&(*author.as_fixed_bytes(), index))
    }

    /// Batch-fetch a page of `author`'s posts in reverse-chronological order.
    /// Same semantics as `get_posts_page` but scoped to a single author.
    #[pvm::method]
    pub fn get_author_posts_page(author: Address, offset: u32, limit: u32) -> PostPage {
        let author_bytes = *author.as_fixed_bytes();
        let total = Storage::author_post_count().get(&author_bytes).unwrap_or(0);
        let cap = if limit > MAX_PAGE_LIMIT { MAX_PAGE_LIMIT } else { limit };

        if offset >= total || cap == 0 {
            return PostPage {
                posts: Vec::new(),
                next_offset: total,
                done: true,
            };
        }

        let mut posts: Vec<Post> = Vec::with_capacity(cap as usize);
        let mut scanned: u32 = 0;

        while posts.len() < cap as usize && offset + scanned < total {
            let idx = total - 1 - offset - scanned;
            scanned += 1;

            if let Some(post_id) = Storage::author_post_at().get(&(author_bytes, idx)) {
                if let Some(data) = Storage::info().get(&post_id) {
                    posts.push(post_from(post_id, data));
                }
            }
        }

        let next_offset = offset + scanned;
        let done = next_offset >= total;
        PostPage { posts, next_offset, done }
    }

    // --- Post data queries ---

    #[pvm::method]
    pub fn get_post(post_id: EntityId) -> Option<Post> {
        Storage::info().get(&post_id).map(|p| post_from(post_id, p))
    }

    // --- Admin queries ---

    #[pvm::method]
    pub fn get_sudo() -> Address {
        Storage::sudo().get().unwrap_or_default()
    }

    #[pvm::fallback]
    pub fn fallback() -> Result<(), Error> {
        revert(b"UnknownSelector");
    }
}
