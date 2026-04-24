const REQUIRED_PUBLIC_ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

type RequiredEnvKey = (typeof REQUIRED_PUBLIC_ENV_KEYS)[number];

function readPublicEnv(key: RequiredEnvKey): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

export function getMissingPublicEnvKeys(): RequiredEnvKey[] {
  return REQUIRED_PUBLIC_ENV_KEYS.filter((key) => !readPublicEnv(key));
}

export function getSupabaseRuntimeConfig() {
  const url = readPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
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
