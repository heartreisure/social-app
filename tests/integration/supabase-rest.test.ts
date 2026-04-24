import { createPostReport, moderatePost, reviewPostReport } from "@/lib/supabase-rest";

describe("supabase-rest moderation/report workflows", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key"
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("rejects too-short report reason locally", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await createPostReport({
      postId: "p1",
      reporterId: "u1",
      reason: "no"
    });

    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends moderation payload with moderator metadata", async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchSpy);

    const ok = await moderatePost({
      postId: "p1",
      status: "flagged",
      reason: "abuse",
      moderatorUserId: "mod-1",
      accessToken: "token"
    });

    expect(ok).toBe(true);
    const request = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.moderation_status).toBe("flagged");
    expect(body.flagged_reason).toBe("abuse");
    expect(body.moderated_by).toBe("mod-1");
    expect(typeof body.moderated_at).toBe("string");
  });

  it("updates report review status with reviewer context", async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchSpy);

    const ok = await reviewPostReport({
      reportId: "r1",
      status: "resolved",
      reviewerId: "admin-2",
      accessToken: "token"
    });

    expect(ok).toBe(true);
    const request = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.status).toBe("resolved");
    expect(body.reviewed_by).toBe("admin-2");
    expect(typeof body.reviewed_at).toBe("string");
  });

  it("rejects moderation mutation when backend returns forbidden", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 403 })));

    const ok = await moderatePost({
      postId: "p1",
      status: "hidden",
      moderatorUserId: "user-regular",
      accessToken: "user-token"
    });

    expect(ok).toBe(false);
  });

  it("rejects report review mutation when backend returns forbidden", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 403 })));

    const ok = await reviewPostReport({
      reportId: "r1",
      status: "dismissed",
      reviewerId: "user-regular",
      accessToken: "user-token"
    });

    expect(ok).toBe(false);
  });
});
