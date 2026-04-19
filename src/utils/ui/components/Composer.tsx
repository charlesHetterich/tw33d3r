import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { SignerState } from "@polkadot-apps/signer";
import {
  BulletinUploadError,
  MAX_LEN,
  computeCid,
  publishPost,
  uploadBytes,
} from "../../chain";
import type { PostContent } from "../../types";
import { Avatar } from "./Avatar";

export interface ComposerHandle {
  focus: () => void;
}

interface ComposerProps {
  account: NonNullable<SignerState["selectedAccount"]>;
  onPosted: () => void;
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { account, onPosted },
  ref,
) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "posting" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  }));

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || status === "posting") return;

    setStatus("posting");
    try {
      const content: PostContent = { text: trimmed };
      const bytes = new TextEncoder().encode(JSON.stringify(content));
      const cid = computeCid(bytes);

      // Serialize, don't parallelize. Parallel caused "Invalid/Stale" + a
      // dangling "Transport is disposed" on the second post: both txs raced
      // on the account's nonce, one lost, and the other's transport was
      // already torn down by then. Upload first (fast, host preimage), then
      // submit the on-chain post — if the user cancels the mobile sign, the
      // bulletin entry is orphaned but nothing is broken on-chain.
      setStatusMsg("Uploading to Bulletin…");
      await uploadBytes(bytes, "post");

      setStatusMsg("Waiting for signature…");
      const res = await publishPost(cid);
      if (!res.ok) throw new Error("Post transaction rejected");

      setText("");
      setStatus("idle");
      setStatusMsg("");
      onPosted();
    } catch (err: unknown) {
      setStatus("error");
      setStatusMsg(friendlyError(err));
    }
  };

  const len = text.length;
  const disabled = !text.trim() || status === "posting" || len > MAX_LEN;
  const posting = status === "posting";

  return (
    <div className="composer">
      <Avatar address={account.h160Address} size={40} />
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
