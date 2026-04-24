import { submitPost } from "@/lib/social-data";

vi.mock("@/lib/supabase-auth", () => ({
  getAuthenticatedUser: vi.fn(),
  getSupabaseAccessToken: vi.fn()
}));

vi.mock("@/lib/supabase-rest", () => ({
  createPost: vi.fn(),
  fetchPosts: vi.fn(),
  fetchUserPosts: vi.fn()
}));

import { getAuthenticatedUser, getSupabaseAccessToken } from "@/lib/supabase-auth";
import { createPost } from "@/lib/supabase-rest";

describe("social-data submitPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseAccessToken).mockReturnValue("token-123");
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as Awaited<
      ReturnType<typeof getAuthenticatedUser>
    >);
  });

  it("rejects empty payload", async () => {
    const result = await submitPost("   ");
    expect(result).toEqual({ ok: false, reason: "empty" });
  });

  it("returns insert_failed when insert fails", async () => {
    vi.mocked(createPost).mockResolvedValue(null);
    const result = await submitPost("hello vibe");
    expect(result).toEqual({ ok: false, reason: "insert_failed" });
  });

  it("returns ok when createPost succeeds", async () => {
    vi.mocked(createPost).mockResolvedValue({
      id: "p1",
      user_id: "user-1",
      body: "hello vibe",
      created_at: new Date().toISOString()
    });

    const result = await submitPost("hello vibe");

    expect(result).toEqual({ ok: true });
    expect(createPost).toHaveBeenCalledWith({
      userId: "user-1",
      body: "hello vibe",
      accessToken: "token-123"
    });
  });
});
