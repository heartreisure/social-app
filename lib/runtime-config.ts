function readEnvValue(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function readSupabaseUrl(): string | null {
  // Use direct env key access so Next.js can inline at build-time.
  return readEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function readSupabaseAnonKey(): string | null {
  // Use direct env key access so Next.js can inline at build-time.
  return readEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getMissingPublicEnvKeys(): Array<"NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"> {
  const missing: Array<"NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"> = [];
  if (!readSupabaseUrl()) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!readSupabaseAnonKey()) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return missing;
}

export function getSupabaseRuntimeConfig() {
  const url = readSupabaseUrl();
  const anonKey = readSupabaseAnonKey();
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

export function getPublicEnvValidationSummary() {
  const missing = getMissingPublicEnvKeys();
  return {
    ok: missing.length === 0,
    missing
  };
}
