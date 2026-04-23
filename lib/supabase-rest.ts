"use client";

type PostRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  moderation_status?: "active" | "flagged" | "hidden";
  flagged_reason?: string;
};

type CreatePostInput = {
  userId: string;
  body: string;
  accessToken?: string | null;
};

type UserProfileInput = {
  id: string;
  display_name: string;
  handle: string;
  bio_short: string;
  role_label: string;
  accessToken?: string | null;
};

type UserProfileRow = {
  id: string;
  display_name: string;
  handle: string;
  bio_short: string;
  role_label: string;
  created_at: string;
};

type CreateReportInput = {
  postId: string;
  reporterId: string;
  reason: string;
  accessToken?: string | null;
};

type PostReportRow = {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

export async function fetchPosts(limit = 50, accessToken?: string | null): Promise<PostRow[] | null> {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  const response = await fetch(
    `${config.url}/rest/v1/posts?select=id,user_id,body,created_at,moderation_status,flagged_reason&moderation_status=neq.hidden&order=created_at.desc&limit=${limit}`,
    {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken ?? config.anonKey}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PostRow[];
}

export async function fetchUserPosts(userId: string): Promise<PostRow[] | null> {
  const config = getSupabaseConfig();
  if (!config || !userId) {
    return null;
  }

  const response = await fetch(
    `${config.url}/rest/v1/posts?select=id,user_id,body,created_at,moderation_status,flagged_reason&user_id=eq.${userId}&moderation_status=neq.hidden&order=created_at.desc`,
    {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PostRow[];
}

export async function createPost(input: CreatePostInput): Promise<PostRow | null> {
  const config = getSupabaseConfig();
  if (!config || !input.userId || !input.body.trim()) {
    return null;
  }

  const response = await fetch(`${config.url}/rest/v1/posts`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${input.accessToken ?? config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify([
      {
        user_id: input.userId,
        body: input.body.trim()
      }
    ])
  });

  if (!response.ok) {
    return null;
  }

  const rows = (await response.json()) as PostRow[];
  return rows[0] ?? null;
}

export async function moderatePost(input: {
  postId: string;
  status: "flagged" | "hidden" | "active";
  reason?: string;
  moderatorUserId: string;
  accessToken?: string | null;
}) {
  const config = getSupabaseConfig();
  if (!config || !input.postId) {
    return false;
  }

  const response = await fetch(`${config.url}/rest/v1/posts?id=eq.${input.postId}`, {
    method: "PATCH",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${input.accessToken ?? config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      moderation_status: input.status,
      flagged_reason: input.reason ?? "",
      moderated_at: new Date().toISOString(),
      moderated_by: input.moderatorUserId
    })
  });

  return response.ok;
}

export async function fetchPostsForModeration(
  limit = 120,
  accessToken?: string | null
): Promise<PostRow[] | null> {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  const response = await fetch(
    `${config.url}/rest/v1/posts?select=id,user_id,body,created_at,moderation_status,flagged_reason&order=created_at.desc&limit=${limit}`,
    {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken ?? config.anonKey}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PostRow[];
}

export async function upsertUserProfile(input: UserProfileInput) {
  const config = getSupabaseConfig();
  if (!config || !input.id) {
    return false;
  }

  const response = await fetch(`${config.url}/rest/v1/user_profiles`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${input.accessToken ?? config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify([
      {
        id: input.id,
        display_name: input.display_name,
        handle: input.handle.replace(/^@/, ""),
        bio_short: input.bio_short,
        role_label: input.role_label
      }
    ])
  });

  return response.ok;
}

export async function fetchUserProfiles(accessToken?: string | null): Promise<UserProfileRow[] | null> {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  const response = await fetch(
    `${config.url}/rest/v1/user_profiles?select=id,display_name,handle,bio_short,role_label,created_at&order=created_at.desc&limit=100`,
    {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken ?? config.anonKey}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as UserProfileRow[];
}

export async function createPostReport(input: CreateReportInput) {
  const config = getSupabaseConfig();
  if (!config || !input.postId || !input.reporterId || input.reason.trim().length < 3) {
    return false;
  }

  const response = await fetch(`${config.url}/rest/v1/post_reports`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${input.accessToken ?? config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal"
    },
    body: JSON.stringify([
      {
        post_id: input.postId,
        reporter_id: input.reporterId,
        reason: input.reason.trim()
      }
    ])
  });

  return response.ok;
}

export async function fetchPostReports(
  accessToken?: string | null,
  status: "open" | "resolved" | "dismissed" | "all" = "open"
): Promise<PostReportRow[] | null> {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  const statusFilter = status === "all" ? "" : `&status=eq.${status}`;
  const response = await fetch(
    `${config.url}/rest/v1/post_reports?select=id,post_id,reporter_id,reason,status,reviewed_by,reviewed_at,created_at&order=created_at.desc${statusFilter}&limit=200`,
    {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken ?? config.anonKey}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PostReportRow[];
}

export async function reviewPostReport(input: {
  reportId: string;
  status: "resolved" | "dismissed" | "open";
  reviewerId: string;
  accessToken?: string | null;
}) {
  const config = getSupabaseConfig();
  if (!config || !input.reportId) {
    return false;
  }

  const response = await fetch(`${config.url}/rest/v1/post_reports?id=eq.${input.reportId}`, {
    method: "PATCH",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${input.accessToken ?? config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      status: input.status,
      reviewed_by: input.reviewerId,
      reviewed_at: new Date().toISOString()
    })
  });

  return response.ok;
}
