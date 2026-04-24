export const AUTO_FLAG_OPEN_REPORT_THRESHOLD = 5;

export function shouldAutoFlagPost(openReportCount: number, moderationStatus?: "active" | "flagged" | "hidden") {
  return (
    openReportCount >= AUTO_FLAG_OPEN_REPORT_THRESHOLD &&
    moderationStatus !== "flagged" &&
    moderationStatus !== "hidden"
  );
}
