"use client";

import { getSupabaseRuntimeConfig } from "@/lib/runtime-config";

type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    preferred_username?: string;
    bio_short?: string;
    role_label?: string;
  };
};

type RegisterPayload = {
  email: string;
  password: string;
  name: string;
  handle: string;
  bioShort: string;
  roleLabel: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

function getAuthConfig() {
  return getSupabaseRuntimeConfig();
}

function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }
  const directToken = localStorage.getItem("sb-access-token");
  if (directToken) {
    return directToken;
  }

  const supabaseToken = localStorage.getItem("supabase.auth.token");
  if (!supabaseToken) {
    return null;
  }

  try {
    const parsed = JSON.parse(supabaseToken) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

export function getSupabaseAccessToken() {
  return getAccessToken();
}

export async function registerUser(payload: RegisterPayload) {
  const config = getAuthConfig();
  if (!config) {
    return {
      ok: false as const,
      reason: "missing_config" as const,
      message: "Missing Supabase public configuration."
    };
  }

  const response = await fetch(`${config.url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
      data: {
        name: payload.name.trim(),
        preferred_username: payload.handle.trim().replace(/^@/, ""),
        bio_short: payload.bioShort.trim(),
        role_label: payload.roleLabel.trim()
      }
    })
  });

  if (!response.ok) {
    let details = "";
    try {
      const errorJson = (await response.json()) as {
        msg?: string;
        message?: string;
        error_description?: string;
        error_code?: string;
      };
      details =
        errorJson.msg ??
        errorJson.message ??
        errorJson.error_description ??
        errorJson.error_code ??
        "";
    } catch {
      details = "";
    }
    return {
      ok: false as const,
      reason: "signup_failed" as const,
      message: details || `Signup failed (HTTP ${response.status}).`
    };
  }

  const json = (await response.json()) as {
    access_token?: string;
    user?: SupabaseAuthUser;
  };

  if (json.access_token && typeof window !== "undefined") {
    localStorage.setItem("sb-access-token", json.access_token);
  }

  return {
    ok: true as const,
    userId: json.user?.id ?? null,
    accessToken: json.access_token ?? null
  };
}

export async function getAuthenticatedUser(): Promise<SupabaseAuthUser | null> {
  const config = getAuthConfig();
  const accessToken = getAccessToken();
  if (!config || !accessToken) {
    return null;
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as SupabaseAuthUser;
}

export async function loginUser(payload: LoginPayload) {
  const config = getAuthConfig();
  if (!config) {
    return {
      ok: false as const,
      reason: "missing_config" as const,
      message: "Missing Supabase public configuration."
    };
  }

  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password
    })
  });

  if (!response.ok) {
    let details = "";
    try {
      const errorJson = (await response.json()) as {
        msg?: string;
        message?: string;
        error_description?: string;
        error_code?: string;
      };
      details =
        errorJson.msg ??
        errorJson.message ??
        errorJson.error_description ??
        errorJson.error_code ??
        "";
    } catch {
      details = "";
    }
    return {
      ok: false as const,
      reason: "login_failed" as const,
      message: details || `Login failed (HTTP ${response.status}).`
    };
  }

  const json = (await response.json()) as {
    access_token?: string;
    user?: SupabaseAuthUser;
  };

  if (json.access_token && typeof window !== "undefined") {
    localStorage.setItem("sb-access-token", json.access_token);
  }

  return {
    ok: true as const,
    userId: json.user?.id ?? null,
    accessToken: json.access_token ?? null
  };
}
