'use client'

import { Canvas } from '@react-three/fiber'
import { VoxelGlobe } from '@/components/dashboard/JourneyConsole'

// The voxel corridor globe, reused as a backdrop on the pitch slides.
export default function PitchGlobe({ progress = 0.5, opacity = 1 }: { progress?: number; opacity?: number }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.4], fov: 42 }}
      gl={{ alpha: true, antialias: true }}
      style={{ position: 'absolute', inset: 0, opacity }}
    >
      <ambientLight intensity={0.7} />
      <VoxelGlobe progress={progress} blocked={false} active labels={false} />
    </Canvas>
  )
}
