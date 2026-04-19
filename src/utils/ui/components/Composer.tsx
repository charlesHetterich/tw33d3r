import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { SignerState } from "@polkadot-apps/signer";
import { useQueryClient } from "@tanstack/react-query";
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
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { account },
  ref,
) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "posting" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

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

      // Serialize: upload then on-chain tx. Parallel caused nonce races
      // ("Invalid/Stale" + "Transport is disposed" on the second post).
      setStatusMsg("Uploading to Bulletin…");
      await uploadBytes(bytes, "post");

      setStatusMsg("Waiting for signature…");
      const res = await publishPost(cid);
      if (!res.ok) throw new Error("Post transaction rejected");

      setText("");
      setStatus("idle");
      setStatusMsg("");
      // Invalidate any open post feeds — the global feed *and* the author's
      // own timeline. React-query refetches only the queries that are
      // actively observed, so this is cheap even when many feed queries
      // exist in the cache.
      queryClient.invalidateQueries({ queryKey: ["posts"] });
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
