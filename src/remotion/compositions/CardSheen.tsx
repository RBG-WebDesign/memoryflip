import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
  Sequence,
  Img,
} from "remotion";

const CARD_W = 320;
const CARD_H = 448;
const SCALE = 0.85;

/**
 * Animated metallic sheen sweeping across both card faces.
 * - Frames 0–40:  Metallic base card enters + sheen sweep
 * - Frames 40–50: Pause
 * - Frames 50–60: Flip transition
 * - Frames 60–100: Semiconductor gold card + sheen sweep
 * - Frames 100–120: Idle glow
 */
export const CardSheen: React.FC<{
  variant?: "both" | "metallic" | "gold";
}> = ({ variant = "both" }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Card entrance ──
  const enterScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  // ── Flip (only in "both" mode) ──
  const flipStart = 50;
  const flipProgress =
    variant === "both"
      ? spring({
          frame: frame - flipStart,
          fps,
          config: { damping: 16, stiffness: 80 },
        })
      : variant === "gold"
        ? 1
        : 0;
  const rotateY = interpolate(flipProgress, [0, 1], [0, 180]);
  const showGold = rotateY > 90;

  // ── Sheen sweep on metallic (frames 10–35) ──
  const sheenMetallic = interpolate(frame, [10, 35], [-150, CARD_W + 150], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Sheen sweep on gold (frames 65–90) ──
  const sheenGold = interpolate(frame, [65, 90], [-150, CARD_W + 150], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Ambient glow pulse ──
  const d = durationInFrames;
  const glowOpacity = interpolate(
    frame,
    [0, d * 0.17, d * 0.5, d * 0.67, d],
    [0, 0.3, 0.1, 0.5, 0.2],
    { extrapolateRight: "clamp" }
  );

  const metallicSrc = new URL(
    "../../assets/cards/card-metallic-base.svg",
    import.meta.url
  ).href;
  const goldSrc = new URL(
    "../../assets/cards/card-semiconductor-gold.svg",
    import.meta.url
  ).href;

  const sheenGradient = (pos: number, warm: boolean) => {
    const base = warm
      ? "rgba(255, 240, 180, 0.0)"
      : "rgba(255, 255, 255, 0.0)";
    const peak = warm
      ? "rgba(255, 230, 150, 0.45)"
      : "rgba(255, 255, 255, 0.15)";
    return `linear-gradient(105deg, ${base} 0%, ${peak} 45%, ${peak} 55%, ${base} 100%)`;
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#060918",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Ambient glow behind card */}
      <div
        style={{
          position: "absolute",
          width: CARD_W * SCALE * 1.6,
          height: CARD_H * SCALE * 1.4,
          borderRadius: "50%",
          background: showGold
            ? "radial-gradient(circle, rgba(210,160,50,0.35) 0%, rgba(160,110,20,0.12) 50%, transparent 75%)"
            : "radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, transparent 75%)",
          opacity: glowOpacity,
          pointerEvents: "none",
          transition: "background 0.3s",
        }}
      />

      {/* Card wrapper with 3D flip */}
      <div
        style={{
          width: CARD_W * SCALE,
          height: CARD_H * SCALE,
          transform: `scale(${enterScale}) rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
          perspective: 1200,
          position: "relative",
        }}
      >
        {/* ── Front face: Metallic base ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            overflow: "hidden",
          }}
        >
          <Img
            src={metallicSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          {/* Sheen overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: sheenMetallic,
              width: 100,
              height: "100%",
              background: sheenGradient(sheenMetallic, false),
              transform: "skewX(-12deg)",
              pointerEvents: "none",
              filter: "blur(2px)",
            }}
          />
        </div>

        {/* ── Back face: Semiconductor gold ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            overflow: "hidden",
          }}
        >
          <Img
            src={goldSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          {/* Warm sheen overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: sheenGold,
              width: 120,
              height: "100%",
              background: sheenGradient(sheenGold, true),
              transform: "skewX(-12deg)",
              pointerEvents: "none",
              filter: "blur(3px)",
            }}
          />
        </div>
      </div>

      {/* Corner label */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 28,
          color: "rgba(255,255,255,0.25)",
          fontSize: 12,
          fontFamily: "Samsung Sharp Sans, Arial, sans-serif",
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        {showGold ? "Semiconductor Gold" : "Card Base"}
      </div>
    </AbsoluteFill>
  );
};
