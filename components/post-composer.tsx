"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";

import { submitPost } from "@/lib/social-data";

export function PostComposer() {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const body = text.trim();
    if (!body) {
      setStatus("Write something first.");
      setIsSubmitting(false);
      return;
    }

    const optimisticPost = {
      id: `tmp-${Date.now()}`,
      userId: process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "user-1",
      authorName: "You",
      body,
      createdAt: new Date().toISOString(),
      vibeColor: "from-fuchsia-500/30 to-cyan-400/10",
      optimistic: true
    };

    window.dispatchEvent(
      new CustomEvent("vibe:post-optimistic", {
        detail: optimisticPost
      })
    );

    const result = await submitPost(body);
    if (result.ok) {
      setText("");
      setStatus("Posted.");
      setToast("New vibe posted");
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
      }
      window.dispatchEvent(new Event("vibe:post-created"));
    } else if (result.reason === "empty") {
      setStatus("Write something first.");
      setToast("Add text before posting");
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(8);
      }
    } else {
      setStatus("Could not post right now.");
      setToast("Post failed - check connection");
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([10, 40, 10]);
      }
      window.dispatchEvent(new Event("vibe:post-rollback"));
    }

    setIsSubmitting(false);
    setTimeout(() => setToast(null), 2200);
  }

  return (
    <form className="vibe-card p-4" onSubmit={handleSubmit}>
      <label className="mb-2 block text-sm text-slate-300" htmlFor="post-body">
        Drop your vibe
      </label>
      <textarea
        id="post-body"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="composer-input min-h-24 w-full rounded-2xl border border-white/15 bg-slate-950/55 p-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/25"
        placeholder="What are you building today?"
      />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-400">{status ?? `${text.length}/240`}</p>
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 520, damping: 30 }}
          className="h-11 min-w-28 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-900/35 transition hover:brightness-105 disabled:opacity-70"
        >
          {isSubmitting ? "Posting..." : "Post vibe"}
        </motion.button>
      </div>
      {toast ? (
        <div className="mt-3 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
          {toast}
        </div>
      ) : null}
    </form>
  );
}
