"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion } from "framer-motion";

import { registerUser } from "@/lib/supabase-auth";
import { upsertUserProfile } from "@/lib/supabase-rest";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState("Creator");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    if (!email || !password || !name || !handle || !bio) {
      setMessage("Please fill all fields.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const result = await registerUser({
      email,
      password,
      name,
      handle,
      bioShort: bio,
      roleLabel: role
    });

    if (!result.ok) {
      setMessage(result.message ?? "Signup failed. Check Supabase config.");
      setSubmitting(false);
      return;
    }

    if (result.userId) {
      await upsertUserProfile({
        id: result.userId,
        display_name: name,
        handle,
        bio_short: bio,
        role_label: role,
        accessToken: result.accessToken
      });
    }

    setMessage("Account created. Welcome to Social Vibe.");
    setSubmitting(false);
    setTimeout(() => router.push("/feed"), 500);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-8">
      <motion.section
        className="vibe-card relative overflow-hidden p-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute -top-14 right-0 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <h1 className="text-2xl font-semibold text-slate-100">Create your account</h1>
        <p className="mt-1 text-sm text-slate-300">
          Short profile setup for every user on your platform.
        </p>

        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <input
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/45 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/45 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            placeholder="Password (min 6)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/45 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            placeholder="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/45 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            placeholder="@handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
          <input
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/45 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            placeholder="Role (e.g. Student, Builder)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <textarea
            className="min-h-20 w-full rounded-xl border border-white/10 bg-slate-900/45 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
            placeholder="Short bio (1-2 lines)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />

          <motion.button
            type="submit"
            disabled={submitting}
            whileTap={{ scale: 0.97 }}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Creating account..." : "Create account"}
          </motion.button>
        </form>

        {message ? (
          <p className="mt-3 rounded-lg border border-cyan-300/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
            {message}
          </p>
        ) : null}

        <div className="mt-4">
          <Link className="text-xs text-slate-300 underline" href="/feed">
            Continue to feed
          </Link>
        </div>
      </motion.section>
    </main>
  );
}
