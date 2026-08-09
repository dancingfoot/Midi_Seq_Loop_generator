import React, { useState, useEffect, useRef } from "react";
import { InstrumentTrack, AutomationCurve, MidiMapping, BeatPreset } from "./types";
import { AudioEngine } from "./audioEngine";
import { SequencerGrid } from "./components/SequencerGrid";
import { ScaleSelector } from "./components/ScaleSelector";
import { AutomationCanvas } from "./components/AutomationCanvas";
import { MidiMappingPanel } from "./components/MidiMappingPanel";
import { JamSyncPanel } from "./components/JamSyncPanel";
import { AiTranscription } from "./components/AiTranscription";
import { SwingWaveform } from "./components/SwingWaveform";
import { LaunchpadXDeck } from "./components/LaunchpadXDeck";
import { Play, Square, Volume2, Music, Cable, Wifi, Sparkles, HelpCircle } from "lucide-react";

// Initialize single instance of AudioEngine once
const engine = new AudioEngine();

export default function App() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(120);
  const [swing, setSwing] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [trackStepIndices, setTrackStepIndices] = useState<{ [trackId: string]: number }>({});
  const [selectedScale, setSelectedScale] = useState<string>("Ionian (Major)");
  const [rootNote, setRootNote] = useState<string>("C");

  // Sequencer tracks state
  const [tracks, setTracks] = useState<InstrumentTrack[]>([
    {
      id: "track-kick",
      name: "Kick",
      color: "#ef4444", // Red
      steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      probabilities: Array(16).fill(1.0),
      stepCount: 16,
      pitch: 36, // Classic General MIDI Kick note
      channel: 10, // Classic General MIDI drum channel
    },
    {
      id: "track-snare",
      name: "Snare",
      color: "#f97316", // Orange
      steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      probabilities: Array(16).fill(1.0),
      stepCount: 16,
      pitch: 38, // Classic General MIDI Snare
      channel: 10,
    },
    {
      id: "track-closed-hat",
      name: "Closed Hat",
      color: "#06b6d4", // Cyan
      steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
      probabilities: Array(16).fill(1.0),
      stepCount: 16,
      pitch: 42, // Classic General MIDI Closed Hat
      channel: 10,
    },
    {
      id: "track-clap",
      name: "Clap",
      color: "#a855f7", // Purple
      steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      probabilities: Array(16).fill(1.0),
      stepCount: 16,
      pitch: 39, // Classic General MIDI Clap
      channel: 10,
    },
    {
      id: "track-synth",
      name: "Synth",
      color: "#10b981", // Emerald
      steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      probabilities: Array(16).fill(1.0),
      stepCount: 16,
      pitch: 60, // C4
      channel: 1,
    },
  ]);

  // Automation curves state
  const [curves, setCurves] = useState<AutomationCurve[]>([
    {
      id: "curve-cutoff",
      name: "Filter Cutoff (Hz)",
      target: "filterCutoff",
      points: Array(16).fill(0.5),
      color: "#3b82f6", // Blue
      active: true,
    },
    {
      id: "curve-volume",
      name: "Synth Gain Volume",
      target: "volume",
      points: Array(16).fill(0.8),
      color: "#ec4899", // Pink
      active: true,
    },
  ]);

  // MIDI CC Mappings state
  const [mappings, setMappings] = useState<MidiMapping[]>([]);
  const [midiActivity, setMidiActivity] = useState<string[]>([]);
  const [selectedMidiOutput, setSelectedMidiOutput] = useState<string>("none");

  // Keep AudioEngine parameters synced with state
  useEffect(() => {
    engine.bpm = bpm;
  }, [bpm]);

  useEffect(() => {
    engine.swing = swing;
  }, [swing]);

  useEffect(() => {
    engine.updateTracks(tracks);
  }, [tracks]);

  useEffect(() => {
    engine.updateCurves(curves);
  }, [curves]);

  // Handle active playback step ticks from the AudioEngine
  useEffect(() => {
    engine.onStepTrigger = (stepInfo) => {
      setCurrentStep(stepInfo.masterStep);
      setTrackStepIndices(stepInfo.trackIndices);
    };

    engine.onTrackMutate = (trackId, newSteps, newProbs) => {
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, steps: newSteps, probabilities: newProbs } : t))
      );
    };

    engine.onMidiActivity = (msg) => {
      setMidiActivity((prev) => [...prev, msg].slice(-25)); // Cap log
    };

    engine.onBpmChange = (newBpm) => {
      setBpm(newBpm);
    };

    engine.onSwingChange = (newSwing) => {
      setSwing(newSwing);
    };
  }, []);

  // Recalculate Synth base pitch whenever Scale or Root Note changes
  useEffect(() => {
    const semitonesMap: { [key: string]: number } = {
      C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11
    };
    const rootOffset = semitonesMap[rootNote] ?? 0;
    const baseMidi = 48 + rootOffset; // Bass range (C3)

    setTracks((prev) =>
      prev.map((t) => (t.id === "track-synth" ? { ...t, pitch: baseMidi } : t))
    );
  }, [selectedScale, rootNote]);

  // Transport commands
  const handlePlayToggle = async () => {
    if (isPlaying) {
      engine.stop();
      setIsPlaying(false);
    } else {
      await engine.start(tracks, curves);
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    engine.stop();
    setIsPlaying(false);
    setCurrentStep(0);
    setTrackStepIndices({});
  };

  // Live Tap testing pads for sound checking
  const handleTapCheck = (trackName: string, midiPitch: number) => {
    engine.initAudio();
    engine.playTrackInstrument(trackName, engine.ctx?.currentTime || 0, midiPitch);
    engine.sendMidiNoteOut(1, midiPitch, 110, 0.1, engine.ctx?.currentTime || 0);
  };

  // Load beat preset
  const handleLoadPreset = (preset: BeatPreset) => {
    setBpm(preset.bpm);
    setTracks((prev) =>
      prev.map((track) => {
        const pTrack = preset.tracks.find((pt) => pt.name === track.name);
        if (pTrack) {
          const count = pTrack.stepCount ?? 16;
          const fullSteps = Array(count).fill(0);
          const fullProbs = Array(count).fill(1.0);
          for (let i = 0; i < count; i++) {
            fullSteps[i] = pTrack.steps[i] !== undefined ? pTrack.steps[i] : 0;
            if (pTrack.probabilities && pTrack.probabilities[i] !== undefined) {
              fullProbs[i] = pTrack.probabilities[i];
            }
          }
          return {
            ...track,
            steps: fullSteps,
            probabilities: fullProbs,
            stepCount: count,
          };
        }
        return track;
      })
    );
    engine.logMidiActivity(`Loaded Preset Beat: ${preset.name}`);
  };

  // AI Transcription Loaded Handler
  const handleTranscriptionLoaded = (data: { bpm: number; tracks: any[]; notes?: any[] }) => {
    setBpm(data.bpm);
    setTracks((prev) =>
      prev.map((track) => {
        const transTrack = data.tracks.find((t) => t.name.toLowerCase() === track.name.toLowerCase());
        if (transTrack) {
          const count = 16;
          const fullSteps = Array(count).fill(0);
          const fullProbs = Array(count).fill(1.0);
          for (let i = 0; i < count; i++) {
            fullSteps[i] = transTrack.steps[i] !== undefined ? transTrack.steps[i] : 0;
            if (transTrack.probabilities && transTrack.probabilities[i] !== undefined) {
              fullProbs[i] = transTrack.probabilities[i];
            }
          }
          return {
            ...track,
            steps: fullSteps,
            probabilities: fullProbs,
            stepCount: count,
          };
        }
        return track;
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-300 font-sans flex flex-col gap-6 p-4 sm:p-8 selection:bg-orange-500/30 antialiased">
      
      {/* TOP NAVIGATION / STATUS BAR */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center px-6 py-4 border border-white/10 bg-zinc-900/50 backdrop-blur-md rounded-2xl shadow-xl gap-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Master Clock</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-white">{bpm.toFixed(2)}</span>
              <span className="text-xs opacity-50">BPM</span>
            </div>
          </div>
          <div className="hidden sm:block h-8 w-px bg-white/10"></div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-green-500 uppercase tracking-tighter">Ableton Link</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">RTP MIDI / QMIDINET</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-between xl:justify-end">
          <div className="bg-zinc-950 px-4 py-2 rounded-lg border border-white/5 flex items-center gap-4">
            <div className="text-center">
              <div className="text-[9px] uppercase opacity-40 leading-none mb-1">Mode</div>
              <div className="text-xs font-bold text-white">POLY-SEQ</div>
            </div>
            <div className="h-6 w-px bg-white/10"></div>
            <div className="text-center">
              <div className="text-[9px] uppercase opacity-40 leading-none mb-1">Scale</div>
              <div className="text-xs font-bold text-orange-400 uppercase">{selectedScale}</div>
            </div>
            <div className="h-6 w-px bg-white/10"></div>
            <div className="text-center">
              <div className="text-[9px] uppercase opacity-40 leading-none mb-1">Key</div>
              <div className="text-xs font-bold text-orange-400">{rootNote}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-zinc-950 border border-white/10 px-3 py-2 rounded-lg text-xs w-full sm:w-auto justify-between">
              <span className="text-zinc-400 font-medium">MIDI Out:</span>
              <select
                value={selectedMidiOutput}
                onChange={(e) => {
                  setSelectedMidiOutput(e.target.value);
                  engine.selectedMidiOutputId = e.target.value;
                  engine.logMidiActivity(`Routed MIDI Out to port: ${e.target.value}`);
                }}
                className="bg-transparent text-orange-400 border-none outline-none font-mono font-semibold cursor-pointer max-w-[120px]"
              >
                <option value="none" className="bg-zinc-950 text-zinc-400">None / Virtual</option>
                {engine.midiOutputs.map((out) => (
                  <option key={out.id} value={out.id} className="bg-zinc-950 text-zinc-200">
                    {out.name}
                  </option>
                ))}
              </select>
            </div>

            <button 
              onClick={handlePlayToggle}
              className={`px-6 py-2.5 rounded font-bold text-sm shadow-[0_0_20px_rgba(234,88,12,0.3)] transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                isPlaying 
                  ? "bg-amber-500 hover:bg-amber-400 text-zinc-950" 
                  : "bg-orange-600 hover:bg-orange-500 text-white"
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isPlaying ? "fill-zinc-950 text-zinc-950" : "fill-white text-white"}`} />
              {isPlaying ? "LIVE PLAYING" : "LIVE RECORD"}
            </button>
          </div>
        </div>
      </header>

      {/* Main performance Deck Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Playback Controls & Instrument Pads (3-columns) */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Deck Master Control */}
          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest font-mono">
              Transport Deck
            </h3>

            {/* BPM slider / numeric setter */}
            <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400 font-medium">Master Tempo</span>
                <span className="text-lg font-mono font-black text-orange-400">{bpm} BPM</span>
              </div>
              <input
                type="range"
                min="60"
                max="200"
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            {/* Swing Slider & D3 Waveform */}
            <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-400 font-medium">Groove Swing</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-tight font-mono">16th Note Offset</span>
                </div>
                <span className="text-lg font-mono font-black text-orange-400">{swing}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={swing}
                onChange={(e) => setSwing(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                id="swing-slider"
              />

              {/* D3 Visual Swing Waveform Graph */}
              <div className="pt-1">
                <SwingWaveform
                  swing={swing}
                  bpm={bpm}
                  isPlaying={isPlaying}
                  currentStep={currentStep}
                  onSwingChange={setSwing}
                />
              </div>
            </div>

            {/* Start / Stop big buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePlayToggle}
                className={`py-3.5 px-4 rounded-xl font-sans font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(234,88,12,0.15)] ${
                  isPlaying
                    ? "bg-orange-500 text-black border border-orange-400 font-extrabold"
                    : "bg-zinc-950 border border-white/5 hover:border-white/20 text-zinc-200"
                }`}
              >
                <Play className={`w-4 h-4 ${isPlaying ? "fill-black" : ""}`} />
                {isPlaying ? "Pause" : "Play"}
              </button>

              <button
                onClick={handleStop}
                className="py-3.5 px-4 bg-zinc-950 hover:bg-zinc-900 border border-white/5 hover:border-white/20 rounded-xl font-sans font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer text-zinc-300"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            </div>
          </div>

          {/* Low Latency Tap pads */}
          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-orange-500" />
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest font-mono">
                Hardware Voice Check
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Tap these pads to trigger the internal low-latency synth voices manually. Useful for tuning external gear.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onMouseDown={() => handleTapCheck("Kick", 36)}
                onTouchStart={() => handleTapCheck("Kick", 36)}
                className="py-3 bg-zinc-950 hover:bg-zinc-900 border border-white/5 hover:border-white/25 active:scale-95 transition rounded-xl text-xs font-mono font-bold text-zinc-300 cursor-pointer"
              >
                🥁 Kick (C1)
              </button>
              <button
                onMouseDown={() => handleTapCheck("Snare", 38)}
                onTouchStart={() => handleTapCheck("Snare", 38)}
                className="py-3 bg-zinc-950 hover:bg-zinc-900 border border-white/5 hover:border-white/25 active:scale-95 transition rounded-xl text-xs font-mono font-bold text-zinc-300 cursor-pointer"
              >
                🥁 Snare (D1)
              </button>
              <button
                onMouseDown={() => handleTapCheck("Closed Hat", 42)}
                onTouchStart={() => handleTapCheck("Closed Hat", 42)}
                className="py-3 bg-zinc-950 hover:bg-zinc-900 border border-white/5 hover:border-white/25 active:scale-95 transition rounded-xl text-xs font-mono font-bold text-zinc-300 cursor-pointer"
              >
                🔊 Closed Hat (F#1)
              </button>
              <button
                onMouseDown={() => handleTapCheck("Clap", 39)}
                onTouchStart={() => handleTapCheck("Clap", 39)}
                className="py-3 bg-zinc-950 hover:bg-zinc-900 border border-white/5 hover:border-white/25 active:scale-95 transition rounded-xl text-xs font-mono font-bold text-zinc-300 cursor-pointer"
              >
                👏 Clap (D#1)
              </button>
            </div>

            <button
              onMouseDown={() => handleTapCheck("Synth", 60)}
              onTouchStart={() => handleTapCheck("Synth", 60)}
              className="w-full py-3.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 active:scale-98 transition rounded-xl text-xs font-mono font-bold text-orange-400 cursor-pointer shadow-[0_0_15px_rgba(234,88,12,0.05)]"
            >
              🎹 Synth Lead (C4)
            </button>
          </div>

        </div>

        {/* Central performance sequencer deck (9-columns) */}
        <div className="xl:col-span-9 space-y-6">
          
          {/* Main Sequencer Grid */}
          <SequencerGrid
            tracks={tracks}
            setTracks={setTracks}
            trackStepIndices={trackStepIndices}
            isPlaying={isPlaying}
            engine={engine}
          />

          {/* Presets and Quantizers */}
          <ScaleSelector
            onLoadPreset={handleLoadPreset}
            selectedScale={selectedScale}
            setSelectedScale={setSelectedScale}
            rootNote={rootNote}
            setRootNote={setRootNote}
          />

          {/* Live Modulation Automation */}
          <AutomationCanvas
            curves={curves}
            setCurves={setCurves}
            currentStep={currentStep}
            isPlaying={isPlaying}
          />

          {/* AI Transcription and Sync Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AiTranscription
              onTranscriptionLoaded={handleTranscriptionLoaded}
              tracks={tracks}
              bpm={bpm}
              selectedScale={selectedScale}
            />
            <JamSyncPanel
              isPlaying={isPlaying}
              bpm={bpm}
              onTempoChange={setBpm}
              onTransportChange={setIsPlaying}
              currentStep={currentStep}
              engine={engine}
            />
          </div>

          {/* Novation Launchpad X Device & Virtual Deck */}
          <LaunchpadXDeck
            tracks={tracks}
            setTracks={setTracks}
            swing={swing}
            setSwing={setSwing}
            bpm={bpm}
            setBpm={setBpm}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            currentStep={currentStep}
            engine={engine}
          />

          {/* MIDI Controller learning mappings */}
          <MidiMappingPanel
            engine={engine}
            mappings={mappings}
            setMappings={setMappings}
            midiActivity={midiActivity}
            setMidiActivity={setMidiActivity}
          />

        </div>

      </div>
    </div>
  );
}
