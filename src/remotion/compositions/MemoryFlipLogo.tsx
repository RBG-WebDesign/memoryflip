import React from "react";
import { AbsoluteFill, staticFile } from "remotion";

const fontUrl = staticFile("fonts/SamsungSharpSans-Bold.ttf");

const fontFace = `
@font-face {
  font-family: 'Samsung Sharp Sans';
  src: url('${fontUrl}') format('truetype');
  font-weight: 700;
  font-style: normal;
}
`;

export const MemoryFlipLogo: React.FC = () => {
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

      {/* Text container */}
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
        <div
          style={{
            fontSize: 140,
            fontWeight: 700,
            letterSpacing: 24,
            background:
              "linear-gradient(180deg, #e8ecf0 0%, #ffffff 20%, #c8d0d8 40%, #f0f4f8 55%, #b0bcc8 70%, #dce4ec 85%, #a8b8c8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
            position: "relative",
            zIndex: 1,
          }}
        >
          MEMORY
        </div>

        {/* FLIP */}
        <div
          style={{
            fontSize: 180,
            fontWeight: 700,
            letterSpacing: 12,
            marginTop: -12,
            position: "relative",
            zIndex: 1,
            background: [
              "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.1) 85%, rgba(255,255,255,0) 100%)",
              "linear-gradient(135deg, #8cb4ff 0%, #7b8ef5 15%, #9b6ce8 30%, #b07cee 45%, #c9a0f5 55%, #b480ee 65%, #9060d8 78%, #7050c0 90%, #6040b0 100%)",
            ].join(", "),
            backgroundBlendMode: "overlay, normal",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: [
              "drop-shadow(0 6px 0px rgba(80,40,160,0.6))",
              "drop-shadow(0 8px 2px rgba(40,20,100,0.4))",
            ].join(" "),
          }}
        >
          FLIP
        </div>
      </div>
    </AbsoluteFill>
  );
};
