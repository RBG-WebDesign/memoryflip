import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
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

export const MemoryFlipLogoIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Shimmer sweep position (starts after intro settles, frame 35+)
  // Sweeps from -20% to 120% over ~25 frames
  const shimmerProgress = interpolate(frame, [35, 58], [-0.2, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
        {/* MEMORY — letter stagger */}
        <div style={{ display: "flex", position: "relative", zIndex: 1 }}>
          {MEMORY_LETTERS.map((letter, i) => {
            const s = spring({
              frame: frame - i * 2,
              fps,
              config: { damping: 12, stiffness: 180, mass: 0.8 },
            });

            const opacity = interpolate(s, [0, 0.3], [0, 1], {
              extrapolateRight: "clamp",
            });
            const y = interpolate(s, [0, 1], [40, 0]);
            const scale = interpolate(s, [0, 0.5, 1], [0.6, 1.08, 1]);

            // Shimmer highlight per letter
            const letterCenter = (i + 0.5) / MEMORY_LETTERS.length;
            const shimmerDist = Math.abs(shimmerProgress - letterCenter);
            const shimmerBright = interpolate(shimmerDist, [0, 0.15], [1.4, 1], {
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
                  opacity,
                  transform: `translateY(${y}px) scale(${scale})`,
                }}
              >
                {letter}
              </div>
            );
          })}
        </div>

        {/* FLIP — letter stagger (delayed after MEMORY) */}
        <div
          style={{
            display: "flex",
            position: "relative",
            zIndex: 1,
            marginTop: -12,
          }}
        >
          {FLIP_LETTERS.map((letter, i) => {
            const delay = MEMORY_LETTERS.length * 2 + 4 + i * 3;
            const s = spring({
              frame: frame - delay,
              fps,
              config: { damping: 10, stiffness: 150, mass: 1 },
            });

            const opacity = interpolate(s, [0, 0.3], [0, 1], {
              extrapolateRight: "clamp",
            });
            const y = interpolate(s, [0, 1], [60, 0]);
            const scale = interpolate(s, [0, 0.4, 1], [0.5, 1.12, 1]);

            // Shimmer highlight per letter
            const letterCenter = (i + 0.5) / FLIP_LETTERS.length;
            const shimmerDist = Math.abs(shimmerProgress - letterCenter);
            const shimmerBright = interpolate(shimmerDist, [0, 0.2], [1.5, 1], {
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
                  filter: `drop-shadow(0 6px 0px rgba(80,40,160,0.6)) drop-shadow(0 8px 2px rgba(40,20,100,0.4)) brightness(${shimmerBright})`,
                  opacity,
                  transform: `translateY(${y}px) scale(${scale})`,
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
