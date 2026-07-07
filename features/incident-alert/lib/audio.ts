'use client'

import type { AlertTonePreset } from './preferences.ts'

export function playAlertTone(preset: AlertTonePreset) {
  if (typeof window === 'undefined') return

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextClass) return

  const context = new AudioContextClass()
  const masterGain = context.createGain()
  const compressor = context.createDynamicsCompressor()
  const now = context.currentTime

  compressor.threshold.setValueAtTime(-20, now)
  compressor.knee.setValueAtTime(10, now)
  compressor.ratio.setValueAtTime(8, now)
  compressor.attack.setValueAtTime(0.003, now)
  compressor.release.setValueAtTime(0.18, now)

  const pattern =
    preset === 'siren-pulse'
      ? [
          { frequency: 1040, duration: 0.11, delay: 0, gain: 0.18, type: 'sawtooth' as const },
          { frequency: 720, duration: 0.11, delay: 0.14, gain: 0.18, type: 'sawtooth' as const },
          { frequency: 1040, duration: 0.11, delay: 0.28, gain: 0.18, type: 'sawtooth' as const },
          { frequency: 720, duration: 0.14, delay: 0.42, gain: 0.18, type: 'sawtooth' as const },
        ]
      : preset === 'soft-chime'
        ? [
            { frequency: 660, duration: 0.18, delay: 0, gain: 0.08, type: 'sine' as const },
            { frequency: 880, duration: 0.22, delay: 0.24, gain: 0.06, type: 'sine' as const },
          ]
        : [
            { frequency: 880, duration: 0.12, delay: 0, gain: 0.14, type: 'square' as const },
            { frequency: 880, duration: 0.12, delay: 0.24, gain: 0.14, type: 'square' as const },
          ]

  masterGain.gain.setValueAtTime(
    preset === 'soft-chime' ? 0.22 : preset === 'siren-pulse' ? 0.5 : 0.34,
    now
  )
  masterGain.connect(compressor)
  compressor.connect(context.destination)

  pattern.forEach(note => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = note.type
    oscillator.frequency.setValueAtTime(note.frequency, now + note.delay)
    gain.gain.setValueAtTime(0.0001, now + note.delay)
    gain.gain.exponentialRampToValueAtTime(note.gain, now + note.delay + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration)

    oscillator.connect(gain)
    gain.connect(masterGain)
    oscillator.start(now + note.delay)
    oscillator.stop(now + note.delay + note.duration)
  })

  window.setTimeout(() => {
    void context.close()
  }, 1400)
}
