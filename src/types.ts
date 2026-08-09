export interface InstrumentTrack {
  id: string;
  name: "Kick" | "Snare" | "Closed Hat" | "Clap" | "Synth";
  color: string;
  steps: number[]; // 1 for active, 0 for inactive
  probabilities: number[]; // Float between 0.0 and 1.0 per step
  stepCount: number; // For polyrhythms, tracks can have custom step counts (e.g., 5, 7, 12, 16)
  pitch: number; // Base MIDI note number for MIDI Output or Synth pitch
  channel: number; // MIDI Channel (1-16)
  autoMutate?: boolean; // Continuously mutate steps slightly on loop boundaries
  mutateChance?: number; // 0.0 - 1.0 chance of mutation occurring when autoMutate is active
  ratchetChance?: number; // 0.0 - 1.0 probability of note subdivisions (drum rolls / ratchets)
  humanizeVelocity?: boolean; // Tweak velocity/gain randomly for organic variations
  pitchDriftChance?: number; // 0.0 - 1.0 probability of lead melody pitch shifting within key
}

export interface AutomationCurve {
  id: string;
  name: string;
  target: "filterCutoff" | "decay" | "pitch" | "volume" | "pan";
  points: number[]; // 16 values mapped to the 16 steps or loop phase
  color: string;
  active: boolean;
}

export interface MidiMapping {
  parameterId: string; // e.g. 'bpm', 'track-volume-0', 'cutoff', etc.
  name: string; // Human readable name
  ccNumber: number; // MIDI CC Controller number
  channel: number; // MIDI Channel
  minVal: number;
  maxVal: number;
  currentVal: number;
}

export interface JamPeer {
  id: string;
  name: string;
}

export interface BeatPreset {
  name: string;
  genre: string;
  bpm: number;
  tracks: {
    name: "Kick" | "Snare" | "Closed Hat" | "Clap" | "Synth";
    steps: number[];
    probabilities?: number[];
    stepCount?: number;
  }[];
}

export interface ScalePreset {
  name: string;
  notes: number[]; // Relative semitones from root
  mode: string;
}
