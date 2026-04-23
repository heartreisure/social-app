"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { getAuthenticatedUser, getSupabaseAccessToken } from "@/lib/supabase-auth";
import {
  fetchPostReports,
  fetchPostsForModeration,
  fetchUserProfiles,
  moderatePost,
  reviewPostReport
} from "@/lib/supabase-rest";

type AdminProfile = {
  id: string;
  display_name: string;
  handle: string;
  bio_short: string;
  role_label: string;
  created_at: string;
};

type AdminPost = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  moderation_status?: "active" | "flagged" | "hidden";
  flagged_reason?: string;
};

type AdminReport = {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function isAdmin(role: string | undefined) {
  const normalized = (role ?? "").toLowerCase();
  return normalized === "admin" || normalized === "moderator";
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [query, setQuery] = useState("");
  const [moderatorId, setModeratorId] = useState<string | null>(null);
  const [autoEscalating, setAutoEscalating] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const authUser = await getAuthenticatedUser();
      const roleLabel = authUser?.user_metadata?.role_label;
      const hasAccess = isAdmin(roleLabel);
      setModeratorId(authUser?.id ?? null);

      if (!mounted) return;
      setAllowed(hasAccess);

      if (!hasAccess) {
        setLoading(false);
        return;
      }

      const token = getSupabaseAccessToken();
      const [profileRows, postRows, reportRows] = await Promise.all([
        fetchUserProfiles(token),
        fetchPostsForModeration(120, token),
        fetchPostReports(token, "open")
      ]);

      if (!mounted) return;
      setProfiles((profileRows ?? []) as AdminProfile[]);
      setPosts((postRows ?? []) as AdminPost[]);
      setReports((reportRows ?? []) as AdminReport[]);
      setLoading(false);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  async function runModeration(postId: string, status: "flagged" | "hidden" | "active") {
    if (!moderatorId) return;
    const token = getSupabaseAccessToken();
    const ok = await moderatePost({
      postId,
      status,
      moderatorUserId: moderatorId,
      accessToken: token,
      reason: status === "flagged" ? "flagged by moderator" : ""
    });
    if (!ok) return;
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              moderation_status: status,
              flagged_reason: status === "flagged" ? "flagged by moderator" : ""
            }
          : post
      )
    );
  }

  async function reviewReport(reportId: string, status: "resolved" | "dismissed" | "open") {
    if (!moderatorId) return;
    const token = getSupabaseAccessToken();
    const ok = await reviewPostReport({
      reportId,
      status,
      reviewerId: moderatorId,
      accessToken: token
    });
    if (!ok) return;
    setReports((current) =>
      current.map((report) =>
        report.id === reportId
          ? {
              ...report,
              status,
              reviewed_by: moderatorId,
              reviewed_at: new Date().toISOString()
            }
          : report
      )
    );
  }

  const filteredPosts = useMemo(() => {
    if (!query.trim()) return posts;
    const q = query.toLowerCase();
    return posts.filter(
      (post) =>
        post.body.toLowerCase().includes(q) ||
        profiles.find((profile) => profile.id === post.user_id)?.handle.toLowerCase().includes(q)
    );
  }, [posts, profiles, query]);

  const prioritizedReports = useMemo(() => {
    const grouped = new Map<
      string,
      { postId: string; count: number; latestAt: string; reports: AdminReport[] }
    >();

    for (const report of reports) {
      const current = grouped.get(report.post_id);
      if (!current) {
        grouped.set(report.post_id, {
          postId: report.post_id,
          count: 1,
          latestAt: report.created_at,
          reports: [report]
        });
        continue;
      }
      current.count += 1;
      current.reports.push(report);
      if (+new Date(report.created_at) > +new Date(current.latestAt)) {
        current.latestAt = report.created_at;
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return +new Date(b.latestAt) - +new Date(a.latestAt);
    });
  }, [reports]);

  function severityFromCount(count: number) {
    if (count >= 5) return { label: "critical", classes: "text-rose-200 bg-rose-500/15 border-rose-300/40" };
    if (count >= 3) return { label: "high", classes: "text-amber-200 bg-amber-500/15 border-amber-300/40" };
    return { label: "normal", classes: "text-cyan-200 bg-cyan-500/15 border-cyan-300/40" };
  }

  useEffect(() => {
    if (!allowed || !moderatorId || autoEscalating) return;

    const criticalOpenEntries = prioritizedReports.filter((entry) => {
      const openCount = entry.reports.filter((report) => report.status === "open").length;
      const post = posts.find((item) => item.id === entry.postId);
      return openCount >= 5 && post?.moderation_status !== "flagged" && post?.moderation_status !== "hidden";
    });

    if (!criticalOpenEntries.length) return;

    setAutoEscalating(true);
    const token = getSupabaseAccessToken();

    void Promise.all(
      criticalOpenEntries.map((entry) =>
        moderatePost({
          postId: entry.postId,
          status: "flagged",
          moderatorUserId: moderatorId,
          accessToken: token,
          reason: "auto-flagged: critical report volume"
        })
      )
    ).then((results) => {
      const successfulIds = criticalOpenEntries
        .filter((_, index) => results[index])
        .map((entry) => entry.postId);

      if (successfulIds.length) {
        setPosts((current) =>
          current.map((post) =>
            successfulIds.includes(post.id)
              ? {
                  ...post,
                  moderation_status: "flagged",
                  flagged_reason: "auto-flagged: critical report volume"
                }
              : post
          )
        );
      }
      setAutoEscalating(false);
    });
  }, [allowed, autoEscalating, moderatorId, posts, prioritizedReports]);

  if (loading) {
    return (
      <section className="space-y-4">
        <article className="vibe-card p-4 text-sm text-slate-300">Loading moderation panel...</article>
      </section>
    );
  }

  if (!allowed) {
    return (
      <section className="space-y-4">
        <article className="vibe-card p-5">
          <h1 className="text-xl font-semibold text-slate-100">Admin only</h1>
          <p className="mt-2 text-sm text-slate-300">
            Set your account role to <code>Admin</code> or <code>Moderator</code> to open the
            moderation panel.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <motion.header
        className="vibe-card relative overflow-hidden p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute -right-8 -top-16 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <h1 className="text-2xl font-semibold text-slate-100">Moderation Hub</h1>
        <p className="mt-1 text-sm text-slate-300">
          Review users and posts across the platform.
        </p>
        <p className="mt-1 text-xs text-amber-200/90">
          Auto-escalation active: posts with 5+ open reports are automatically flagged.
        </p>
      </motion.header>

      <div className="grid grid-cols-2 gap-3">
        <article className="vibe-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Users</p>
          <p className="mt-1 text-3xl font-semibold text-slate-100">{profiles.length}</p>
        </article>
        <article className="vibe-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Posts scanned</p>
          <p className="mt-1 text-3xl font-semibold text-slate-100">{posts.length}</p>
        </article>
        <article className="vibe-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Open reports</p>
          <p className="mt-1 text-3xl font-semibold text-slate-100">
            {reports.filter((report) => report.status === "open").length}
          </p>
        </article>
      </div>

      <article className="vibe-card p-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/45 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
          placeholder="Search posts or @handle"
        />
      </article>

      <article className="vibe-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Latest users</h2>
        <div className="space-y-2">
          {profiles.slice(0, 8).map((profile) => (
            <div key={profile.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
              <p className="text-sm font-semibold text-slate-100">
                {profile.display_name} <span className="text-cyan-300">@{profile.handle}</span>
              </p>
              <p className="mt-1 text-xs text-slate-300">{profile.bio_short || "No bio yet."}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-slate-400">
                {profile.role_label}
              </p>
            </div>
          ))}
        </div>
      </article>

      <article className="vibe-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Reports queue (prioritized)</h2>
        <div className="space-y-2">
          {prioritizedReports.slice(0, 20).map((entry) => {
            const post = posts.find((item) => item.id === entry.postId);
            const severity = severityFromCount(entry.count);
            const latestReport = entry.reports.sort(
              (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
            )[0];
            const latestReporter = profiles.find(
              (profile) => profile.id === latestReport?.reporter_id
            );
            return (
              <div key={entry.postId} className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-cyan-200">
                    Last reporter:{" "}
                    {latestReporter
                      ? `@${latestReporter.handle}`
                      : latestReport?.reporter_id.slice(0, 8) ?? "unknown"}
                  </p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${severity.classes}`}
                  >
                    {severity.label} - {entry.count} report{entry.count > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-200">
                  Latest reason: {latestReport?.reason ?? "No reason"}
                </p>
                <p className="mt-1 text-sm text-slate-100">{post?.body ?? "Post no longer available."}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Statuses:{" "}
                  {Array.from(new Set(entry.reports.map((report) => report.status))).join(", ")}
                </p>
                <div className="mt-2 flex gap-1">
                  <button
                    onClick={() =>
                      Promise.all(entry.reports.map((report) => reviewReport(report.id, "resolved")))
                    }
                    className="h-8 rounded-lg border border-emerald-300/40 bg-emerald-500/10 px-2 text-[11px] text-emerald-200"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() =>
                      Promise.all(entry.reports.map((report) => reviewReport(report.id, "dismissed")))
                    }
                    className="h-8 rounded-lg border border-slate-300/30 bg-slate-500/10 px-2 text-[11px] text-slate-200"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => post && runModeration(post.id, "hidden")}
                    className="h-8 rounded-lg border border-rose-300/40 bg-rose-500/10 px-2 text-[11px] text-rose-200"
                  >
                    Hide post
                  </button>
                </div>
              </div>
            );
          })}
          {!prioritizedReports.length ? <p className="text-xs text-slate-400">No reports yet.</p> : null}
        </div>
      </article>

      <article className="vibe-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Post review queue</h2>
        <div className="space-y-2">
          {filteredPosts.slice(0, 20).map((post) => {
            const author = profiles.find((profile) => profile.id === post.user_id);
            return (
              <div key={post.id} className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-cyan-200">
                    {author ? `@${author.handle}` : post.user_id.slice(0, 8)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="mt-1 text-sm text-slate-100">{post.body}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400">
                    Status: {post.moderation_status ?? "active"}
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => runModeration(post.id, "flagged")}
                      className="h-8 rounded-lg border border-amber-300/40 bg-amber-500/10 px-2 text-[11px] text-amber-200"
                    >
                      Flag
                    </button>
                    <button
                      onClick={() => runModeration(post.id, "hidden")}
                      className="h-8 rounded-lg border border-rose-300/40 bg-rose-500/10 px-2 text-[11px] text-rose-200"
                    >
                      Hide
                    </button>
                    <button
                      onClick={() => runModeration(post.id, "active")}
                      className="h-8 rounded-lg border border-emerald-300/40 bg-emerald-500/10 px-2 text-[11px] text-emerald-200"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {!filteredPosts.length ? (
            <p className="text-xs text-slate-400">No posts match your filter.</p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
