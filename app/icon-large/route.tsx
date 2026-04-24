import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(120% 120% at 20% 10%, #22d3ee 0%, #7c3aed 50%, #0b0f19 100%)",
          color: "white",
          fontSize: 300,
          fontWeight: 800,
          letterSpacing: -10,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto"
        }}
      >
        V
      </div>
    ),
    { width: 512, height: 512 }
  );
}
