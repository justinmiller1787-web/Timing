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
    float t = time * 0.2;
    
    // Diagonal drift - low freq, irrational multiples for organic feel
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
    float t = time * 0.16;
    
    // Multi-pass domain warp - organic distortion, different speeds per axis
    vec2 uv = vUv;
    uv.x += sin(uv.y * 2.1 + t * 0.3) * 0.035;
    uv.y += cos(uv.x * 1.7 + t * 0.22) * 0.035;
    uv.x += sin(uv.x * 3.2 + uv.y * 1.4 + t * 0.12) * 0.02;
    uv.y += cos(uv.y * 2.8 + uv.x * 1.1 + t * 0.18) * 0.02;
    
    // Layered wave field - many scales, different speeds, breaks coherence
    float a = sin(uv.x * 1.2 + t * 0.35) * 0.5 + 0.5;
    float b = cos(uv.y * 1.5 + t * 0.28) * 0.5 + 0.5;
    float c = sin((uv.x * 0.9 + uv.y * 1.1) + t * 0.4) * 0.5 + 0.5;
    float d = cos(uv.x * 2.3 - uv.y * 1.6 + t * 0.15) * 0.5 + 0.5;
    float e = sin(uv.y * 1.8 + uv.x * 0.7 + t * 0.32) * 0.5 + 0.5;
    
    // Blend with uneven weights - avoids uniform averaging
    float field = a * 0.25 + b * 0.22 + c * 0.2 + d * 0.18 + e * 0.15;
    
    // Fine turbulence - breaks up wave fronts, adds organic texture
    float fine = sin(uv.x * 4.1 + uv.y * 3.7 + t * 0.5) * 0.5 + 0.5;
    fine = fine * (sin(uv.y * 5.2 - uv.x * 2.9 + t * 0.35) * 0.5 + 0.5);
    field = field * 0.92 + smoothstep(0.2, 0.8, fine) * 0.08;
    
    // Soft compression - keep most values in mid range, avoid extreme clustering
    field = smoothstep(0.2, 0.8, field);
    field = field * 0.85 + 0.075;
    
    // Position-dependent modulation - different regions drift differently
    float drift = sin(uv.x * 0.8 + uv.y * 0.6 + t * 0.2) * 0.5 + 0.5;
    field = field + (drift - 0.5) * 0.08;
    field = smoothstep(0.0, 1.0, field);
    
    float bright = field;
    
    // Grayscale: emphasize mid tones, rare highlights
    vec3 dark = vec3(0.1);
    vec3 midDark = vec3(0.28);
    vec3 mid = vec3(0.48);
    vec3 midLight = vec3(0.68);
    vec3 light = vec3(0.82);
    vec3 nearWhite = vec3(0.92);
    
    vec3 color = mix(dark, midDark, smoothstep(0.0, 0.35, bright));
    color = mix(color, mid, smoothstep(0.25, 0.55, bright));
    color = mix(color, midLight, smoothstep(0.45, 0.75, bright));
    color = mix(color, light, smoothstep(0.6, 0.9, bright));
    color = mix(color, nearWhite, smoothstep(0.85, 0.97, bright));
    
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
