"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { PostComposer } from "../../../components/post-composer";
import { getAuthenticatedUser, getSupabaseAccessToken } from "../../../lib/supabase-auth";
import { getFeedPosts } from "../../../lib/social-data";
import { createPostReport } from "../../../lib/supabase-rest";
import { SocialPost } from "../../../lib/social-types";

export default function FeedPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      const loaded = await getFeedPosts();
      if (isMounted) {
        setPosts(loaded);
      }
    }

    loadPosts();
    const timer = window.setInterval(loadPosts, 8000);
    const handlePostCreated = () => loadPosts();
    const handleOptimisticPost = (event: Event) => {
      const optimistic = (event as CustomEvent<SocialPost>).detail;
      if (!optimistic) {
        return;
      }
      setPosts((previous) => [optimistic, ...previous.filter((post) => !post.id.startsWith("tmp-"))]);
    };
    const handleRollback = () => {
      setPosts((previous) => previous.filter((post) => !post.id.startsWith("tmp-")));
    };
    window.addEventListener("vibe:post-created", handlePostCreated);
    window.addEventListener("vibe:post-optimistic", handleOptimisticPost);
    window.addEventListener("vibe:post-rollback", handleRollback);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
      window.removeEventListener("vibe:post-created", handlePostCreated);
      window.removeEventListener("vibe:post-optimistic", handleOptimisticPost);
      window.removeEventListener("vibe:post-rollback", handleRollback);
    };
  }, []);

  const hasPosts = useMemo(() => posts.length > 0, [posts.length]);

  async function handleReport(postId: string) {
    if (reportingPostId) return;
    setReportMessage(null);
    setReportingPostId(postId);

    const authUser = await getAuthenticatedUser();
    const reporterId = authUser?.id;
    const token = getSupabaseAccessToken();
    if (!reporterId || !token) {
      setReportMessage("Sign in required to report posts.");
      setReportingPostId(null);
      return;
    }

    const ok = await createPostReport({
      postId,
      reporterId,
      reason: "Community report from feed",
      accessToken: token
    });

    setReportMessage(ok ? "Report submitted." : "Report failed.");
    setReportingPostId(null);
    setTimeout(() => setReportMessage(null), 2000);
  }

  return (
    <section className="space-y-4">
      <motion.header
        className="vibe-card relative overflow-hidden p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
      >
        <div className="absolute -right-8 -top-16 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-14 h-44 w-44 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="relative">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Vibe Feed</h1>
          <p className="mt-1 text-sm text-slate-300">Dark glass, real-time social energy.</p>
        </div>
      </motion.header>

      <PostComposer />

      <div className="space-y-3">
        {hasPosts ? (
          <AnimatePresence initial={false}>
            {posts.map((post) => (
              <motion.article
                key={post.id}
                className="vibe-card p-4"
                layout
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-100">{post.authorName}</h2>
                  <time className="text-xs text-slate-400">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </time>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-200">{post.body}</p>
                <div
                  className={`mt-3 h-2 w-full rounded-full bg-gradient-to-r ${post.vibeColor}`}
                  aria-hidden
                />
                <div className="mt-2 flex justify-end">
                  <button
                    className="h-8 rounded-lg border border-amber-300/40 bg-amber-500/10 px-2 text-[11px] text-amber-200"
                    onClick={() => handleReport(post.id)}
                    disabled={reportingPostId === post.id}
                  >
                    {reportingPostId === post.id ? "Reporting..." : "Report"}
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        ) : (
          <article className="vibe-card p-4 text-sm text-slate-300">
            No posts yet. Be the first to post a vibe.
          </article>
        )}
      </div>
      {reportMessage ? (
        <article className="vibe-card p-3 text-center text-xs text-cyan-100">{reportMessage}</article>
      ) : null}
    </section>
  );
}
