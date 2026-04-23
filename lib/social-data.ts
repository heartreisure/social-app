"use client";

import { getUserPosts, loggedInUser, posts as mockPosts } from "@/lib/mock-data";
import { getAuthenticatedUser, getSupabaseAccessToken } from "@/lib/supabase-auth";
import { SocialPost } from "@/lib/social-types";
import { createPost, fetchPosts, fetchUserPosts } from "@/lib/supabase-rest";

const VIBE_COLORS = [
  "from-fuchsia-500/30 to-cyan-400/10",
  "from-sky-500/30 to-violet-400/10",
  "from-purple-500/35 to-indigo-500/10",
  "from-cyan-500/25 to-blue-500/10",
  "from-emerald-500/20 to-cyan-500/10"
];

type RawPost = Awaited<ReturnType<typeof fetchPosts>> extends (infer U)[] ? U : never;

function withVibe(post: Omit<SocialPost, "vibeColor">, index: number): SocialPost {
  return { ...post, vibeColor: VIBE_COLORS[index % VIBE_COLORS.length] };
}

export async function getFeedPosts(): Promise<SocialPost[]> {
  const data = await fetchPosts(50, getSupabaseAccessToken());
  if (!data?.length) {
    return mockPosts;
  }

  return (data as RawPost[]).map((post, index) =>
    withVibe(
      {
        id: post.id,
        userId: post.user_id,
        authorName: post.user_id === loggedInUser.id ? loggedInUser.name : "Viber",
        body: post.body,
        createdAt: post.created_at
      },
      index
    )
  );
}

export async function getProfileData() {
  const authUser = await getAuthenticatedUser();
  const userId = authUser?.id ?? process.env.NEXT_PUBLIC_DEMO_USER_ID ?? loggedInUser.id;
  const userName =
    authUser?.user_metadata?.name ??
    authUser?.user_metadata?.full_name ??
    loggedInUser.name;
  const handle = authUser?.user_metadata?.preferred_username
    ? `@${authUser.user_metadata.preferred_username}`
    : authUser?.email
      ? `@${authUser.email.split("@")[0]}`
      : loggedInUser.handle;

  const data = await fetchUserPosts(userId);

  const mapped = data?.length
    ? data.map((post, index) =>
        withVibe(
          {
            id: post.id,
            userId: post.user_id,
            authorName: userName,
            body: post.body,
            createdAt: post.created_at
          },
          index
        )
      )
    : getUserPosts(loggedInUser.id);

  const vibeStreak = new Set(mapped.map((post) => post.createdAt.slice(0, 10))).size;

  return {
    user: {
      id: userId,
      name: userName,
      handle
    },
    userPosts: mapped,
    postCount: mapped.length,
    vibeStreak
  };
}

export async function submitPost(body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false as const, reason: "empty" as const };
  }

  const authUser = await getAuthenticatedUser();
  const userId = authUser?.id ?? process.env.NEXT_PUBLIC_DEMO_USER_ID ?? loggedInUser.id;
  const accessToken = getSupabaseAccessToken();

  const created = await createPost({
    userId,
    body: trimmed,
    accessToken
  });

  if (!created) {
    return { ok: false as const, reason: "insert_failed" as const };
  }

  return { ok: true as const };
}
