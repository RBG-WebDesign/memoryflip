import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
} from "remotion";

const ORBIT_RX = 168;
const ORBIT_RY = 70;
const CENTER = 256;

// Each orbit is rotated by this many degrees
const ORBIT_ANGLES = [0, 60, -60];

// Electron starting phase offsets (radians) so they're spread apart
const ELECTRON_PHASE_OFFSETS = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

// Orbit period in frames (how long for one full revolution)
const ORBIT_PERIOD = 90; // 3 seconds at 30fps

/** Get (x, y) for a point on a rotated ellipse at angle t */
function ellipsePoint(
  t: number,
  rx: number,
  ry: number,
  rotDeg: number,
  cx: number,
  cy: number
) {
  const cosR = Math.cos((rotDeg * Math.PI) / 180);
  const sinR = Math.sin((rotDeg * Math.PI) / 180);
  const ex = rx * Math.cos(t);
  const ey = ry * Math.sin(t);
  return {
    x: cx + ex * cosR - ey * sinR,
    y: cy + ex * sinR + ey * cosR,
  };
}

export const AtomAnimation: React.FC<{
  orbitSpeed?: number;
}> = ({ orbitSpeed = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Nucleus pulse ---
  const nucleusPulse =
    1 + 0.06 * Math.sin((frame / fps) * Math.PI * 2 * 1.5);

  const nucleusGlowOpacity = interpolate(
    Math.sin((frame / fps) * Math.PI * 2 * 1.5),
    [-1, 1],
    [0.15, 0.45]
  );

  // --- Electron positions ---
  const baseAngle = ((frame * orbitSpeed) / ORBIT_PERIOD) * Math.PI * 2;

  const electrons = ORBIT_ANGLES.map((rotDeg, i) => {
    const t = baseAngle + ELECTRON_PHASE_OFFSETS[i];
    const pos = ellipsePoint(t, ORBIT_RX, ORBIT_RY, rotDeg, CENTER, CENTER);
    // Determine if electron is "behind" the nucleus (for z-ordering)
    const behindNucleus = Math.sin(t) > 0;
    return { ...pos, behindNucleus, orbitIndex: i };
  });

  // --- Orbit trail glow (rotating dash offset) ---
  const dashOffset = (frame * orbitSpeed * 3) % 1000;

  // Sort electrons: behind-nucleus ones render first (behind)
  const sortedElectrons = [...electrons].sort(
    (a, b) => (b.behindNucleus ? 1 : 0) - (a.behindNucleus ? 1 : 0)
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#060918",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Samsung Sharp Sans, Arial, sans-serif",
      }}
    >
      {/* Main atom container */}
      <div
        style={{
          width: 512,
          height: 512,
          position: "relative",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          width={512}
          height={512}
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <defs>
            <radialGradient id="anim-nucleusGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff6d7" />
              <stop offset="35%" stopColor="#ffb65c" />
              <stop offset="70%" stopColor="#ff6a3d" />
              <stop offset="100%" stopColor="#b61f34" />
            </radialGradient>
            <radialGradient id="anim-electronFill" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#f4fdff" />
              <stop offset="40%" stopColor="#83f2ff" />
              <stop offset="100%" stopColor="#1ba8ff" />
            </radialGradient>
            <filter
              id="anim-softGlow"
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter
              id="anim-nucleusShadow"
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feDropShadow
                dx="0"
                dy="10"
                stdDeviation="12"
                floodColor="#0f2047"
                floodOpacity="0.28"
              />
            </filter>
            <filter
              id="anim-electronGlow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Animated orbit gradient strokes */}
            {ORBIT_ANGLES.map((_, i) => (
              <linearGradient
                key={`grad-${i}`}
                id={`anim-orbitStroke${i}`}
                x1="88"
                y1="256"
                x2="424"
                y2="256"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#74f8ff" stopOpacity={0.18} />
                <stop offset="25%" stopColor="#96fbff" stopOpacity={0.92} />
                <stop offset="50%" stopColor="#d8ffff" stopOpacity={1} />
                <stop offset="75%" stopColor="#8beeff" stopOpacity={0.92} />
                <stop offset="100%" stopColor="#59c6ff" stopOpacity={0.2} />
              </linearGradient>
            ))}
          </defs>

          {/* ---- Orbits ---- */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {ORBIT_ANGLES.map((rotDeg, i) => (
              <React.Fragment key={`orbit-${i}`}>
                {/* Main orbit stroke */}
                <ellipse
                  cx={CENTER}
                  cy={CENTER}
                  rx={ORBIT_RX}
                  ry={ORBIT_RY}
                  transform={`rotate(${rotDeg} ${CENTER} ${CENTER})`}
                  stroke={`url(#anim-orbitStroke${i})`}
                  strokeWidth={12}
                />
                {/* Inner glow line */}
                <ellipse
                  cx={CENTER}
                  cy={CENTER}
                  rx={ORBIT_RX}
                  ry={ORBIT_RY}
                  transform={`rotate(${rotDeg} ${CENTER} ${CENTER})`}
                  stroke="#dffcff"
                  strokeOpacity={0.12}
                  strokeWidth={4}
                />
              </React.Fragment>
            ))}
          </g>

          {/* ---- Electrons behind nucleus ---- */}
          {sortedElectrons
            .filter((e) => e.behindNucleus)
            .map((e) => (
              <g key={`electron-back-${e.orbitIndex}`} filter="url(#anim-electronGlow)">
                {/* Glow halo */}
                <circle
                  cx={e.x}
                  cy={e.y}
                  r={22}
                  fill={
                    ["#61d8ff", "#59bfff", "#67e8ff"][e.orbitIndex]
                  }
                  opacity={0.2}
                />
                {/* Electron body */}
                <circle
                  cx={e.x}
                  cy={e.y}
                  r={14}
                  fill="url(#anim-electronFill)"
                />
                {/* Specular highlight */}
                <circle
                  cx={e.x - 4}
                  cy={e.y - 4}
                  r={4}
                  fill="#f4fdff"
                  opacity={0.7}
                />
              </g>
            ))}

          {/* ---- Nucleus ---- */}
          <g
            filter="url(#anim-nucleusShadow)"
            transform={`translate(${CENTER}, ${CENTER}) scale(${nucleusPulse}) translate(${-CENTER}, ${-CENTER})`}
          >
            <circle cx={232} cy={246} r={34} fill="url(#anim-nucleusGlow)" />
            <circle cx={286} cy={270} r={30} fill="url(#anim-nucleusGlow)" />
            <circle cx={260} cy={220} r={26} fill="url(#anim-nucleusGlow)" />
            <circle cx={250} cy={278} r={24} fill="url(#anim-nucleusGlow)" />
            <circle
              cx={280}
              cy={236}
              r={22}
              fill="#ffd68f"
              opacity={0.92}
            />
            <circle
              cx={242}
              cy={232}
              r={10}
              fill="#fff7df"
              opacity={0.82}
            />
          </g>

          {/* Nucleus ambient glow */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={60}
            fill="#ff8b52"
            opacity={nucleusGlowOpacity}
            filter="url(#anim-softGlow)"
          />

          {/* ---- Electrons in front of nucleus ---- */}
          {sortedElectrons
            .filter((e) => !e.behindNucleus)
            .map((e) => (
              <g key={`electron-front-${e.orbitIndex}`} filter="url(#anim-electronGlow)">
                <circle
                  cx={e.x}
                  cy={e.y}
                  r={22}
                  fill={
                    ["#61d8ff", "#59bfff", "#67e8ff"][e.orbitIndex]
                  }
                  opacity={0.2}
                />
                <circle
                  cx={e.x}
                  cy={e.y}
                  r={14}
                  fill="url(#anim-electronFill)"
                />
                <circle
                  cx={e.x - 4}
                  cy={e.y - 4}
                  r={4}
                  fill="#f4fdff"
                  opacity={0.7}
                />
              </g>
            ))}

          {/* Nucleus top highlight arc */}
          <path
            d="M214 210c18-16 48-18 68-2"
            fill="none"
            stroke="#fff8e4"
            strokeOpacity={0.42}
            strokeWidth={8}
            opacity={0.7}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
