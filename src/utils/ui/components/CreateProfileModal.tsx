import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SignerState } from "@polkadot-apps/signer";
import {
  BulletinUploadError,
  computeCid,
  createProfile,
  uploadBytes,
} from "../../chain";
import type { ProfileMetadata } from "../../types";

interface Props {
  account: NonNullable<SignerState["selectedAccount"]>;
  onClose: () => void;
  onCreated?: () => void;
}

// Mirrors `MAX_USERNAME_LEN` in the profiles contract — picked so the
// on-chain username index node fits the 416-byte storage cap.
const MAX_USERNAME_LEN = 32;
// ASCII letters/digits/_/- only. Loose enough to match Twitter conventions
// but strict enough to keep usernames URL-safe and visually unambiguous.
const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;

/**
 * First-run flow. User has no profile → this inline modal collects a
 * username (on-chain, unique-per-context) plus an optional display name and
 * bio (off-chain Bulletin JSON), uploads metadata, and calls
 * `tw33d3r.create_profile(username, cid)`. On success it invalidates
 * `my-profiles` so the Composer re-renders with a usable profile.
 */
export function CreateProfileModal({ account, onClose, onCreated }: Props) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const queryClient = useQueryClient();

  const trimmedUsername = username.trim();
  const usernameInvalid =
    trimmedUsername.length > 0 && !USERNAME_RE.test(trimmedUsername);

  const submit = async () => {
    if (!trimmedUsername || status === "working") return;
    if (usernameInvalid) {
      setStatus("error");
      setStatusMsg("Username can only contain letters, digits, _ and -.");
      return;
    }
    setStatus("working");
    try {
      const metadata: ProfileMetadata = {
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
      };
      const bytes = new TextEncoder().encode(JSON.stringify(metadata));
      const cid = computeCid(bytes);

      setStatusMsg("Uploading profile…");
      await uploadBytes(bytes, "profile");

      setStatusMsg("Waiting for signature…");
      const tx = await createProfile(trimmedUsername, cid);
      if (!tx.ok) throw new Error("Create-profile transaction rejected");

      queryClient.invalidateQueries({ queryKey: ["my-profiles"] });
      // Username search caches are now stale (any prefix of the new name).
      queryClient.invalidateQueries({ queryKey: ["search-profiles"] });
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      setStatus("error");
      setStatusMsg(friendlyError(err));
    }
  };

  const disabled =
    !trimmedUsername || usernameInvalid || status === "working";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Create your profile</h2>
        <p className="modal-sub">
          Posts are attributed to a profile, not your wallet directly. One wallet can own many.
        </p>

        <label className="form-label">
          Username
          <input
            type="text"
            className="form-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="alice"
            maxLength={MAX_USERNAME_LEN}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <span className="form-hint">
            Unique handle, used as @{trimmedUsername || "username"}. Letters, digits, _ and -.
          </span>
        </label>

        <label className="form-label">
          Display name (optional)
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Alice"
            maxLength={64}
          />
        </label>

        <label className="form-label">
          Bio (optional)
          <textarea
            className="form-input"
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={2}
            maxLength={160}
            placeholder="Short bio…"
          />
        </label>

        <div className="modal-footer">
          <span className="modal-wallet">{account.name ?? shortHandle(account.address)}</span>
          <div className="modal-actions">
            {status !== "idle" && (
              <span className={status === "error" ? "modal-error" : "modal-status"}>
                {statusMsg}
              </span>
            )}
            <button className="btn" onClick={onClose} type="button">Cancel</button>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={disabled}
              type="button"
            >
              {status === "working" ? "Creating…" : "Create profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function shortHandle(addr: string): string {
  return addr.replace(/^0x/i, "").slice(-6).toLowerCase();
}

function friendlyError(err: unknown): string {
  if (err instanceof BulletinUploadError) {
    return `${err.message}. Make sure your account is authorized on Bulletin.`;
  }
  if (err instanceof Error) {
    if (/UsernameTaken/i.test(err.message)) return "That username is already taken.";
    if (/InvalidUsername/i.test(err.message)) return "Username is invalid (1-32 chars).";
    return err.message;
  }
  try { return JSON.stringify(err); } catch { return "Something went wrong"; }
}
