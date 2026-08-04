import { ImageResponse } from "next/og";

export const alt =
  "SpatialLab — Small experiments exploring how AI understands the physical world";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Text-driven Open Graph card in the site's field-notes aesthetic. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f5f4ef",
          color: "#171610",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#5b594f",
          }}
        >
          <span>SpatialLab</span>
          <span style={{ color: "#bc3f00" }}>#001 Ask Your Room</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: -3,
            }}
          >
            <span>Spatial</span>
            <span style={{ color: "#bc3f00" }}>Lab</span>
          </div>
          <div
            style={{
              fontSize: 40,
              marginTop: 20,
              color: "#5b594f",
              maxWidth: 900,
              lineHeight: 1.25,
            }}
          >
            Small experiments exploring how AI understands the physical world.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "2px solid #d8d5c8",
            paddingTop: 28,
            fontSize: 26,
            color: "#5b594f",
          }}
        >
          <span>Film your room. Ask it a question.</span>
          <span>by AtThis</span>
        </div>
      </div>
    ),
    size,
  );
}
