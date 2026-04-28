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

/**
 * First-run flow. User has no profile → this inline modal uploads their
 * metadata to Bulletin and calls `tw33d3r.create_profile(cid)`. On success
 * it invalidates `my-profiles` so the Composer re-renders with a usable
 * profile.
 */
export function CreateProfileModal({ account, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const queryClient = useQueryClient();

  const submit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || status === "working") return;
    setStatus("working");
    try {
      const metadata: ProfileMetadata = {
        name: trimmedName,
        bio: bio.trim() || undefined,
      };
      const bytes = new TextEncoder().encode(JSON.stringify(metadata));
      const cid = computeCid(bytes);

      setStatusMsg("Uploading profile…");
      await uploadBytes(bytes, "profile");

      setStatusMsg("Waiting for signature…");
      const tx = await createProfile(cid);
      if (!tx.ok) throw new Error("Create-profile transaction rejected");

      queryClient.invalidateQueries({ queryKey: ["my-profiles"] });
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      setStatus("error");
      setStatusMsg(friendlyError(err));
    }
  };

  const disabled = !name.trim() || status === "working";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Create your profile</h2>
        <p className="modal-sub">
          Posts are attributed to a profile, not your wallet directly. One wallet can own many.
        </p>

        <label className="form-label">
          Display name
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. alice"
            maxLength={64}
            autoFocus
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
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return "Something went wrong"; }
}
