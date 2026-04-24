"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { getProfileData } from "@/lib/social-data";
import { SocialPost } from "@/lib/social-types";

type ProfileData = {
  user: {
    id: string;
    name: string;
    handle: string;
    bioShort: string;
    age: number | null;
    roleLabel: string;
    isAdmin: boolean;
    isCreator: boolean;
  };
  userPosts: SocialPost[];
  postCount: number;
  vibeStreak: number;
};

function getWeeklyActivity(posts: SocialPost[]) {
  const map = new Map<string, number>();
  posts.forEach((post) => {
    const day = new Date(post.createdAt).toLocaleDateString(undefined, { weekday: "short" });
    map.set(day, (map.get(day) ?? 0) + 1);
  });
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const values = order.map((day) => ({ day, count: map.get(day) ?? 0 }));
  const max = Math.max(1, ...values.map((value) => value.count));
  return values.map((value) => ({
    ...value,
    height: `${Math.max(16, Math.round((value.count / max) * 68))}px`
  }));
}

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      const loaded = await getProfileData();
      if (isMounted) {
        setProfileData(loaded);
      }
    }
    loadProfile();
    const handlePostCreated = () => loadProfile();
    const handleOptimisticPost = (event: Event) => {
      const optimistic = (event as CustomEvent<SocialPost>).detail;
      if (!optimistic) {
        return;
      }
      setProfileData((current) => {
        if (!current) {
          return current;
        }
        const nextPosts = [optimistic, ...current.userPosts.filter((post) => !post.id.startsWith("tmp-"))];
        return {
          ...current,
          userPosts: nextPosts,
          postCount: current.postCount + 1,
          vibeStreak: new Set(nextPosts.map((post) => post.createdAt.slice(0, 10))).size
        };
      });
    };
    const handleRollback = () => {
      setProfileData((current) => {
        if (!current) {
          return current;
        }
        const cleaned = current.userPosts.filter((post) => !post.id.startsWith("tmp-"));
        return {
          ...current,
          userPosts: cleaned,
          postCount: cleaned.length,
          vibeStreak: new Set(cleaned.map((post) => post.createdAt.slice(0, 10))).size
        };
      });
    };
    window.addEventListener("vibe:post-created", handlePostCreated);
    window.addEventListener("vibe:post-optimistic", handleOptimisticPost);
    window.addEventListener("vibe:post-rollback", handleRollback);
    return () => {
      isMounted = false;
      window.removeEventListener("vibe:post-created", handlePostCreated);
      window.removeEventListener("vibe:post-optimistic", handleOptimisticPost);
      window.removeEventListener("vibe:post-rollback", handleRollback);
    };
  }, []);

  if (!profileData) {
    return (
      <section className="space-y-4">
        <header className="vibe-card p-4">
          <p className="text-sm text-slate-300">Loading profile...</p>
        </header>
      </section>
    );
  }

  const weeklyActivity = getWeeklyActivity(profileData.userPosts);

  return (
    <section className="space-y-4">
      <motion.header
        className="vibe-card relative overflow-hidden p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
      >
        <div className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-16 h-44 w-44 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-400 to-cyan-300 p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-950 text-lg font-bold text-cyan-100">
              {profileData.user.name.slice(0, 1).toUpperCase()}
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Your profile</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-100">{profileData.user.name}</h1>
            <p className="text-sm text-cyan-300/90">{profileData.user.handle}</p>
          </div>
        </div>
      </motion.header>

      <article className="vibe-card p-4">
        <h2 className="text-sm font-semibold text-slate-200">Account details</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <p className="rounded-lg border border-white/10 bg-slate-900/35 px-3 py-2 text-slate-300">
            Role: <span className="text-slate-100">{profileData.user.roleLabel}</span>
          </p>
          <p className="rounded-lg border border-white/10 bg-slate-900/35 px-3 py-2 text-slate-300">
            Age: <span className="text-slate-100">{profileData.user.age ?? "Not set"}</span>
          </p>
          <p className="rounded-lg border border-white/10 bg-slate-900/35 px-3 py-2 text-slate-300">
            Creator: <span className="text-slate-100">{profileData.user.isCreator ? "Yes" : "No"}</span>
          </p>
          <p className="rounded-lg border border-white/10 bg-slate-900/35 px-3 py-2 text-slate-300">
            Admin: <span className="text-slate-100">{profileData.user.isAdmin ? "Yes" : "No"}</span>
          </p>
        </div>
        <p className="mt-3 rounded-lg border border-white/10 bg-slate-900/35 px-3 py-2 text-xs text-slate-300">
          Bio: <span className="text-slate-100">{profileData.user.bioShort || "No bio yet."}</span>
        </p>
      </article>

      <div className="grid grid-cols-2 gap-3">
        <motion.article className="vibe-card p-4" layout>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Posts</p>
          <p className="mt-1 text-3xl font-semibold text-slate-100">{profileData.postCount}</p>
          <p className="mt-1 text-xs text-slate-400">Total vibes shared</p>
        </motion.article>
        <motion.article className="vibe-card p-4" layout>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Vibe streak</p>
          <p className="mt-1 text-3xl font-semibold text-slate-100">
            {profileData.vibeStreak} days
          </p>
          <p className="mt-1 text-xs text-slate-400">Consistency score</p>
        </motion.article>
      </div>

      <article className="vibe-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Weekly energy</h2>
          <span className="text-xs text-cyan-200/90">Last posts activity</span>
        </div>
        <div className="grid grid-cols-7 items-end gap-2">
          {weeklyActivity.map((item) => (
            <div key={item.day} className="flex flex-col items-center gap-1">
              <motion.div
                className="w-full rounded-md bg-gradient-to-t from-fuchsia-500/75 to-cyan-400/75"
                style={{ height: item.height }}
                initial={{ height: 8, opacity: 0.6 }}
                animate={{ height: item.height, opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <span className="text-[10px] text-slate-400">{item.day}</span>
            </div>
          ))}
        </div>
      </article>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Your post history</h2>
        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence initial={false}>
            {profileData.userPosts.map((post) => (
              <motion.article
                key={post.id}
                className="vibe-card overflow-hidden p-0"
                layout
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className={`relative h-24 bg-gradient-to-br ${post.vibeColor}`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
                </div>
                <div className="p-3">
                  <p className="text-xs leading-5 text-slate-200">{post.body}</p>
                  <time className="mt-2 block text-[11px] text-slate-400">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </time>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </section>
    </section>
  );
}
