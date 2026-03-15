import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";

export const ScorePopup: React.FC<{ score: number; combo: number }> = ({
  score,
  combo,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Score number springs in
  const scoreScale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 120, mass: 0.8 },
  });

  const scoreOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Combo badge slides in after score
  const comboProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  const comboY = interpolate(comboProgress, [0, 1], [20, 0]);
  const comboOpacity = interpolate(comboProgress, [0, 1], [0, 1]);

  // Particle burst
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const distance = interpolate(frame, [2, 20], [0, 60], {
      extrapolateRight: "clamp",
    });
    const particleOpacity = interpolate(frame, [2, 15, 30], [0, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: particleOpacity,
    };
  });

  // Fade out at end
  const fadeOut = interpolate(frame, [32, 42], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "transparent",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Samsung Sharp Sans, Arial, sans-serif",
        opacity: fadeOut,
      }}
    >
      {/* Particle burst */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: i % 2 === 0 ? "#0077FF" : "#00d4ff",
            transform: `translate(${p.x}px, ${p.y}px)`,
            opacity: p.opacity,
          }}
        />
      ))}

      {/* Score number */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: "#ffffff",
          transform: `scale(${scoreScale})`,
          opacity: scoreOpacity,
          textShadow: "0 0 30px rgba(0, 119, 255, 0.6)",
          lineHeight: 1,
        }}
      >
        +{score}
      </div>

      {/* Combo badge */}
      {combo > 1 && (
        <div
          style={{
            marginTop: 8,
            fontSize: 22,
            fontWeight: 700,
            color: "#00d4ff",
            transform: `translateY(${comboY}px)`,
            opacity: comboOpacity,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {combo}x Combo
        </div>
      )}
    </AbsoluteFill>
  );
};
