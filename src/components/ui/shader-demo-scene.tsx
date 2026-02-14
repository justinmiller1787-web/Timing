"use client"

import { Canvas } from "@react-three/fiber"
import { ShaderPlane, EnergyRing } from "./background-paper-shaders"

interface ShaderDemoSceneProps {
  speed?: number
  intensity?: number
  mode?: "shader" | "rings" | "combined"
}

function Scene({ speed = 1, intensity = 1.5, mode }: ShaderDemoSceneProps) {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      {(mode === "shader" || mode === "combined") && (
        <>
          <ShaderPlane position={[0, 0, -1]} color1="#000000" color2="#1a1a1a" />
          <ShaderPlane position={[0.3, 0.2, -0.5]} color1="#1a1a1a" color2="#333333" />
          <ShaderPlane position={[-0.2, -0.1, 0]} color1="#333333" color2="#ffffff" />
        </>
      )}

      {(mode === "rings" || mode === "combined") && (
        <>
          <EnergyRing radius={1.2} position={[0.2, 0.1, -0.3]} />
          <EnergyRing radius={0.9} position={[-0.3, -0.2, -0.5]} />
          <EnergyRing radius={0.6} position={[0, 0.2, 0]} />
        </>
      )}
    </>
  )
}

export function ShaderDemoScene({ speed = 1, intensity = 1.5, mode = "shader" }: ShaderDemoSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <Scene speed={speed} intensity={intensity} mode={mode} />
    </Canvas>
  )
}
