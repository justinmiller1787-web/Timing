"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

// Custom shader material - natural flowing grayscale gradient
const vertexShader = `
  uniform float time;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    
    vec3 pos = position;
    float t = time * 0.22;
    
    // Diagonal drift - low freq, offset frequencies (not clean multiples)
    float w1 = sin(pos.x * 1.37 + pos.y * 1.21 + t) * 0.5;
    float w2 = cos(pos.x * 0.89 - pos.y * 1.53 + t * 0.73) * 0.5;
    float w3 = sin(pos.x * 1.07 + pos.y * 0.97 + t * 0.61) * 0.5;
    float blend = (w1 + w2 + w3) / 3.0;
    
    pos.z += blend * 0.05;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  uniform float time;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    float t = time * 0.18;
    
    // Primary domain warp - slow waves offset uv
    vec2 warp1 = vec2(
      sin(vUv.y * 2.7 + t * 0.4) * 0.04 + sin(vUv.x * 1.8 + t * 0.2) * 0.02,
      cos(vUv.x * 2.3 + t * 0.35) * 0.04 + cos(vUv.y * 1.5 + t * 0.25) * 0.02
    );
    vec2 uv = vUv + warp1;
    
    // Secondary warp - breaks symmetry
    uv.x += sin(uv.y * 3.1 + t * 0.15) * 0.015;
    uv.y += cos(uv.x * 2.9 + t * 0.18) * 0.015;
    
    // Large-scale wave field - horizontal, vertical, diagonal (low freq = wide bands)
    float horiz = sin(uv.x * 1.8 + t * 0.5) * 0.5 + 0.5;
    float vert = cos(uv.y * 2.1 + t * 0.4) * 0.5 + 0.5;
    float diag = sin((uv.x + uv.y) * 1.5 + t * 0.55) * 0.5 + 0.5;
    
    // Average - wide flowing bands, no single peak
    float raw = (horiz * 0.35 + vert * 0.35 + diag * 0.3);
    raw = smoothstep(0.15, 0.85, raw);
    
    // Add subtle offset layer - breaks predictable spacing
    float off = sin(uv.x * 1.23 + uv.y * 1.87 + t * 0.2) * 0.5 + 0.5;
    off = smoothstep(0.3, 0.7, off);
    raw = raw * 0.8 + off * 0.2;
    
    float bright = smoothstep(0.0, 1.0, raw);
    
    // Grayscale: dark gray baseline, wide mid, light, rare near-white (no pure black/white)
    vec3 dark = vec3(0.08);
    vec3 midDark = vec3(0.22);
    vec3 mid = vec3(0.42);
    vec3 midLight = vec3(0.62);
    vec3 light = vec3(0.82);
    vec3 nearWhite = vec3(0.95);
    
    vec3 color = mix(dark, midDark, smoothstep(0.0, 0.3, bright));
    color = mix(color, mid, smoothstep(0.2, 0.5, bright));
    color = mix(color, midLight, smoothstep(0.4, 0.7, bright));
    color = mix(color, light, smoothstep(0.55, 0.85, bright));
    color = mix(color, nearWhite, smoothstep(0.8, 0.98, bright));
    
    gl_FragColor = vec4(color, 0.98);
  }
`

export function ShaderPlane({
  position,
  color1 = "#ff5722",
  color2 = "#ffffff",
}: {
  position: [number, number, number]
  color1?: string
  color2?: string
}) {
  const mesh = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
    }),
    [],
  )

  useFrame((state) => {
    if (mesh.current) {
      uniforms.time.value = state.clock.elapsedTime * 0.4
    }
  })

  return (
    <mesh ref={mesh} position={position}>
      <planeGeometry args={[2, 2, 128, 128]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export function EnergyRing({
  radius = 1,
  position = [0, 0, 0],
}: {
  radius?: number
  position?: [number, number, number]
}) {
  const mesh = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.z = state.clock.elapsedTime
      ;(mesh.current.material as THREE.MeshBasicMaterial).opacity =
        0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.3
    }
  })

  return (
    <mesh ref={mesh} position={position}>
      <ringGeometry args={[radius * 0.8, radius, 32]} />
      <meshBasicMaterial color="#ff5722" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  )
}
