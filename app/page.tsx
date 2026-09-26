import { SetupCanvas } from '@/components/SetupCanvas'

export default function HomePage() {
  return (
    <main style={{ position: 'fixed', inset: 0 }}>
      <SetupCanvas />
      <p
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 16,
          margin: 0,
          textAlign: 'center',
          fontSize: 14,
          opacity: 0.75,
        }}
      >
        Snake 3D — scaffold. The game arrives in the scene and controls tasks.
      </p>
    </main>
  )
}
