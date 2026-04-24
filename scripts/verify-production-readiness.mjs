const requiredEnv = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

const missing = requiredEnv.filter((key) => !(process.env[key] ?? "").trim());
if (missing.length) {
  console.error("Production readiness check failed.");
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL).trim();
if (!supabaseUrl.startsWith("https://")) {
  console.error("Production readiness check failed.");
  console.error("NEXT_PUBLIC_SUPABASE_URL must start with https://");
  process.exit(1);
}

const key = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).trim();
if (key.length < 20) {
  console.error("Production readiness check failed.");
  console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY appears too short.");
  process.exit(1);
}

console.log("Production readiness check passed.");
