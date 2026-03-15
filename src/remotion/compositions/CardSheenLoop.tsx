import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
  Img,
} from "remotion";

/**
 * Game-optimized metallic sheen loop.
 * Renders at exact card dimensions (320×448) with transparent background.
 * Designed for WebM alpha export → in-game card back replacement.
 */
export const CardSheenLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Sheen sweeps frames 8–28 (20 frames ≈ 0.67s), then pauses until loop restart.
  // At frame 0 and frame 59, sheen is fully off-screen → seamless loop.
  const sheenX = interpolate(frame, [8, 28], [-120, 440], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle sheen opacity fade-in/out for smoother edges
  const sheenOpacity = interpolate(
    frame,
    [8, 12, 24, 28],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const metallicSrc = new URL(
    "../../assets/cards/card-metallic-base.svg",
    import.meta.url
  ).href;

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      {/* Metallic base card — fills entire canvas */}
      <Img
        src={metallicSrc}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      {/* Sheen sweep overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: sheenX,
          width: 100,
          height: "100%",
          opacity: sheenOpacity,
          background: `linear-gradient(
            105deg,
            rgba(255, 255, 255, 0.0) 0%,
            rgba(255, 255, 255, 0.06) 35%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(255, 255, 255, 0.06) 65%,
            rgba(255, 255, 255, 0.0) 100%
          )`,
          transform: "skewX(-12deg)",
          pointerEvents: "none",
          filter: "blur(2px)",
        }}
      />
    </AbsoluteFill>
  );
};
