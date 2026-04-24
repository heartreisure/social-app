import { getSupabaseAccessToken, registerUser } from "@/lib/supabase-auth";

describe("supabase-auth", () => {
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

  it("returns direct sb token when present", () => {
    localStorage.setItem("sb-access-token", "token-123");
    expect(getSupabaseAccessToken()).toBe("token-123");
  });

  it("parses nested supabase token payload", () => {
    localStorage.setItem("supabase.auth.token", JSON.stringify({ access_token: "nested-token" }));
    expect(getSupabaseAccessToken()).toBe("nested-token");
  });

  it("returns missing_config when env is absent", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const result = await registerUser({
      email: "a@b.com",
      password: "strong-password",
      name: "Alice",
      handle: "alice",
      bioShort: "short bio",
      roleLabel: "member"
    });
    expect(result).toEqual({ ok: false, reason: "missing_config" });
  });

  it("stores returned access token on successful signup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            access_token: "fresh-token",
            user: { id: "user-1" }
          }),
          { status: 200 }
        )
      )
    );

    const result = await registerUser({
      email: "a@b.com",
      password: "strong-password",
      name: "Alice",
      handle: "@alice",
      bioShort: "short bio",
      roleLabel: "member"
    });

    expect(result).toEqual({ ok: true, userId: "user-1", accessToken: "fresh-token" });
    expect(localStorage.getItem("sb-access-token")).toBe("fresh-token");
  });
});
