#![no_main]
#![no_std]

use alloc::string::String;
use common::{generate_id, revert, ContextId, EntityId};
use parity_scale_codec::{Decode, Encode};
use pvm::storage::Mapping;
use pvm::{caller, Address};
use pvm_contract as pvm;

cdm::import!("@polkadot/contexts");

/// On-chain post record (SCALE-encoded in storage).
#[derive(Default, Clone, Encode, Decode)]
pub struct PostData {
    pub author: Address,
    pub content_uri: String,
    pub timestamp: u64,
}

/// ABI-facing view of a post (Solidity-encoded in returns).
#[derive(Default, pvm::SolAbi)]
pub struct Post {
    pub author: Address,
    pub content_uri: String,
    pub timestamp: u64,
}

#[pvm::storage]
struct Storage {
    // --- Context ---
    context_id: ContextId,

    // --- Global feed index ---
    post_count: u32,
    post_at: Mapping<u32, EntityId>,

    // --- Per-author index (My Posts) ---
    author_post_count: Mapping<[u8; 20], u32>,
    author_post_at: Mapping<([u8; 20], u32), EntityId>,

    // --- Post data ---
    info: Mapping<EntityId, PostData>,

    // --- Admin ---
    sudo: Address,
}

#[pvm::contract(cdm = "@example/tw33d3r-posts")]
mod tw33d3r_posts {
    use super::*;

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
    /// Index slots are left in place; `get_post` for a deleted id returns None.
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

    // --- Per-author queries (My Posts) ---

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

    // --- Post data queries ---

    #[pvm::method]
    pub fn get_post(post_id: EntityId) -> Option<Post> {
        Storage::info().get(&post_id).map(|p| Post {
            author: p.author,
            content_uri: p.content_uri,
            timestamp: p.timestamp,
        })
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
