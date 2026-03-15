import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
  Img,
  Sequence,
} from "remotion";
import { ALL_ICONS } from "../../constants/config";

export const CardReveal: React.FC<{ iconIndex: number }> = ({ iconIndex }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const icon = ALL_ICONS[iconIndex % ALL_ICONS.length];

  // Card back fades in, then flips to reveal
  const enterScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const flipProgress = spring({
    frame: frame - 25,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  const rotateY = interpolate(flipProgress, [0, 1], [180, 0]);

  // Glow pulse after reveal
  const glowOpacity = interpolate(frame, [55, 70, 85], [0, 0.7, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Shimmer line sweeping across the card
  const shimmerX = interpolate(frame, [60, 80], [-100, 500], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cardBackGradient =
    "linear-gradient(135deg, #111111 0%, #0a0a0a 40%, #050505 100%)";

  const showFront = rotateY < 90;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#060918",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Samsung Sharp Sans, Arial, sans-serif",
      }}
    >
      {/* Card container */}
      <div
        style={{
          width: 280,
          height: 400,
          transform: `scale(${enterScale}) rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
          perspective: 1000,
          borderRadius: 20,
          position: "relative",
        }}
      >
        {showFront ? (
          /* Card front — icon */
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 20,
              background:
                "linear-gradient(145deg, #0d1b3e 0%, #0a1230 50%, #060918 100%)",
              border: "2px solid rgba(0, 119, 255, 0.3)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Img
              src={icon.icon}
              style={{
                width: 140,
                height: 140,
                objectFit: "contain",
                filter: "drop-shadow(0 0 20px rgba(0, 119, 255, 0.4))",
              }}
            />
            <div
              style={{
                marginTop: 20,
                color: "#7eb8ff",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {icon.name}
            </div>

            {/* Shimmer effect */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: shimmerX,
                width: 60,
                height: "100%",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
                transform: "skewX(-15deg)",
                pointerEvents: "none",
              }}
            />
          </div>
        ) : (
          /* Card back — Samsung branded */
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 20,
              background: cardBackGradient,
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              transform: "rotateY(180deg)",
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "rgba(255, 255, 255, 0.15)",
                letterSpacing: 6,
                textTransform: "uppercase",
              }}
            >
              SAMSUNG
            </div>
          </div>
        )}
      </div>

      {/* Glow burst behind card */}
      <div
        style={{
          position: "absolute",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,119,255,0.4) 0%, rgba(0,60,180,0.15) 40%, transparent 70%)",
          opacity: glowOpacity,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
