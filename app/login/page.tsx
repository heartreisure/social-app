"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion } from "framer-motion";

import { loginUser } from "@/lib/supabase-auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    if (!email || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const result = await loginUser({ email, password });
    if (!result.ok) {
      setMessage(result.message ?? "Login failed.");
      setSubmitting(false);
      return;
    }

    setMessage("Login successful. Redirecting...");
    setSubmitting(false);
    setTimeout(() => router.push("/feed"), 400);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-8">
      <motion.section
        className="vibe-card relative overflow-hidden p-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute -top-14 right-0 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <h1 className="text-2xl font-semibold text-slate-100">Login</h1>
        <p className="mt-1 text-sm text-slate-300">Use your email and password to access your account.</p>

        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <input
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/45 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/45 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <motion.button
            type="submit"
            disabled={submitting}
            whileTap={{ scale: 0.97 }}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Logging in..." : "Login"}
          </motion.button>
        </form>

        {message ? (
          <p className="mt-3 rounded-lg border border-cyan-300/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
            {message}
          </p>
        ) : null}

        <div className="mt-4">
          <Link className="text-xs text-slate-300 underline" href="/auth">
            New here? Create account
          </Link>
        </div>
      </motion.section>
    </main>
  );
}
