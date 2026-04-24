import { AUTO_FLAG_OPEN_REPORT_THRESHOLD, shouldAutoFlagPost } from "@/lib/moderation-policy";

describe("moderation-policy", () => {
  it("uses threshold 5 for auto-flagging", () => {
    expect(AUTO_FLAG_OPEN_REPORT_THRESHOLD).toBe(5);
  });

  it("auto flags active posts once threshold is reached", () => {
    expect(shouldAutoFlagPost(5, "active")).toBe(true);
    expect(shouldAutoFlagPost(8, "active")).toBe(true);
  });

  it("does not auto flag below threshold or already moderated posts", () => {
    expect(shouldAutoFlagPost(4, "active")).toBe(false);
    expect(shouldAutoFlagPost(7, "flagged")).toBe(false);
    expect(shouldAutoFlagPost(9, "hidden")).toBe(false);
  });
});
