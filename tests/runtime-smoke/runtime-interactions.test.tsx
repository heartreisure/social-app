import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock("@/lib/supabase-auth", () => ({
  getAuthenticatedUser: vi.fn(),
  getSupabaseAccessToken: vi.fn(),
  registerUser: vi.fn()
}));

vi.mock("@/lib/supabase-rest", () => ({
  upsertUserProfile: vi.fn(),
  createPostReport: vi.fn(),
  fetchPostReports: vi.fn(),
  fetchPostsForModeration: vi.fn(),
  fetchUserProfiles: vi.fn(),
  moderatePost: vi.fn(),
  reviewPostReport: vi.fn()
}));

vi.mock("@/lib/social-data", () => ({
  getFeedPosts: vi.fn(),
  getProfileData: vi.fn()
}));

import AuthPage from "@/app/auth/page";
import AdminPage from "@/app/(main)/admin/page";
import FeedPage from "@/app/(main)/feed/page";
import ProfilePage from "@/app/(main)/profile/page";
import { getAuthenticatedUser, getSupabaseAccessToken, registerUser } from "@/lib/supabase-auth";
import {
  createPostReport,
  fetchPostReports,
  fetchPostsForModeration,
  fetchUserProfiles,
  moderatePost,
  reviewPostReport,
  upsertUserProfile
} from "@/lib/supabase-rest";
import { getFeedPosts, getProfileData } from "@/lib/social-data";

describe("runtime smoke interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseAccessToken).mockReturnValue("token");
  });

  it("auth page accepts user input and triggers submit flow", async () => {
    vi.mocked(registerUser).mockResolvedValue({
      ok: true,
      userId: "user-1",
      accessToken: "token"
    });
    vi.mocked(upsertUserProfile).mockResolvedValue(true);

    render(<AuthPage />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "sprint3@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password (min 6)"), {
      target: { value: "secret123" }
    });
    fireEvent.change(screen.getByPlaceholderText("Display name"), { target: { value: "Sprint User" } });
    fireEvent.change(screen.getByPlaceholderText("@handle"), { target: { value: "@sprint3" } });
    fireEvent.change(screen.getByPlaceholderText("Role (e.g. Student, Builder)"), {
      target: { value: "Builder" }
    });
    fireEvent.change(screen.getByPlaceholderText("Short bio (1-2 lines)"), {
      target: { value: "runtime smoke bio" }
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));
    await screen.findByText("Account created. Welcome to Social Vibe.");
  });

  it("feed page supports report interaction path", async () => {
    vi.mocked(getFeedPosts).mockResolvedValue([
      {
        id: "p1",
        userId: "u1",
        authorName: "Viber",
        body: "runtime post",
        createdAt: new Date().toISOString(),
        vibeColor: "from-cyan-500 to-fuchsia-500"
      }
    ]);
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "u2" } as Awaited<
      ReturnType<typeof getAuthenticatedUser>
    >);
    vi.mocked(createPostReport).mockResolvedValue(true);

    render(<FeedPage />);
    const reportButton = await screen.findByRole("button", { name: "Report" });
    fireEvent.click(reportButton);

    await waitFor(() => expect(createPostReport).toHaveBeenCalledTimes(1));
    await screen.findByText("Report submitted.");
  });

  it("profile page renders runtime-loaded summary", async () => {
    vi.mocked(getProfileData).mockResolvedValue({
      user: { id: "u1", name: "Runtime User", handle: "@runtime" },
      userPosts: [],
      postCount: 0,
      vibeStreak: 0
    });

    render(<ProfilePage />);
    await screen.findByText("Runtime User");
    await screen.findByText("Your post history");
  });

  it("admin page enforces role gate for non-admin user", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: "u3",
      user_metadata: { role_label: "member" }
    } as Awaited<ReturnType<typeof getAuthenticatedUser>>);
    vi.mocked(fetchUserProfiles).mockResolvedValue([]);
    vi.mocked(fetchPostsForModeration).mockResolvedValue([]);
    vi.mocked(fetchPostReports).mockResolvedValue([]);
    vi.mocked(moderatePost).mockResolvedValue(true);
    vi.mocked(reviewPostReport).mockResolvedValue(true);

    render(<AdminPage />);
    await screen.findByText("Admin only");
  });
});
