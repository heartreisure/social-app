"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { getAuthenticatedUser, getSupabaseAccessToken } from "../../../lib/supabase-auth";
import {
  createAdminRequest,
  decideAdminRequest,
  fetchAdminRequests,
  fetchProfileByHandle,
  fetchProfileById,
  fetchUserProfiles,
  setUserAdminStatus
} from "../../../lib/supabase-rest";

type AdminRequest = {
  id: string;
  user_id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type UserProfile = {
  id: string;
  display_name: string;
  handle: string;
  role_label: string;
  is_admin: boolean;
  is_creator: boolean;
};

export default function AdminAccessPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [reason, setReason] = useState("");
  const [targetHandle, setTargetHandle] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const token = getSupabaseAccessToken();
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        if (mounted) setLoading(false);
        return;
      }

      const myProfile = await fetchProfileById(authUser.id, token);
      const [adminRequests, allProfiles] = await Promise.all([
        fetchAdminRequests(token, "all"),
        fetchUserProfiles(token)
      ]);

      if (!mounted) return;
      setMe((myProfile as UserProfile | null) ?? null);
      setRequests((adminRequests as AdminRequest[]) ?? []);
      setProfiles((allProfiles as UserProfile[]) ?? []);
      setLoading(false);
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests]
  );

  const myPendingRequest = useMemo(() => {
    if (!me) return null;
    return pendingRequests.find((request) => request.user_id === me.id) ?? null;
  }, [pendingRequests, me]);

  async function onRequestAdmin(event: FormEvent) {
    event.preventDefault();
    if (!me || !reason.trim()) {
      setFeedback("Please add a short reason first.");
      return;
    }
    const token = getSupabaseAccessToken();
    const ok = await createAdminRequest({
      userId: me.id,
      reason: reason.trim(),
      accessToken: token
    });
    if (!ok) {
      setFeedback("Could not submit admin request. Try again.");
      return;
    }
    setRequests((current) => [
      {
        id: crypto.randomUUID(),
        user_id: me.id,
        reason: reason.trim(),
        status: "pending",
        created_at: new Date().toISOString()
      },
      ...current
    ]);
    setReason("");
    setFeedback("Admin request sent.");
  }

  async function reviewRequest(requestId: string, userId: string, decision: "approved" | "rejected") {
    if (!me) return;
    const token = getSupabaseAccessToken();
    const [decisionOk, roleOk] = await Promise.all([
      decideAdminRequest({
        requestId,
        decision,
        decidedBy: me.id,
        accessToken: token
      }),
      decision === "approved"
        ? setUserAdminStatus({
            userId,
            isAdmin: true,
            decidedBy: me.id,
            accessToken: token
          })
        : Promise.resolve(true)
    ]);
    if (!decisionOk || !roleOk) {
      setFeedback("Could not update this request.");
      return;
    }
    setRequests((current) =>
      current.map((item) => (item.id === requestId ? { ...item, status: decision } : item))
    );
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === userId ? { ...profile, is_admin: decision === "approved" } : profile
      )
    );
    setFeedback(`Request ${decision}.`);
  }

  async function onPromote(event: FormEvent) {
    event.preventDefault();
    if (!me || !targetHandle.trim()) {
      setFeedback("Enter a handle first.");
      return;
    }
    const token = getSupabaseAccessToken();
    const target = await fetchProfileByHandle(targetHandle, token);
    if (!target) {
      setFeedback("User not found with this handle.");
      return;
    }
    if (target.is_creator) {
      setFeedback("Creator role cannot be changed.");
      return;
    }
    const ok = await setUserAdminStatus({
      userId: target.id,
      isAdmin: true,
      decidedBy: me.id,
      accessToken: token
    });
    if (!ok) {
      setFeedback("Promotion failed.");
      return;
    }
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === target.id ? { ...profile, is_admin: true, role_label: "admin" } : profile
      )
    );
    setTargetHandle("");
    setFeedback(`@${target.handle} is now admin.`);
  }

  async function demote(profile: UserProfile) {
    if (!me || profile.is_creator) {
      return;
    }
    const token = getSupabaseAccessToken();
    const ok = await setUserAdminStatus({
      userId: profile.id,
      isAdmin: false,
      decidedBy: me.id,
      accessToken: token
    });
    if (!ok) {
      setFeedback("Demotion failed.");
      return;
    }
    setProfiles((current) =>
      current.map((item) =>
        item.id === profile.id ? { ...item, is_admin: false, role_label: "member" } : item
      )
    );
    setFeedback(`@${profile.handle} is now member.`);
  }

  if (loading) {
    return <article className="vibe-card p-4 text-sm text-slate-300">Loading admin access...</article>;
  }

  if (!me) {
    return (
      <article className="vibe-card p-4 text-sm text-slate-300">
        Please create or login to an account first.
      </article>
    );
  }

  return (
    <section className="space-y-4">
      <motion.header className="vibe-card p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold text-slate-100">Admin Access</h1>
        <p className="mt-1 text-sm text-slate-300">
          Creator controls who can moderate the platform.
        </p>
      </motion.header>

      {feedback ? <article className="vibe-card p-3 text-xs text-cyan-100">{feedback}</article> : null}

      {!me.is_creator ? (
        <article className="vibe-card p-4">
          <h2 className="text-sm font-semibold text-slate-100">Request admin access</h2>
          <p className="mt-1 text-xs text-slate-300">
            Send a request to the creator with your reason.
          </p>
          <form className="mt-3 space-y-2" onSubmit={onRequestAdmin}>
            <textarea
              className="min-h-24 w-full rounded-xl border border-white/10 bg-slate-900/45 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
              placeholder="Why should you become admin?"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={Boolean(myPendingRequest)}
            />
            <button
              className="h-10 rounded-xl border border-cyan-300/50 bg-cyan-500/15 px-3 text-xs text-cyan-100 disabled:opacity-60"
              disabled={Boolean(myPendingRequest)}
            >
              {myPendingRequest ? "Request already pending" : "Send request"}
            </button>
          </form>
        </article>
      ) : null}

      {me.is_creator ? (
        <>
          <article className="vibe-card p-4">
            <h2 className="text-sm font-semibold text-slate-100">Pending requests</h2>
            <div className="mt-3 space-y-2">
              {pendingRequests.length ? (
                pendingRequests.map((request) => {
                  const applicant = profiles.find((profile) => profile.id === request.user_id);
                  return (
                    <div key={request.id} className="rounded-xl border border-white/10 bg-slate-900/35 p-3">
                      <p className="text-sm text-slate-100">
                        {applicant?.display_name ?? "Unknown user"}{" "}
                        <span className="text-cyan-300">@{applicant?.handle ?? "unknown"}</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-300">{request.reason}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => reviewRequest(request.id, request.user_id, "approved")}
                          className="h-8 rounded-lg border border-emerald-300/40 bg-emerald-500/10 px-2 text-[11px] text-emerald-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reviewRequest(request.id, request.user_id, "rejected")}
                          className="h-8 rounded-lg border border-rose-300/40 bg-rose-500/10 px-2 text-[11px] text-rose-200"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400">No pending request.</p>
              )}
            </div>
          </article>

          <article className="vibe-card p-4">
            <h2 className="text-sm font-semibold text-slate-100">Promote by handle</h2>
            <form className="mt-3 flex gap-2" onSubmit={onPromote}>
              <input
                value={targetHandle}
                onChange={(event) => setTargetHandle(event.target.value)}
                className="h-10 flex-1 rounded-xl border border-white/10 bg-slate-900/45 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
                placeholder="@handle"
              />
              <button className="h-10 rounded-xl border border-cyan-300/50 bg-cyan-500/15 px-3 text-xs text-cyan-100">
                Promote
              </button>
            </form>
          </article>

          <article className="vibe-card p-4">
            <h2 className="text-sm font-semibold text-slate-100">Current admins</h2>
            <div className="mt-3 space-y-2">
              {profiles
                .filter((profile) => profile.is_admin || profile.is_creator)
                .map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/35 p-3">
                    <p className="text-sm text-slate-100">
                      {profile.display_name} <span className="text-cyan-300">@{profile.handle}</span>
                      {profile.is_creator ? " (creator)" : ""}
                    </p>
                    {!profile.is_creator ? (
                      <button
                        onClick={() => demote(profile)}
                        className="h-8 rounded-lg border border-amber-300/40 bg-amber-500/10 px-2 text-[11px] text-amber-200"
                      >
                        Demote
                      </button>
                    ) : null}
                  </div>
                ))}
            </div>
          </article>
        </>
      ) : null}
    </section>
  );
}
