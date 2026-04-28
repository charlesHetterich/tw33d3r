import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SignerState } from "@polkadot-apps/signer";
import type { FixedSizeBinary } from "polkadot-api";
import {
  BulletinUploadError,
  GLOBAL_FEED,
  MAX_LEN,
  computeCid,
  publishPost,
  toHex,
  uploadBytes,
} from "../../chain";
import type { PostContent } from "../../types";
import { useMyProfiles } from "../hooks";
import { Avatar } from "./Avatar";
import { CreateProfileModal } from "./CreateProfileModal";

export interface ComposerHandle {
  focus: () => void;
}

interface ComposerProps {
  account: NonNullable<SignerState["selectedAccount"]>;
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { account },
  ref,
) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "posting" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: profiles, isPending: profilesPending } = useMyProfiles(account.h160Address);

  // For now we always post as the user's first profile. A picker UI will
  // plug in here once we support multi-profile switching.
  const activeProfile = profiles?.[0];
  const activeProfileId: FixedSizeBinary<32> | undefined = activeProfile?.profile_id;

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  }));

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || status === "posting" || !activeProfileId) return;

    setStatus("posting");
    try {
      const content: PostContent = { text: trimmed };
      const bytes = new TextEncoder().encode(JSON.stringify(content));
      const cid = computeCid(bytes);

      setStatusMsg("Uploading to Bulletin…");
      await uploadBytes(bytes, "post");

      setStatusMsg("Waiting for signature…");
      const res = await publishPost(activeProfileId, [GLOBAL_FEED], cid);
      if (!res.ok) throw new Error("Post transaction rejected");

      setText("");
      setStatus("idle");
      setStatusMsg("");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (err: unknown) {
      setStatus("error");
      setStatusMsg(friendlyError(err));
    }
  };

  // No profile yet — show CTA instead of composer.
  if (!profilesPending && (!profiles || profiles.length === 0)) {
    return (
      <div className="composer-empty">
        <span className="composer-empty-msg">You need a profile to post.</span>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateProfile(true)}
          type="button"
        >
          Create profile
        </button>
        {showCreateProfile && (
          <CreateProfileModal
            account={account}
            onClose={() => setShowCreateProfile(false)}
          />
        )}
      </div>
    );
  }

  const len = text.length;
  const disabled = !text.trim() || status === "posting" || len > MAX_LEN || !activeProfileId;
  const posting = status === "posting";
  const seed = activeProfileId ? toHex(activeProfileId) : account.h160Address;

  return (
    <div className="composer">
      <Avatar seed={seed} size={40} />
      <div className="composer-main">
        <textarea
          ref={textareaRef}
          className="composer-input"
          placeholder="What's happening?"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={1}
        />
        <div className="composer-actions">
          <div className="composer-meta">
            {status === "error" && <span className="composer-error">{statusMsg}</span>}
            {posting && <span className="composer-status">{statusMsg}</span>}
            <span className={`char-count${len > MAX_LEN ? " over" : ""}${len > 0 ? " active" : ""}`}>
              {MAX_LEN - len}
            </span>
          </div>
          <button
            className="btn btn-primary btn-post"
            onClick={submit}
            disabled={disabled}
            type="button"
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
});

function friendlyError(err: unknown): string {
  if (err instanceof BulletinUploadError) {
    return `${err.message}. Make sure your account is authorized on Bulletin.`;
  }
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return "Something went wrong"; }
}
