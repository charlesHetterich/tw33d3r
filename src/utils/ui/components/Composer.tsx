import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { SignerState } from "@polkadot-apps/signer";
import { computeCid } from "@polkadot-apps/bulletin";
import { MAX_LEN, getBulletinClient, postsReady } from "../../chain";
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
    setStatusMsg("Preparing…");
    try {
      const content: PostContent = { text: trimmed };
      const bytes = new TextEncoder().encode(JSON.stringify(content));
      const cid = computeCid(bytes);

      setStatusMsg("Uploading & posting…");
      const contract = await postsReady;

      const bulletinPromise = (async () => {
        const client = await getBulletinClient();
        await client.batchUpload([{ data: bytes, label: "post" }], undefined);
      })();

      const postPromise = (async () => {
        const result = await contract.post.tx(cid);
        if (!result.ok) throw new Error("Post transaction failed");
      })();

      const results = await Promise.allSettled([bulletinPromise, postPromise]);
      const failures = results.filter(r => r.status === "rejected") as PromiseRejectedResult[];
      if (failures.length) throw failures[0].reason;

      setText("");
      setStatus("idle");
      setStatusMsg("");
      onPosted();
    } catch (err: unknown) {
      setStatus("error");
      setStatusMsg(err instanceof Error ? err.message : "Something went wrong");
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
