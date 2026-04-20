#![no_main]
#![no_std]

// Slim application contract. Owns a context and delegates post/profile state
// to the generic `@polkadot/threads` and `@polkadot/profiles` system
// contracts. User-level auth ("caller must own the profile they're posting
// as") is enforced here; the system contracts only verify that the caller is
// the registered context owner (i.e. this contract).
//
// Note: no `use alloc::vec::Vec;` at outer scope — `#[pvm::contract]` emits
// its own for the generated dispatch and the two collide. `Vec<EntityId>`
// appears in the `post(...)` method signature; it's imported inside the
// module below instead.
use common::{ContextId, EntityId};
use pvm::Address;
use pvm_contract as pvm;

cdm::import!("@polkadot/contexts");
cdm::import!("@polkadot/profiles");
cdm::import!("@polkadot/threads");

#[pvm::storage]
struct Storage {
    context_id: ContextId,
    sudo: Address,
    // Cached references so every method call doesn't re-resolve.
    profiles: profiles::Reference,
    threads: threads::Reference,
}

#[pvm::contract(cdm = "@example/tw33d3r")]
mod tw33d3r {
    use super::{contexts, profiles, threads, pvm, Address, ContextId, EntityId, Storage};
    use alloc::string::String;
    use alloc::vec::Vec;
    use common::revert;
    use pvm::caller;

    #[pvm::constructor]
    pub fn new() -> Result<(), Error> {
        // Derive the context id from this contract's own address. The
        // `@polkadot/contexts` registry is first-come-first-served, so this
        // contract becomes the owner of that context.
        let mut addr = [0u8; 20];
        pvm::api::address(&mut addr);
        let mut context_id: ContextId = [0u8; 32];
        context_id[..20].copy_from_slice(&addr);

        if let Err(_) = contexts::cdm_reference().register_context(context_id) {
            revert(b"RegisterContextFailed");
        }

        Storage::context_id().set(&context_id);
        Storage::sudo().set(&caller());
        Storage::profiles().set(&profiles::cdm_reference());
        Storage::threads().set(&threads::cdm_reference());

        Ok(())
    }

    // --- Internal helpers ---

    fn require_context_id() -> ContextId {
        match Storage::context_id().get() {
            Some(id) => id,
            None => revert(b"ContextIdNotSet"),
        }
    }

    fn require_profiles() -> profiles::Reference {
        match Storage::profiles().get() {
            Some(r) => r,
            None => revert(b"ProfilesRefNotSet"),
        }
    }

    fn require_threads() -> threads::Reference {
        match Storage::threads().get() {
            Some(r) => r,
            None => revert(b"ThreadsRefNotSet"),
        }
    }

    /// Revert unless `caller()` is the registered owner of `profile_id`.
    /// A non-existent profile returns the zero address from `get_profile_owner`,
    /// which naturally fails this check (no one posts as the zero address).
    fn require_profile_owner(
        profiles: &profiles::Reference,
        context_id: ContextId,
        profile_id: EntityId,
    ) {
        let owner = match profiles.get_profile_owner(context_id, profile_id) {
            Ok(addr) => addr,
            Err(_) => revert(b"ProfilesCallFailed"),
        };
        if owner != caller() {
            revert(b"NotProfileOwner");
        }
    }

    // --- Profiles ---

    /// Create a new profile owned by the caller. One address may own many.
    /// `metadata_uri` may be empty.
    #[pvm::method]
    pub fn create_profile(metadata_uri: String) -> EntityId {
        let ctx = require_context_id();
        let profiles = require_profiles();
        match profiles.create_profile(ctx, caller(), metadata_uri) {
            Ok(id) => id,
            Err(_) => revert(b"CreateProfileFailed"),
        }
    }

    /// Update the metadata URI of a profile the caller owns.
    #[pvm::method]
    pub fn update_profile(profile_id: EntityId, metadata_uri: String) {
        let ctx = require_context_id();
        let profiles = require_profiles();
        require_profile_owner(&profiles, ctx, profile_id);
        if let Err(_) = profiles.update_profile(ctx, profile_id, metadata_uri) {
            revert(b"UpdateProfileFailed");
        }
    }

    // --- Posts ---

    /// Publish a post as `author` (a profile the caller owns) under every
    /// entry in `parents`. `parents` may be empty (author-only visibility);
    /// duplicate parents revert inside the threads contract.
    #[pvm::method]
    pub fn post(
        author: EntityId,
        parents: Vec<EntityId>,
        content_uri: String,
    ) -> EntityId {
        let ctx = require_context_id();
        let profiles = require_profiles();
        require_profile_owner(&profiles, ctx, author);

        let threads = require_threads();
        match threads.post(ctx, author, parents, content_uri) {
            Ok(id) => id,
            Err(_) => revert(b"PostFailed"),
        }
    }

    /// Delete a post. Caller must own the post's author profile, or be sudo.
    #[pvm::method]
    pub fn delete_post(post_id: EntityId) {
        let ctx = require_context_id();
        let threads = require_threads();

        let post = match threads.get_post(ctx, post_id) {
            Ok(Some(p)) => p,
            Ok(None) => revert(b"PostNotFound"),
            Err(_) => revert(b"ThreadsCallFailed"),
        };

        // Sudo bypass; otherwise the caller must own the author profile.
        let is_sudo = Storage::sudo().get().map_or(false, |s| s == caller());
        if !is_sudo {
            let profiles = require_profiles();
            require_profile_owner(&profiles, ctx, post.author);
        }

        if let Err(_) = threads.delete_post(ctx, post_id) {
            revert(b"DeletePostFailed");
        }
    }

    // --- Queries ---

    #[pvm::method]
    pub fn get_context_id() -> ContextId {
        Storage::context_id().get().unwrap_or([0u8; 32])
    }

    #[pvm::method]
    pub fn get_sudo() -> Address {
        Storage::sudo().get().unwrap_or_default()
    }

    #[pvm::fallback]
    pub fn fallback() -> Result<(), Error> {
        revert(b"UnknownSelector");
    }
}
