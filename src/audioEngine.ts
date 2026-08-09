import { InstrumentTrack, AutomationCurve, MidiMapping } from "./types";

export class AudioEngine {
  ctx: AudioContext | null = null;
  noiseBuffer: AudioBuffer | null = null;

  // Playback State
  isPlaying: boolean = false;
  bpm: number = 120;
  swing: number = 0; // Global swing percentage (0 - 100%)
  currentStep: number = 0; // Master step counter (increments infinitely)
  nextStepTime: number = 0.0; // When the next step is due (seconds)
  lookahead: number = 25.0; // How often to call scheduler (ms)
  scheduleAheadTime: number = 0.1; // How far ahead to schedule audio (seconds)
  timerId: any = null;

  // Custom Step states for polyrhythmic tracks
  trackStepIndices: { [trackId: string]: number } = {};
  activeTracks: InstrumentTrack[] = [];
  activeCurves: AutomationCurve[] = [];

  // Audio nodes and references for automation
  synthFilter: BiquadFilterNode | null = null;
  synthVolumeNode: GainNode | null = null;

  // MIDI Access & Mapping
  midiAccess: any = null;
  midiOutputs: any[] = [];
  selectedMidiOutputId: string = "none";
  midiInputs: any[] = [];
  midiMappings: MidiMapping[] = [];
  isMidiLearning: string | null = null; // Stores parameterId being learned

  // Subscriptions for React UI sync
  onStepTrigger: ((stepInfo: { masterStep: number; trackIndices: { [trackId: string]: number } }) => void) | null = null;
  onTrackMutate: ((trackId: string, steps: number[], probabilities: number[]) => void) | null = null;
  onBpmChange: ((bpm: number) => void) | null = null;
  onSwingChange: ((swing: number) => void) | null = null;
  onMidiLearn: ((mapping: MidiMapping) => void) | null = null;
  onMidiActivity: ((message: string) => void) | null = null;

  // Clock sync outputs
  sendMidiClock: boolean = true;
  lastClockTime: number = 0;
  clockStepCount: number = 0;

  constructor() {
    this.initMidi();
  }

  // Initialize AudioContext on first user gesture
  async initAudio() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: "interactive" });
    this.createNoiseBuffer();
  }

  createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  // Initialize MIDI Web API
  async initMidi() {
    if (typeof navigator === "undefined" || !navigator.requestMIDIAccess) {
      this.logMidiActivity("Web MIDI API not supported in this browser. Running virtual simulated ports.");
      return;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      this.updateMidiPorts();
      this.midiAccess.onstatechange = () => this.updateMidiPorts();
    } catch (e) {
      this.logMidiActivity("MIDI Access Denied or failed to load. Running virtual simulated ports.");
    }
  }

  updateMidiPorts() {
    if (!this.midiAccess) return;
    this.midiOutputs = Array.from(this.midiAccess.outputs.values());
    this.midiInputs = Array.from(this.midiAccess.inputs.values());

    // Auto-listen to all MIDI inputs for CC learn
    this.midiInputs.forEach((input) => {
      input.onmidimessage = (event) => this.handleMidiInputMessage(event);
    });

    this.logMidiActivity(`Detected ${this.midiInputs.length} MIDI Inputs and ${this.midiOutputs.length} MIDI Outputs.`);
  }

  // Handle incoming MIDI messages (CC mapping / Note triggering)
  handleMidiInputMessage(event: any) {
    const status = Number(event.data[0]);
    const data1 = Number(event.data[1]);
    const data2 = Number(event.data[2]);
    const command = status & 0xf0;
    const channel = (status & 0x0f) + 1;

    // CC Message
    if (command === 0xb0) {
      const ccNumber = data1;
      const ccValue = data2;

      this.logMidiActivity(`MIDI IN CC (Ch ${channel}): Controller ${ccNumber}, Value ${ccValue}`);

      // MIDI Learn Active
      if (this.isMidiLearning) {
        const parameterId = this.isMidiLearning;
        const mappingIndex = this.midiMappings.findIndex(m => m.parameterId === parameterId);

        const newMapping: MidiMapping = {
          parameterId,
          name: this.getParameterName(parameterId),
          ccNumber,
          channel,
          minVal: 0,
          maxVal: 127,
          currentVal: ccValue,
        };

        if (mappingIndex !== -1) {
          this.midiMappings[mappingIndex] = newMapping;
        } else {
          this.midiMappings.push(newMapping);
        }

        if (this.onMidiLearn) this.onMidiLearn(newMapping);
        this.isMidiLearning = null; // Turn off learn
        this.logMidiActivity(`Mapped CC ${ccNumber} on Ch ${channel} to ${newMapping.name}`);
        return;
      }

      // Match against existing mappings
      const mapping = this.midiMappings.find(m => m.ccNumber === ccNumber && m.channel === channel);
      if (mapping) {
        mapping.currentVal = ccValue;
        this.applyMidiMapping(mapping);
      }
    }
  }

  getParameterName(id: string): string {
    if (id === "bpm") return "Tempo (BPM)";
    if (id === "swing") return "Groove Swing (%)";
    if (id === "synthFilter") return "Synth Filter Cutoff";
    if (id === "synthDecay") return "Synth Decay";
    if (id === "synthVolume") return "Synth Volume";
    if (id.startsWith("track-vol-")) return `Track ${id.split("-")[2]} Volume`;
    return id;
  }

  applyMidiMapping(mapping: MidiMapping) {
    const valNormalized = mapping.currentVal / 127; // 0 to 1

    if (mapping.parameterId === "bpm") {
      const newBpm = Math.round(60 + valNormalized * 140); // 60 - 200 BPM
      this.bpm = newBpm;
      if (this.onBpmChange) this.onBpmChange(newBpm);
    } else if (mapping.parameterId === "swing") {
      const newSwing = Math.round(valNormalized * 100); // 0 - 100%
      this.swing = newSwing;
      if (this.onSwingChange) this.onSwingChange(newSwing);
    } else if (mapping.parameterId === "synthFilter") {
      if (this.synthFilter) {
        const freq = 100 + valNormalized * 12000;
        this.synthFilter.frequency.setValueAtTime(freq, this.ctx?.currentTime || 0);
      }
    } else if (mapping.parameterId === "synthVolume") {
      if (this.synthVolumeNode) {
        this.synthVolumeNode.gain.setValueAtTime(valNormalized, this.ctx?.currentTime || 0);
      }
    }
  }

  startMidiLearn(parameterId: string) {
    this.isMidiLearning = parameterId;
    this.logMidiActivity(`Listening for MIDI CC to map to '${this.getParameterName(parameterId)}'...`);
  }

  logMidiActivity(message: string) {
    if (this.onMidiActivity) {
      this.onMidiActivity(`[${new Date().toLocaleTimeString()}] ${message}`);
    }
  }

  // Get selected MIDI output
  getSelectedOutput(): any | null {
    if (this.selectedMidiOutputId === "none" || !this.midiAccess) return null;
    return this.midiOutputs.find(out => out.id === this.selectedMidiOutputId) || null;
  }

  // Output System Realtime Clock Messages
  sendMidiRealtime(byte: number) {
    const output = this.getSelectedOutput();
    if (output) {
      output.send([byte]);
    }
    // Simulate QmidiNet UDP broadcast packet
    this.logMidiActivity(`RTP-MIDI QmidiNet Broadcast: Sync byte [0x${byte.toString(16).toUpperCase()}]`);
  }

  updateTracks(tracks: InstrumentTrack[]) {
    this.activeTracks = tracks;
  }

  updateCurves(curves: AutomationCurve[]) {
    this.activeCurves = curves;
  }

  // Loop Control
  async start(tracks: InstrumentTrack[], automationCurves: AutomationCurve[]) {
    await this.initAudio();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    this.activeTracks = tracks;
    this.activeCurves = automationCurves;

    this.isPlaying = true;
    this.nextStepTime = this.ctx.currentTime;
    this.timerId = setInterval(() => this.scheduler(this.activeTracks, this.activeCurves), this.lookahead);

    // Send MIDI Realtime Start
    this.sendMidiRealtime(0xfa);
    this.logMidiActivity("Transport Started (MIDI Clock Active)");
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.currentStep = 0;
    this.trackStepIndices = {};

    // Send MIDI Realtime Stop
    this.sendMidiRealtime(0xfc);
    this.logMidiActivity("Transport Stopped");
  }

  scheduler(tracks: InstrumentTrack[], automationCurves: AutomationCurve[]) {
    if (!this.ctx) return;

    // Schedule MIDI Clock pulses (24 clocks per quarter note)
    const clockPeriod = (60.0 / this.bpm) / 24.0;
    while (this.lastClockTime < this.ctx.currentTime + this.scheduleAheadTime) {
      if (this.lastClockTime === 0) {
        this.lastClockTime = this.ctx.currentTime;
      }
      if (this.sendMidiClock) {
        const output = this.getSelectedOutput();
        if (output) {
          output.send([0xf8], this.lastClockTime * 1000);
        }
      }
      this.lastClockTime += clockPeriod;
    }

    // Schedule Sequencer notes
    while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextStepTime, this.activeTracks, this.activeCurves);
      this.advanceStep(this.activeTracks);
    }
  }

  advanceStep(tracks: InstrumentTrack[]) {
    if (!this.ctx) return;
    const secondsPerBeat = 60.0 / this.bpm;
    const stepDuration = secondsPerBeat / 4.0; // 16th notes

    // Update track specific custom step positions for polyrhythmic sequencing
    tracks.forEach((track) => {
      const idx = this.trackStepIndices[track.id] ?? 0;
      const nextIdx = (idx + 1) % track.stepCount;
      this.trackStepIndices[track.id] = nextIdx;

      // Handle loop-level auto-mutation (evolve loops on completion wrap-around)
      if (nextIdx === 0 && (track as any).autoMutate) {
        const chance = (track as any).mutateChance ?? 0.15;
        if (Math.random() < chance && this.onTrackMutate) {
          const newSteps = [...track.steps];
          const newProbs = [...track.probabilities];
          const randStepIdx = Math.floor(Math.random() * track.stepCount);
          
          if (Math.random() < 0.5) {
            // Flip step status
            newSteps[randStepIdx] = newSteps[randStepIdx] === 1 ? 0 : 1;
            this.logMidiActivity(`[Generative Mutation] Flipped step ${randStepIdx + 1} on ${track.name}`);
          } else {
            // Randomly tweak step probability
            const currentProb = newProbs[randStepIdx];
            newProbs[randStepIdx] = parseFloat(Math.max(0.1, Math.min(1.0, currentProb + (Math.random() > 0.5 ? 0.25 : -0.25))).toFixed(2));
            this.logMidiActivity(`[Generative Mutation] Adjusted step ${randStepIdx + 1} probability on ${track.name} to ${Math.round(newProbs[randStepIdx] * 100)}%`);
          }

          // Trigger React update in the next tick
          setTimeout(() => {
            if (this.onTrackMutate) {
              this.onTrackMutate(track.id, newSteps, newProbs);
            }
          }, 0);
        }
      }
    });

    this.currentStep++;
    this.nextStepTime += stepDuration;
  }

  scheduleStep(step: number, time: number, tracks: InstrumentTrack[], automationCurves: AutomationCurve[]) {
    const secondsPerBeat = 60.0 / this.bpm;
    const stepDuration = secondsPerBeat / 4.0; // 16th note duration
    
    let swungTime = time;
    if (step % 2 === 1) {
      // Offset timing of every second 16th note (odd steps) to create a humanized swing/groove feel
      const swingOffset = (this.swing / 100.0) * stepDuration * 0.5;
      swungTime += swingOffset;
    }

    // Notify UI
    if (this.onStepTrigger) {
      // Create a snapshot of current track indices for accurate rendering
      const indicesSnapshot: { [trackId: string]: number } = {};
      tracks.forEach((t) => {
        indicesSnapshot[t.id] = this.trackStepIndices[t.id] ?? 0;
      });
      // Defer to prevent blocking audio thread
      setTimeout(() => {
        if (this.onStepTrigger) {
          this.onStepTrigger({ masterStep: step, trackIndices: indicesSnapshot });
        }
      }, 0);
    }

    // Apply Automation Curves
    this.applyAutomation(step % 16, swungTime, automationCurves);

    // Play Tracks
    tracks.forEach((track) => {
      const trackStepIdx = this.trackStepIndices[track.id] ?? 0;
      const isNoteActive = track.steps[trackStepIdx] === 1;

      if (isNoteActive) {
        // Roll probability
        const prob = track.probabilities[trackStepIdx] ?? 1.0;
        if (Math.random() <= prob) {
          // Pitch Drift (Scale/Key quantized transposition) for generative lead lines
          let finalPitch = track.pitch;
          if ((track as any).pitchDriftChance && Math.random() < (track as any).pitchDriftChance) {
            const driftOffsets = [-12, -7, -5, 5, 7, 12]; // Octaves, Perfect 5ths, and Perfect 4ths
            const offset = driftOffsets[Math.floor(Math.random() * driftOffsets.length)];
            finalPitch = Math.max(24, Math.min(108, finalPitch + offset));
            this.logMidiActivity(`[Generative Drift] Pitched ${track.name} to Note #${finalPitch}`);
          }

          // Ratchetting / note subdivision
          const isRatchet = (track as any).ratchetChance && Math.random() < (track as any).ratchetChance;
          if (isRatchet) {
            const subdivisions = Math.random() < 0.6 ? 2 : 3; // Double-trigger (60%) or Triple-trigger (40%)
            for (let s = 0; s < subdivisions; s++) {
              const subTime = swungTime + (s * (stepDuration / subdivisions));
              const velocityMult = (track as any).humanizeVelocity ? (0.6 + Math.random() * 0.4) : 1.0;
              
              this.playTrackInstrument(track.name, subTime, finalPitch, velocityMult);

              // Send MIDI output per subdivision
              this.sendMidiNoteOut(track.channel, finalPitch, Math.round(velocityMult * 127), (stepDuration / subdivisions) * 0.8, subTime);
            }
            this.logMidiActivity(`[Generative Ratchet] Triggered ${subdivisions}x rolls on ${track.name} at step ${trackStepIdx + 1}`);
          } else {
            const velocityMult = (track as any).humanizeVelocity ? (0.7 + Math.random() * 0.3) : 1.0;
            
            // Play synth or trigger drum sample low latency
            this.playTrackInstrument(track.name, swungTime, finalPitch, velocityMult);

            // Send MIDI output
            this.sendMidiNoteOut(track.channel, finalPitch, Math.round(velocityMult * 127), stepDuration * 0.8, swungTime);
          }
        } else {
          // Visual/activity log of a probability skip
          this.logMidiActivity(`Probability skip on ${track.name} at step ${trackStepIdx + 1}`);
        }
      }
    });

    // Send MIDI Time Code (MTC) simulation logs for external sync
    if (step % 4 === 0) {
      const frameNum = (step / 4) % 8;
      // Send Quarter Frame message
      const output = this.getSelectedOutput();
      if (output) {
        output.send([0xf1, (frameNum << 4) | 0x01], swungTime * 1000);
      }
      this.logMidiActivity(`MTC Sync: Sent Quarter Frame ${frameNum} (Timecode Align)`);
    }
  }

  // Apply automation curve parameters
  applyAutomation(stepIdx: number, time: number, curves: AutomationCurve[]) {
    if (!this.ctx) return;

    curves.forEach((curve) => {
      if (!curve.active) return;
      const val = curve.points[stepIdx];

      // Convert automation value to target parameter values
      if (curve.target === "filterCutoff") {
        if (this.synthFilter) {
          // Exp sweep filter cutoff based on envelope
          const freq = 80 + val * 12000; // 80Hz to 12kHz
          this.synthFilter.frequency.exponentialRampToValueAtTime(freq, time + 0.05);
        }
      } else if (curve.target === "volume") {
        if (this.synthVolumeNode) {
          this.synthVolumeNode.gain.linearRampToValueAtTime(val * 0.8, time + 0.05);
        }
      }
    });
  }

  // Low latency synthesized drum sound nodes
  playTrackInstrument(name: string, time: number, midiNote: number, volMultiplier: number = 1.0) {
    if (!this.ctx) return;

    switch (name) {
      case "Kick":
        this.playSynthesizedKick(time, volMultiplier);
        break;
      case "Snare":
        this.playSynthesizedSnare(time, volMultiplier);
        break;
      case "Closed Hat":
        this.playSynthesizedHat(time, volMultiplier);
        break;
      case "Clap":
        this.playSynthesizedClap(time, volMultiplier);
        break;
      case "Synth":
        this.playSynthesizedLead(time, midiNote, volMultiplier);
        break;
    }
  }

  playSynthesizedKick(time: number, volMultiplier: number = 1.0) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "sine";
    // Rapid exponential sweep of pitch
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.08);

    gain.gain.setValueAtTime(1.2 * volMultiplier, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

    osc.start(time);
    osc.stop(time + 0.26);
  }

  playSynthesizedSnare(time: number, volMultiplier: number = 1.0) {
    if (!this.ctx || !this.noiseBuffer) return;

    // Body Oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.linearRampToValueAtTime(100, time + 0.1);
    oscGain.gain.setValueAtTime(0.5 * volMultiplier, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    // Noise Generator
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(1000, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8 * volMultiplier, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    // Connect noise
    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    // Connect all to output
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    noiseGain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.11);
    noiseNode.start(time);
    noiseNode.stop(time + 0.21);
  }

  playSynthesizedHat(time: number, volMultiplier: number = 1.0) {
    if (!this.ctx || !this.noiseBuffer) return;

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(7500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4 * volMultiplier, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.06);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noiseNode.start(time);
    noiseNode.stop(time + 0.07);
  }

  playSynthesizedClap(time: number, volMultiplier: number = 1.0) {
    if (!this.ctx || !this.noiseBuffer) return;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, time);

    const mainGain = this.ctx.createGain();
    mainGain.connect(this.ctx.destination);

    // 3 ultra short bursts to simulate clapping hands
    for (let i = 0; i < 3; i++) {
      const burstTime = time + i * 0.012;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const burstGain = this.ctx.createGain();

      burstGain.gain.setValueAtTime(0.4 * volMultiplier, burstTime);
      burstGain.gain.exponentialRampToValueAtTime(0.01, burstTime + 0.01);

      noise.connect(filter);
      filter.connect(burstGain);
      burstGain.connect(mainGain);

      noise.start(burstTime);
      noise.stop(burstTime + 0.011);
    }

    // Main decaying tail
    const tailNoise = this.ctx.createBufferSource();
    tailNoise.buffer = this.noiseBuffer;
    const tailGain = this.ctx.createGain();

    tailGain.gain.setValueAtTime(0.5 * volMultiplier, time + 0.036);
    tailGain.gain.exponentialRampToValueAtTime(0.01, time + 0.16);

    tailNoise.connect(filter);
    filter.connect(tailGain);
    tailGain.connect(mainGain);

    tailNoise.start(time + 0.036);
    tailNoise.stop(time + 0.17);
  }

  playSynthesizedLead(time: number, midiNote: number, volMultiplier: number = 1.0) {
    if (!this.ctx) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const ampGain = this.ctx.createGain();

    this.synthFilter = filter;
    this.synthVolumeNode = ampGain;

    // Convert MIDI to frequency
    const freq = Math.pow(2, (midiNote - 69) / 12) * 440;

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = "square";
    osc2.frequency.setValueAtTime(freq * 1.005, time); // Subtle detuning for analog richness

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, time);
    filter.frequency.exponentialRampToValueAtTime(300, time + 0.15); // envelope sweep

    ampGain.gain.setValueAtTime(0.3 * volMultiplier, time);
    ampGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(ampGain);
    ampGain.connect(this.ctx.destination);

    osc1.start(time);
    osc1.stop(time + 0.21);
    osc2.start(time);
    osc2.stop(time + 0.21);
  }

  // Outward Web MIDI Events
  sendMidiNoteOut(channel: number, pitch: number, velocity: number, duration: number, time: number) {
    const output = this.getSelectedOutput();
    if (!output) return;

    const statusOn = 0x90 | (channel - 1);
    const statusOff = 0x80 | (channel - 1);
    const timeMs = time * 1000;

    output.send([statusOn, pitch, velocity], timeMs);
    output.send([statusOff, pitch, 0], timeMs + duration * 1000);

    this.logMidiActivity(`MIDI OUT: NoteOn Ch ${channel}, Key ${pitch}, Vel ${velocity}`);
  }
}
