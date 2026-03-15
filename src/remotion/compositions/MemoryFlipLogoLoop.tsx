import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  staticFile,
} from "remotion";

const fontUrl = staticFile("fonts/SamsungSharpSans-Bold.ttf");

const fontFace = `
@font-face {
  font-family: 'Samsung Sharp Sans';
  src: url('${fontUrl}') format('truetype');
  font-weight: 700;
  font-style: normal;
}
`;

const MEMORY_LETTERS = "MEMORY".split("");
const FLIP_LETTERS = "FLIP".split("");

const MEMORY_GRADIENT =
  "linear-gradient(180deg, #e8ecf0 0%, #ffffff 20%, #c8d0d8 40%, #f0f4f8 55%, #b0bcc8 70%, #dce4ec 85%, #a8b8c8 100%)";

const FLIP_GRADIENT = [
  "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.1) 85%, rgba(255,255,255,0) 100%)",
  "linear-gradient(135deg, #8cb4ff 0%, #7b8ef5 15%, #9b6ce8 30%, #b07cee 45%, #c9a0f5 55%, #b480ee 65%, #9060d8 78%, #7050c0 90%, #6040b0 100%)",
].join(", ");

export const MemoryFlipLogoLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Normalize frame to 0-1 for seamless looping
  const t = frame / durationInFrames;

  // Shimmer sweep: travels from left to right across both words
  // Uses a sine-based easing for smooth start/stop feel
  const shimmerX = interpolate(t, [0.05, 0.45], [-0.3, 1.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Breathing glow pulse on FLIP (subtle)
  const breathe = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const flipGlowOpacity = interpolate(breathe, [0, 1], [0.4, 0.7]);

  return (
    <AbsoluteFill
      style={{
        background: "transparent",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Samsung Sharp Sans, Arial, sans-serif",
      }}
    >
      <style>{fontFace}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          lineHeight: 1.05,
          position: "relative",
        }}
      >
        {/* MEMORY */}
        <div style={{ display: "flex", position: "relative", zIndex: 1 }}>
          {MEMORY_LETTERS.map((letter, i) => {
            const letterCenter = (i + 0.5) / MEMORY_LETTERS.length;
            const shimmerDist = Math.abs(shimmerX - letterCenter);
            const shimmerBright = interpolate(shimmerDist, [0, 0.12], [1.5, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  fontSize: 140,
                  fontWeight: 700,
                  letterSpacing: 24,
                  background: MEMORY_GRADIENT,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.5)) brightness(${shimmerBright})`,
                }}
              >
                {letter}
              </div>
            );
          })}
        </div>

        {/* FLIP */}
        <div
          style={{
            display: "flex",
            position: "relative",
            zIndex: 1,
            marginTop: -12,
          }}
        >
          {FLIP_LETTERS.map((letter, i) => {
            const letterCenter = (i + 0.5) / FLIP_LETTERS.length;
            const shimmerDist = Math.abs(shimmerX - letterCenter);
            const shimmerBright = interpolate(shimmerDist, [0, 0.18], [1.6, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  fontSize: 180,
                  fontWeight: 700,
                  letterSpacing: 12,
                  background: FLIP_GRADIENT,
                  backgroundBlendMode: "overlay, normal",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: `drop-shadow(0 6px 0px rgba(80,40,160,${flipGlowOpacity})) drop-shadow(0 8px 2px rgba(40,20,100,0.4)) brightness(${shimmerBright})`,
                }}
              >
                {letter}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
