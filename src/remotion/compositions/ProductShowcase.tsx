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

const PRODUCTS: Record<
  string,
  { name: string; subtitle: string; image: string }
> = {
  HBM4: {
    name: "HBM4",
    subtitle: "High Bandwidth Memory",
    image: new URL(
      "../../../assets/Updatedcards/HBM4_PNG 1.png",
      import.meta.url
    ).href,
  },
  GDDR7: {
    name: "GDDR7",
    subtitle: "Graphics Double Data Rate",
    image: new URL(
      "../../../assets/Updatedcards/GDDR7.png",
      import.meta.url
    ).href,
  },
  PM1763: {
    name: "PM1763",
    subtitle: "Enterprise NVMe SSD",
    image: new URL(
      "../../../assets/Updatedcards/PM1763_03.png",
      import.meta.url
    ).href,
  },
};

export const ProductShowcase: React.FC<{ product: string }> = ({
  product,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const data = PRODUCTS[product] ?? PRODUCTS.HBM4;

  // Background gradient rotation
  const bgAngle = interpolate(frame, [0, 150], [0, 360]);

  // Product image entrance
  const imageScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 12, stiffness: 60 },
  });

  const imageY = interpolate(
    spring({ frame: frame - 10, fps, config: { damping: 14, stiffness: 60 } }),
    [0, 1],
    [80, 0]
  );

  // Title entrance
  const titleProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const titleX = interpolate(titleProgress, [0, 1], [-60, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  // Subtitle entrance
  const subtitleProgress = spring({
    frame: frame - 42,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const subtitleOpacity = interpolate(subtitleProgress, [0, 1], [0, 1]);
  const subtitleX = interpolate(subtitleProgress, [0, 1], [-40, 0]);

  // Samsung branding entrance
  const brandOpacity = interpolate(frame, [55, 70], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Accent line animation
  const lineWidth = interpolate(frame, [35, 60], [0, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle glow behind product
  const glowOpacity = interpolate(frame, [20, 45], [0, 0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `conic-gradient(from ${bgAngle}deg at 50% 50%, #060918 0deg, #0b1a3a 90deg, #060918 180deg, #0a1640 270deg, #060918 360deg)`,
        fontFamily: "Samsung Sharp Sans, Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Subtle grid pattern overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,119,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,119,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow behind product */}
      <div
        style={{
          position: "absolute",
          top: "25%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,119,255,0.25) 0%, transparent 70%)",
          opacity: glowOpacity,
        }}
      />

      {/* Product image */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: "50%",
          transform: `translateX(-50%) translateY(${imageY}px) scale(${imageScale})`,
          width: 500,
          height: 500,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Img
          src={data.image}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            filter: "drop-shadow(0 20px 60px rgba(0, 119, 255, 0.3))",
          }}
        />
      </div>

      {/* Text area — bottom section */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 80,
          right: 80,
        }}
      >
        {/* Product name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#ffffff",
            transform: `translateX(${titleX}px)`,
            opacity: titleOpacity,
            letterSpacing: 4,
            lineHeight: 1,
          }}
        >
          {data.name}
        </div>

        {/* Accent line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            background:
              "linear-gradient(90deg, #0077FF, rgba(0,119,255,0.1))",
            marginTop: 16,
            marginBottom: 16,
            borderRadius: 2,
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: 26,
            color: "#7eb8ff",
            transform: `translateX(${subtitleX}px)`,
            opacity: subtitleOpacity,
            letterSpacing: 2,
            fontWeight: 500,
          }}
        >
          {data.subtitle}
        </div>
      </div>

      {/* Samsung branding — top right */}
      <div
        style={{
          position: "absolute",
          top: 40,
          right: 50,
          fontSize: 18,
          fontWeight: 700,
          color: "#ffffff",
          opacity: brandOpacity,
          letterSpacing: 8,
          textTransform: "uppercase",
        }}
      >
        Samsung
      </div>
    </AbsoluteFill>
  );
};
