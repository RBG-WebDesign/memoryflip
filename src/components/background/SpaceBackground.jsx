import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { smoothDamp } from '../../utils/helpers';

const vertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position,1.0);
}
`;

const fragment = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;

uniform float uWarp;
uniform float uWarpDir;
uniform float uWarpPhase;
uniform float uMenuMix;

uniform vec3 uAccent;
uniform float uAccentStrength;
uniform float uGameOver;
uniform float uDepth;

#define PI 3.14159265359
#define MENU_IDLE_WARP 0.18

vec3 menuGradient(vec2 uv){
    vec2 p = uv * 2.0 - 1.0;
    float t = uTime * 0.15;
    float cyan = exp(-length(p - vec2(-0.4,0.4)) * 2.5);
    float purple = exp(-length(p - vec2(0.5,-0.3)) * 2.0);
    float blue = exp(-length(p) * 1.8);
    vec3 col = vec3(0.0);
    col += vec3(0.0,0.8,1.0) * cyan * 0.4;
    col += vec3(0.48,0.17,0.75) * purple * 0.45;
    col += vec3(0.0,0.4,1.0) * blue * 0.25;
    col *= 0.9 + 0.1*sin(t + p.x*3.0);
    return col;
}

vec3 warpTunnel(vec2 fragCoord, float warpAmt){
    float time = (uTime + 29.0) * 60.0;
    float s = 0.0;
    float v = 0.0;
    vec2 uv = (-uResolution.xy + 2.0 * fragCoord) / uResolution.y;
    vec2 drift = vec2(
        sin(uTime * 0.25) * 0.02,
        cos(uTime * 0.2) * 0.015
    );
    uv += drift * warpAmt;
    float t = uWarpPhase;
    uv.x += sin(t * 0.6) * 0.2;
    float si = sin(t * 0.7);
    float co = cos(t);
    uv *= mat2(co, si, -si, co);
    vec3 col = vec3(0.0);
    vec3 init = vec3(
        0.25,
        0.25 + sin(time * 0.001) * 0.1,
        time * 0.0008 * uWarpDir + uDepth
    );
    for(int r = 0; r < 70; r++){
        float depthScale = mix(0.9, 1.4, clamp(warpAmt, 0.0, 1.0));
        vec3 p = init + s * vec3(uv * depthScale, 0.143);
        p.z = mod(p.z,2.0);
        for(int i=0;i<10;i++)
            p = abs(p * 2.04) / dot(p,p) - 0.75;
        v += length(p*p) * smoothstep(0.0,0.5,0.9-s) * 0.002;
        col += vec3(
            v*0.8,
            1.1 - s*0.5,
            0.7 + v*0.5
        ) * v * 0.013;
        s += 0.01;
    }
    return col;
}

void main(){
    vec2 fragCoord = vUv * uResolution;

    float displayWarp = max(uWarp, MENU_IDLE_WARP * uMenuMix);

    vec3 menu = menuGradient(vUv);
    vec3 tunnel = warpTunnel(fragCoord, displayWarp);
    
    float warpBlend = smoothstep(0.02, 0.55, pow(displayWarp, 1.05));
    vec3 col = mix(menu, tunnel, warpBlend);
    
    col += uAccent * uAccentStrength;
    col *= 1.0 + displayWarp * 0.35;
    
    float burst = smoothstep(0.7, 0.9, displayWarp);
    vec2 cp = vUv * 2.0 - 1.0;
    float cd = length(cp);

    col.r += smoothstep(0.3, 0.0, abs(cd - burst * 0.7)) * burst * 0.5;
    col.g += smoothstep(0.3, 0.0, abs(cd - burst * 0.55)) * burst * 0.5;
    col.b += smoothstep(0.3, 0.0, abs(cd - burst * 0.4)) * burst * 0.5;
    col += vec3(0.7, 0.85, 1.0) * exp(-cd * 4.0) * burst * 0.8;
    
    if(uGameOver > 0.0)
        col = mix(col, col * vec3(0.4,0.1,0.1), uGameOver);
        
    float vignette = smoothstep(1.4,0.5,length(vUv*2.0-1.0));
    col *= vignette;
    
    gl_FragColor = vec4(col,1.0);
}
`;

const MENU_IDLE_WARP = 0.18;
const MENU_SPEED_SCALE = 0.05;

const SpaceBackground = forwardRef((props, ref) => {
  const containerRef = useRef();
  const transitionRef = useRef(null);
  
  const state = useRef({
    warp: MENU_IDLE_WARP,
    warpDir: 1,
    warpPhase: 0,
    menuMix: 1,
    menuMixTarget: 1,
    accent: new THREE.Color(0, 0.6, 1),
    accentStrength: 0,
    accentTarget: 0,
    gameOver: 0,
    gameOverTarget: 0,
    depth: 0,
    depthTarget: 0
  });

  function startWarpTransition({ from, peak, to, up, down }) {
    transitionRef.current = {
      start: performance.now(),
      from,
      peak,
      to,
      up,
      down,
      total: up + down
    };
  }

  useImperativeHandle(ref, () => ({
    startGame() {
      state.current.warpDir = 1;
      state.current.menuMixTarget = 0;
      state.current.depthTarget += 1;
      startWarpTransition({
        from: state.current.warp,
        peak: 0.85,
        to: 0.25,
        up: 0.4,
        down: 0.6
      });
    },
    nextRound() {
      state.current.menuMixTarget = 0;
      state.current.warpDir = 1;
      state.current.depthTarget += 0.8;
      startWarpTransition({
        from: state.current.warp,
        peak: 1.0,
        to: 0.2,
        up: 0.35,
        down: 0.6
      });
    },
    correct() {
      state.current.accent.setRGB(0.1, 0.6, 1);
      state.current.accentStrength = 1;
      state.current.accentTarget = 0;
    },
    wrong() {
      state.current.accent.setRGB(1, 0.2, 0.2);
      state.current.accentStrength = 1.2;
      state.current.accentTarget = 0;
    },
    celebrate() {
      state.current.accent.setRGB(1, 0.85, 0.2);
      state.current.accentStrength = 1.5;
      state.current.accentTarget = 0;
    },
    gameOver() {
      state.current.gameOverTarget = 1;
    },
    returnToMenu() {
      state.current.warpDir = -1;
      state.current.menuMixTarget = 1;
      state.current.depthTarget = 0;
      startWarpTransition({
        from: state.current.warp,
        peak: 1.0,
        to: MENU_IDLE_WARP,
        up: 0.3,
        down: 0.55
      });
      setTimeout(() => {
        state.current.gameOverTarget = 0;
      }, 600);
    }
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    renderer.domElement.style.willChange = 'filter, transform';
    container.appendChild(renderer.domElement);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uWarp: { value: MENU_IDLE_WARP },
      uWarpDir: { value: 1 },
      uWarpPhase: { value: 0 },
      uMenuMix: { value: 1 },
      uAccent: { value: new THREE.Color() },
      uAccentStrength: { value: 0 },
      uGameOver: { value: 0 },
      uDepth: { value: 0 }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: uniforms
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const s = state.current;
      const now = performance.now();

      if (transitionRef.current) {
        const tr = transitionRef.current;
        const elapsed = (now - tr.start) / 1000;

        const easeInOut = (x) =>
          x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

        if (elapsed < tr.total) {
          if (elapsed < tr.up) {
            const p = easeInOut(elapsed / tr.up);
            s.warp = THREE.MathUtils.lerp(tr.from, tr.peak, p);
          } else {
            const p = easeInOut((elapsed - tr.up) / tr.down);
            s.warp = THREE.MathUtils.lerp(tr.peak, tr.to, p);
          }
        } else {
          s.warp = tr.to;
          transitionRef.current = null;
        }
      }

      s.menuMix = smoothDamp(s.menuMix, s.menuMixTarget, 3.0, dt);
      s.depth = smoothDamp(s.depth, s.depthTarget, 2.0, dt);
      s.accentStrength = smoothDamp(s.accentStrength, s.accentTarget, 6.0, dt);
      s.gameOver = smoothDamp(s.gameOver, s.gameOverTarget, 2.5, dt);

      const speed = 
        THREE.MathUtils.lerp(0.0005, 0.0035, THREE.MathUtils.clamp(s.warp, 0, 1)) *
        THREE.MathUtils.lerp(1.0, MENU_SPEED_SCALE, s.menuMix);
        
      s.warpPhase += dt * 60.0 * speed * s.warpDir;

      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uWarp.value = THREE.MathUtils.clamp(s.warp, 0, 1);
      uniforms.uWarpDir.value = s.warpDir;
      uniforms.uWarpPhase.value = s.warpPhase;
      uniforms.uMenuMix.value = s.menuMix;
      uniforms.uAccent.value.copy(s.accent);
      uniforms.uAccentStrength.value = s.accentStrength;
      uniforms.uGameOver.value = s.gameOver;
      uniforms.uDepth.value = s.depth;
      
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0, background: "#05060a", zIndex: 0, overflow: "hidden" }} />;
});

export default SpaceBackground;
