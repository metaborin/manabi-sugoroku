import { useCallback, useEffect, useRef } from 'react';

export type GameAudioCue = 'confirm' | 'roll' | 'step' | 'land' | 'learn' | 'rescue' | 'goal';
interface Note { frequency: number; delay: number; duration: number; strength: number }
interface Voice { oscillator: OscillatorNode; gain: GainNode }
interface AudioResources {
  context: AudioContext;
  master: GainNode;
  voices: Set<Voice>;
}

const tones = { c: 523.25, e: 659.25, g: 783.99, highC: 1046.5 };
const note = (frequency: number, delay = 0, duration = 0.16, strength = 1): Note => ({ frequency, delay, duration, strength });

function notesFor(cue: GameAudioCue, step: number): Note[] {
  switch (cue) {
    case 'confirm': return [note(tones.c, 0, 0.15, 0.65)];
    case 'roll': return [note(392, 0, 0.12, 0.55), note(440, 0.08, 0.12, 0.55), note(tones.c, 0.16, 0.14, 0.65)];
    case 'step': return [note([tones.c, tones.e, tones.g][step % 3], 0, 0.15, 0.55)];
    case 'land': return [note(392, 0, 0.22, 0.65), note(tones.c, 0.06, 0.25, 0.8)];
    case 'learn': return [note(tones.c, 0, 0.2, 0.7), note(tones.e, 0.09, 0.22, 0.75), note(tones.g, 0.18, 0.25, 0.8)];
    case 'rescue': return [note(tones.g / 2, 0, 0.2, 0.65), note(tones.c, 0.08, 0.22, 0.7), note(tones.e, 0.16, 0.24, 0.7), note(tones.g, 0.24, 0.25, 0.8)];
    case 'goal': return [note(tones.c / 2, 0, 0.45, 0.45), note(tones.c, 0, 0.2, 0.65), note(tones.e, 0.08, 0.2, 0.7), note(tones.g, 0.16, 0.23, 0.75), note(tones.highC, 0.24, 0.25, 0.8)];
  }
}

function releaseVoice(resources: AudioResources, voice: Voice) {
  resources.voices.delete(voice);
  voice.oscillator.onended = null;
  try { voice.oscillator.disconnect(); } catch { /* Already disconnected by stop. */ }
  try { voice.gain.disconnect(); } catch { /* Audio is optional. */ }
}

/** Local, optional sound. A user gesture must unlock audio before animation callbacks can play. */
export function useGameAudio(volume: number): { play: (cue: GameAudioCue) => void; stop: () => void } {
  const resourcesRef = useRef<AudioResources | null>(null);
  const generationRef = useRef(0);
  const lastPlayRef = useRef(-Infinity);
  const lastCueRef = useRef<Partial<Record<GameAudioCue, number>>>({});
  const stepRef = useRef(0);
  const level = Number.isFinite(volume) ? Math.max(0, Math.min(50, volume)) / 50 : 0;
  const levelRef = useRef(level);

  const stop = useCallback(() => {
    // Also invalidate notes waiting for the asynchronous browser audio unlock.
    generationRef.current += 1;
    const resources = resourcesRef.current;
    if (!resources) return;
    try {
      resources.master.gain.cancelScheduledValues(resources.context.currentTime);
      resources.master.gain.setValueAtTime(0, resources.context.currentTime);
    } catch { /* A closed or unavailable device cannot block the game. */ }
    for (const voice of [...resources.voices]) {
      try { voice.oscillator.stop(); } catch { /* Includes notes already ended. */ }
      releaseVoice(resources, voice);
    }
  }, []);

  useEffect(() => {
    levelRef.current = level;
    if (level === 0) { stop(); return; }
    const resources = resourcesRef.current;
    if (resources) {
      try { resources.master.gain.setTargetAtTime(level * 0.18, resources.context.currentTime, 0.015); }
      catch { /* Device changes are harmless. */ }
    }
  }, [level, stop]);

  useEffect(() => () => {
    stop();
    const resources = resourcesRef.current;
    resourcesRef.current = null;
    if (resources) {
      try { resources.master.disconnect(); } catch { /* Already disconnected. */ }
      try {
        if (resources.context.state !== 'closed') void resources.context.close().catch(() => {});
      } catch { /* Cleanup must not affect navigation. */ }
    }
  }, [stop]);

  const play = useCallback((cue: GameAudioCue) => {
    if (level === 0) return; // No AudioContext, nodes or resume calls while muted.
    try {
      let resources = resourcesRef.current;
      // Missing activation support deliberately leaves audio optional and silent.
      const userGesture = navigator.userActivation?.isActive === true;
      if (!resources || resources.context.state === 'closed') {
        if (!userGesture || typeof AudioContext === 'undefined') return;
        const context = new AudioContext();
        try {
          const master = context.createGain();
          master.gain.value = 0;
          master.connect(context.destination);
          resources = { context, master, voices: new Set() };
          resourcesRef.current = resources;
        } catch {
          try { void context.close().catch(() => {}); } catch { /* Failed device setup. */ }
          return;
        }
      }
      if (resources.context.state !== 'running' && !userGesture) return;
      const now = performance.now();
      // A held key/double click cannot build up a loud stack of notes.
      if (now - lastPlayRef.current < 55 || now - (lastCueRef.current[cue] ?? -Infinity) < (cue === 'step' ? 65 : 130)) return;
      const notes = notesFor(cue, stepRef.current);
      if (resources.voices.size + notes.length > 12) return;
      lastPlayRef.current = now;
      lastCueRef.current[cue] = now;
      if (cue === 'step') stepRef.current += 1;
      const generation = generationRef.current;
      const activeResources = resources;
      const sound = () => {
        if (generationRef.current !== generation || resourcesRef.current !== activeResources ||
            levelRef.current === 0 || activeResources.context.state !== 'running' ||
            performance.now() - now > 500 || activeResources.voices.size + notes.length > 12) return;
        try {
          const { context, master } = activeResources;
          const start = context.currentTime + 0.005;
          master.gain.cancelScheduledValues(context.currentTime);
          master.gain.setTargetAtTime(levelRef.current * 0.18, context.currentTime, 0.01);
          for (const tone of notes) {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const voice = { oscillator, gain };
            activeResources.voices.add(voice);
            oscillator.onended = () => releaseVoice(activeResources, voice);
            oscillator.type = cue === 'step' || cue === 'roll' ? 'triangle' : 'sine';
            oscillator.frequency.value = tone.frequency;
            const at = start + tone.delay;
            gain.gain.setValueAtTime(0.0001, at);
            gain.gain.linearRampToValueAtTime(0.2 * tone.strength, at + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.0001, at + tone.duration);
            oscillator.connect(gain); gain.connect(master);
            oscillator.start(at); oscillator.stop(at + tone.duration + 0.005);
          }
        } catch { stop(); }
      };
      if (resources.context.state === 'running') sound();
      else void resources.context.resume().then(sound).catch(() => {});
    } catch { /* Audio permission/device failure never changes game state. */ }
  }, [level, stop]);

  return { play, stop };
}
