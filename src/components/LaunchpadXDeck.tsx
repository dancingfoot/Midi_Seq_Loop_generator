import React, { useState, useEffect } from "react";
import { InstrumentTrack } from "../types";
import { Cpu, Zap, Wifi, Play, Square, ChevronDown, ChevronUp, Maximize2, Minimize2, Music, RefreshCw } from "lucide-react";

interface LaunchpadXDeckProps {
  tracks: InstrumentTrack[];
  setTracks: React.Dispatch<React.SetStateAction<InstrumentTrack[]>>;
  swing: number;
  setSwing: React.Dispatch<React.SetStateAction<number>>;
  bpm: number;
  setBpm: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  currentStep: number;
  engine: any;
}

export const LaunchpadXDeck: React.FC<LaunchpadXDeckProps> = ({
  tracks,
  setTracks,
  swing,
  setSwing,
  bpm,
  setBpm,
  isPlaying,
  setIsPlaying,
  currentStep,
  engine,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<"sequencer" | "swingFaders" | "drumPads">("sequencer");
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);

  // Check for Novation Launchpad devices in engine.midiInputs / outputs
  useEffect(() => {
    const checkDevices = () => {
      if (!engine || !engine.midiInputs) return;

      const launchpadInput = engine.midiInputs.find((i: any) =>
        i.name?.toLowerCase().includes("launchpad") || i.name?.toLowerCase().includes("lpx") || i.name?.toLowerCase().includes("lpm")
      );

      if (launchpadInput) {
        setConnectedDevice(launchpadInput.name);
      } else {
        setConnectedDevice(null);
      }
    };

    checkDevices();
    const interval = setInterval(checkDevices, 2000);
    return () => clearInterval(interval);
  }, [engine]);

  // Handle pad press on virtual or physical Launchpad
  const handleGridPadPress = (row: number, col: number) => {
    if (activeMode === "sequencer") {
      // Map 8x8 grid to 16-step sequencer tracks
      // Rows 0 & 1 -> Track 0 (Kick) Steps 0-7 & 8-15
      // Rows 2 & 3 -> Track 1 (Snare) Steps 0-7 & 8-15
      // Rows 4 & 5 -> Track 2 (Closed Hat) Steps 0-7 & 8-15
      // Rows 6 & 7 -> Track 3 (Clap) Steps 0-7 & 8-15
      const trackIdx = Math.floor(row / 2);
      if (trackIdx >= tracks.length) return;

      const isSecondHalf = row % 2 === 1;
      const stepIdx = isSecondHalf ? col + 8 : col;

      setTracks((prev) =>
        prev.map((t, idx) => {
          if (idx === trackIdx) {
            const newSteps = [...t.steps];
            newSteps[stepIdx] = newSteps[stepIdx] === 1 ? 0 : 1;
            return { ...t, steps: newSteps };
          }
          return t;
        })
      );
    } else if (activeMode === "swingFaders") {
      // Column height sets swing percentage in 12.5% increments
      const newSwing = Math.round(((7 - row) / 7) * 100);
      setSwing(newSwing);
    } else if (activeMode === "drumPads") {
      // Trigger voice test tap
      const trackIdx = Math.floor(row / 2) % tracks.length;
      const track = tracks[trackIdx];
      if (track && engine) {
        engine.playTrackInstrument(track.name, 0, track.pitch, 0.9);
      }
    }
  };

  // Top function button handlers
  const handleTopButton = (btn: string) => {
    if (btn === "up") {
      setSwing((prev) => Math.min(100, prev + 5));
    } else if (btn === "down") {
      setSwing((prev) => Math.max(0, prev - 5));
    } else if (btn === "left") {
      setBpm((prev) => Math.max(60, prev - 5));
    } else if (btn === "right") {
      setBpm((prev) => Math.min(200, prev + 5));
    } else if (btn === "session") {
      setIsPlaying((prev) => !prev);
    } else if (btn === "note") {
      setIsPlaying(false);
      engine.stop();
    } else if (btn === "device") {
      setActiveMode("sequencer");
    } else if (btn === "user") {
      setActiveMode("swingFaders");
    }
  };

  // Side scene button handlers
  const handleSceneButton = (sceneIdx: number) => {
    if (sceneIdx === 0) setSwing(0); // Straight
    else if (sceneIdx === 1) setSwing(25); // Light
    else if (sceneIdx === 2) setSwing(50); // Groove
    else if (sceneIdx === 3) setSwing(66); // Triplet
    else if (sceneIdx === 4) setSwing(75); // Heavy
    else if (sceneIdx === 5) setIsPlaying(!isPlaying);
    else if (sceneIdx === 6) setBpm(120);
    else if (sceneIdx === 7) setBpm(140);
  };

  if (isCollapsed) {
    return (
      <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-orange-500 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest font-mono">
              Novation Launchpad X Deck
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {connectedDevice ? `Hardware Connected: ${connectedDevice}` : "Virtual 8x8 Grid Control & Web MIDI Device Deck"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-950/50 p-1 rounded-xl border border-white/5 self-end sm:self-center">
          <button
            onClick={() => setIsCollapsed(false)}
            title="Expand Panel"
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMaximized(true)}
            title="Maximize Panel"
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isMaximized
          ? "fixed inset-0 z-50 bg-[#080808]/98 backdrop-blur-xl p-6 sm:p-8 overflow-y-auto flex flex-col gap-6"
          : "bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-xl space-y-6"
      }
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-orange-500" />
          <div>
            <h2 className="text-base font-bold text-zinc-200 uppercase tracking-widest font-mono flex items-center gap-2">
              Novation Launchpad X Integration
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono">
                8x8 RGB Matrix
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Full hardware & virtual pad support for Novation Launchpad X, Mini, and Pro controllers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/80 rounded-xl border border-white/5 text-xs font-mono">
            <Wifi className={`w-3.5 h-3.5 ${connectedDevice ? "text-emerald-400 animate-pulse" : "text-amber-400"}`} />
            <span className={connectedDevice ? "text-emerald-300 font-bold" : "text-amber-300 font-medium"}>
              {connectedDevice ? `Live: ${connectedDevice}` : "Web MIDI Listening / Virtual Mode"}
            </span>
          </div>

          {/* Collapse / Maximize */}
          <div className="flex items-center gap-1.5 bg-zinc-950/50 p-1 rounded-xl border border-white/5">
            {!isMaximized && (
              <button
                onClick={() => setIsCollapsed(true)}
                title="Collapse Panel"
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore Panel" : "Maximize Panel"}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
            >
              {isMaximized ? (
                <Minimize2 className="w-4 h-4 text-orange-500 animate-pulse" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Mode selection & Launchpad guide */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-zinc-300 uppercase font-mono tracking-wider">
              Launchpad Layout Mode
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveMode("sequencer")}
                className={`py-2 px-2 rounded-xl text-xs font-mono font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  activeMode === "sequencer"
                    ? "bg-orange-500 text-zinc-950 shadow-md font-extrabold"
                    : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5"
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                Sequencer
              </button>
              <button
                onClick={() => setActiveMode("swingFaders")}
                className={`py-2 px-2 rounded-xl text-xs font-mono font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  activeMode === "swingFaders"
                    ? "bg-orange-500 text-zinc-950 shadow-md font-extrabold"
                    : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Swing Faders
              </button>
              <button
                onClick={() => setActiveMode("drumPads")}
                className={`py-2 px-2 rounded-xl text-xs font-mono font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  activeMode === "drumPads"
                    ? "bg-orange-500 text-zinc-950 shadow-md font-extrabold"
                    : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5"
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                Drum Pads
              </button>
            </div>
          </div>

          <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-zinc-300 uppercase font-mono tracking-wider flex items-center justify-between">
              Hardware Map Quick Reference
              <RefreshCw
                onClick={() => engine && engine.updateMidiPorts()}
                className="w-3.5 h-3.5 text-zinc-500 hover:text-orange-400 cursor-pointer"
                title="Rescan MIDI"
              />
            </h3>
            <ul className="text-xs text-zinc-400 space-y-2 font-mono">
              <li className="flex items-center justify-between border-b border-white/5 pb-1">
                <span className="text-orange-400 font-bold">Top Row (CC):</span>
                <span className="text-zinc-300">Up/Down = Swing, Left/Right = BPM</span>
              </li>
              <li className="flex items-center justify-between border-b border-white/5 pb-1">
                <span className="text-orange-400 font-bold">Session / Note:</span>
                <span className="text-zinc-300">Play / Stop Toggle</span>
              </li>
              <li className="flex items-center justify-between border-b border-white/5 pb-1">
                <span className="text-orange-400 font-bold">Side Scenes 1-5:</span>
                <span className="text-zinc-300">Swing Presets (0%, 25%, 50%, 66%, 75%)</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-orange-400 font-bold">8x8 Grid Pads:</span>
                <span className="text-zinc-300">Toggle 16-Step Pattern Rows</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Visual Interactive Novation Launchpad X Controller */}
        <div className="lg:col-span-8 bg-zinc-950 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
            <span className="font-bold text-zinc-200">NOVATION LAUNCHPAD X MATRIX</span>
            <span className="text-orange-400 font-bold">{activeMode.toUpperCase()} MODE ACTIVE</span>
          </div>

          {/* Top Function Button Bar */}
          <div className="flex justify-between items-center gap-2 pb-2">
            <button
              onClick={() => handleTopButton("up")}
              className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-[10px] font-mono font-bold text-zinc-300 border border-white/10 hover:border-orange-500/40 transition"
              title="Swing +5%"
            >
              ▲ SWING+
            </button>
            <button
              onClick={() => handleTopButton("down")}
              className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-[10px] font-mono font-bold text-zinc-300 border border-white/10 hover:border-orange-500/40 transition"
              title="Swing -5%"
            >
              ▼ SWING-
            </button>
            <button
              onClick={() => handleTopButton("left")}
              className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-[10px] font-mono font-bold text-zinc-300 border border-white/10 hover:border-orange-500/40 transition"
              title="BPM -5"
            >
              ◀ BPM-
            </button>
            <button
              onClick={() => handleTopButton("right")}
              className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-[10px] font-mono font-bold text-zinc-300 border border-white/10 hover:border-orange-500/40 transition"
              title="BPM +5"
            >
              ▶ BPM+
            </button>
            <button
              onClick={() => handleTopButton("session")}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition ${
                isPlaying
                  ? "bg-amber-500 text-zinc-950 border-amber-400 font-black shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                  : "bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/25"
              }`}
            >
              SESSION
            </button>
            <button
              onClick={() => handleTopButton("note")}
              className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-[10px] font-mono font-bold text-zinc-300 border border-white/10 transition"
            >
              STOP
            </button>
            <button
              onClick={() => handleTopButton("device")}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition ${
                activeMode === "sequencer" ? "bg-orange-600 text-white border-orange-400" : "bg-zinc-900 text-zinc-400 border-white/10"
              }`}
            >
              SEQ
            </button>
            <button
              onClick={() => handleTopButton("user")}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition ${
                activeMode === "swingFaders" ? "bg-orange-600 text-white border-orange-400" : "bg-zinc-900 text-zinc-400 border-white/10"
              }`}
            >
              SWING
            </button>
          </div>

          {/* Grid + Side Scene Buttons Container */}
          <div className="flex gap-3">
            {/* 8x8 Pad Grid */}
            <div className="grid grid-cols-8 gap-2 flex-1 bg-zinc-900/90 p-3 rounded-xl border border-white/5">
              {Array.from({ length: 8 }).map((_, rowIndex) =>
                Array.from({ length: 8 }).map((_, colIndex) => {
                  // Determine pad state
                  const trackIdx = Math.floor(rowIndex / 2);
                  const track = tracks[trackIdx];
                  const isSecondHalf = rowIndex % 2 === 1;
                  const stepIdx = isSecondHalf ? colIndex + 8 : colIndex;

                  const isActiveStep = track && track.steps[stepIdx] === 1;
                  const isCurrentPlayhead = isPlaying && currentStep % 16 === stepIdx;

                  let padBg = "bg-zinc-950 hover:bg-zinc-800 border-white/5 text-zinc-600";
                  let padGlow = "";

                  if (activeMode === "sequencer") {
                    if (isCurrentPlayhead && isActiveStep) {
                      padBg = "bg-white text-zinc-950 border-cyan-400 font-extrabold";
                      padGlow = "shadow-[0_0_12px_rgba(255,255,255,0.8)]";
                    } else if (isCurrentPlayhead) {
                      padBg = "bg-sky-500 text-zinc-950 border-sky-300 font-extrabold";
                      padGlow = "shadow-[0_0_10px_rgba(56,189,248,0.6)]";
                    } else if (isActiveStep) {
                      padBg = "bg-orange-500 text-zinc-950 border-orange-400 font-bold";
                      padGlow = "shadow-[0_0_8px_rgba(249,115,22,0.4)]";
                    }
                  } else if (activeMode === "swingFaders") {
                    const faderHeight = Math.round((swing / 100) * 7);
                    const isInFader = (7 - rowIndex) <= faderHeight;
                    if (isInFader) {
                      padBg = "bg-orange-500 text-zinc-950 border-orange-400";
                      padGlow = "shadow-[0_0_8px_rgba(249,115,22,0.4)]";
                    }
                  } else if (activeMode === "drumPads") {
                    padBg = "bg-zinc-800 hover:bg-orange-600 text-zinc-300 hover:text-zinc-950 border-white/10";
                  }

                  return (
                    <button
                      key={`pad-${rowIndex}-${colIndex}`}
                      onClick={() => handleGridPadPress(rowIndex, colIndex)}
                      className={`aspect-square rounded-lg border text-[9px] font-mono transition transform active:scale-90 cursor-pointer flex items-center justify-center ${padBg} ${padGlow}`}
                    >
                      {stepIdx + 1}
                    </button>
                  );
                })
              )}
            </div>

            {/* Side Scene Buttons (1-8) */}
            <div className="flex flex-col justify-between gap-2 bg-zinc-900/90 p-2 rounded-xl border border-white/5 w-12">
              {Array.from({ length: 8 }).map((_, sceneIdx) => (
                <button
                  key={`scene-${sceneIdx}`}
                  onClick={() => handleSceneButton(sceneIdx)}
                  className="w-full aspect-square bg-zinc-950 hover:bg-orange-600 hover:text-zinc-950 rounded-lg border border-white/10 text-[9px] font-mono font-bold text-zinc-400 transition flex items-center justify-center cursor-pointer"
                  title={`Scene ${sceneIdx + 1}`}
                >
                  S{sceneIdx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
