import { SocialPost } from "@/lib/social-types";

export const loggedInUser = {
  id: "user-1",
  name: "Student",
  handle: "@vibe_student"
};

export const posts: SocialPost[] = [
  {
    id: "p1",
    userId: "user-1",
    authorName: "Student",
    body: "Morning walk + synthwave playlist = perfect dev vibe.",
    createdAt: "2026-04-23T08:10:00Z",
    vibeColor: "from-fuchsia-500/30 to-cyan-400/10"
  },
  {
    id: "p2",
    userId: "user-2",
    authorName: "Ari",
    body: "Shipped auth screen before lunch. Tiny win, huge mood.",
    createdAt: "2026-04-22T12:20:00Z",
    vibeColor: "from-sky-500/30 to-violet-400/10"
  },
  {
    id: "p3",
    userId: "user-1",
    authorName: "Student",
    body: "Built a blur-heavy card stack UI. Looks like midnight glass.",
    createdAt: "2026-04-22T20:40:00Z",
    vibeColor: "from-purple-500/35 to-indigo-500/10"
  },
  {
    id: "p4",
    userId: "user-1",
    authorName: "Student",
    body: "Realtime comments landed. Team energy: high.",
    createdAt: "2026-04-21T18:00:00Z",
    vibeColor: "from-cyan-500/25 to-blue-500/10"
  },
  {
    id: "p5",
    userId: "user-3",
    authorName: "Kai",
    body: "Need a coffee-powered bug hunt crew.",
    createdAt: "2026-04-20T11:15:00Z",
    vibeColor: "from-emerald-500/20 to-cyan-500/10"
  }
];

export function getUserPosts(userId: string) {
  return posts
    .filter((post) => post.userId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function getVibeStreak(userId: string) {
  const days = new Set(
    getUserPosts(userId).map((post) =>
      new Date(post.createdAt).toISOString().slice(0, 10)
    )
  );
  return days.size;
}
