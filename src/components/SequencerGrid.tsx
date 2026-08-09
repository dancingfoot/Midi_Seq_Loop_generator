import React, { useState } from "react";
import { InstrumentTrack } from "../types";
import { Sparkles, Dices, ChevronRight, Settings2, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";

interface SequencerGridProps {
  tracks: InstrumentTrack[];
  setTracks: React.Dispatch<React.SetStateAction<InstrumentTrack[]>>;
  trackStepIndices: { [trackId: string]: number };
  isPlaying: boolean;
  engine: any;
}

export const SequencerGrid: React.FC<SequencerGridProps> = ({
  tracks,
  setTracks,
  trackStepIndices,
  isPlaying,
  engine,
}) => {
  const [viewMode, setViewMode] = useState<"notes" | "probability">("notes");
  const [selectedTrackSettings, setSelectedTrackSettings] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Toggle step trigger
  const handleStepToggle = (trackId: string, stepIdx: number) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const newSteps = [...t.steps];
          newSteps[stepIdx] = newSteps[stepIdx] === 1 ? 0 : 1;
          return { ...t, steps: newSteps };
        }
        return t;
      })
    );
  };

  // Adjust step probability (0.0 - 1.0)
  const handleProbabilityChange = (trackId: string, stepIdx: number, val: number) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const newProbs = [...t.probabilities];
          newProbs[stepIdx] = Math.max(0, Math.min(1, val));
          return { ...t, probabilities: newProbs };
        }
        return t;
      })
    );
  };

  // Adjust track step length (for polyrhythmic patterns)
  const handleStepCountChange = (trackId: string, count: number) => {
    const clampedCount = Math.max(1, Math.min(16, count));
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          // Adjust steps and probabilities arrays to match the new length
          const newSteps = Array(clampedCount).fill(0);
          const newProbs = Array(clampedCount).fill(1.0);
          for (let i = 0; i < clampedCount; i++) {
            newSteps[i] = t.steps[i] !== undefined ? t.steps[i] : 0;
            newProbs[i] = t.probabilities[i] !== undefined ? t.probabilities[i] : 1.0;
          }
          return { ...t, stepCount: clampedCount, steps: newSteps, probabilities: newProbs };
        }
        return t;
      })
    );
  };

  // Adjust base MIDI pitch
  const handlePitchChange = (trackId: string, pitch: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, pitch: Math.max(0, Math.min(127, pitch)) } : t))
    );
  };

  // Adjust MIDI Channel
  const handleChannelChange = (trackId: string, channel: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, channel: Math.max(1, Math.min(16, channel)) } : t))
    );
  };

  // Adjust custom track level parameters (e.g., generative options)
  const handleTrackPropertyChange = (trackId: string, property: keyof InstrumentTrack, val: any) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, [property]: val } : t))
    );
  };

  // Fill/Clear/Randomize helpers
  const clearTrack = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, steps: Array(t.stepCount).fill(0) } : t))
    );
  };

  const fillTrack = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, steps: Array(t.stepCount).fill(1) } : t))
    );
  };

  const randomizeTrack = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const randSteps = Array(t.stepCount)
            .fill(0)
            .map(() => (Math.random() > 0.6 ? 1 : 0));
          const randProbs = Array(t.stepCount)
            .fill(1.0)
            .map(() => parseFloat((0.4 + Math.random() * 0.6).toFixed(2)));
          return { ...t, steps: randSteps, probabilities: randProbs };
        }
        return t;
      })
    );
  };

  if (isCollapsed) {
    return (
      <div id="sequencer-container" className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-sans font-bold text-white flex items-center gap-2">
            Polyrhythmic Sequencer Grid
            <span className="text-[10px] font-mono font-bold text-orange-500 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
              Low Latency Web Audio
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Toggle notes, set independent loop lengths per track, and slide trigger probabilities.
          </p>
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
      id="sequencer-container"
      className={
        isMaximized
          ? "fixed inset-0 z-50 bg-[#080808]/98 backdrop-blur-xl p-6 sm:p-8 overflow-y-auto flex flex-col gap-6"
          : "bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-xl"
      }
    >
      {/* Header View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-sans font-bold text-white flex items-center gap-2">
            Polyrhythmic Sequencer Grid
            <span className="text-[10px] font-mono font-bold text-orange-500 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
              Low Latency Web Audio
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Toggle notes, set independent loop lengths per track, and slide trigger probabilities.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          {/* View togglers */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setViewMode("notes")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "notes"
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Notes Mode
            </button>
            <button
              onClick={() => setViewMode("probability")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "probability"
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Probability Gate
            </button>
          </div>

          {/* Collapse & Maximize buttons */}
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

      {/* Grid Container */}
      <div className="space-y-6">
        {tracks.map((track) => {
          const currentStepIdx = trackStepIndices[track.id] ?? 0;

          return (
            <div
              key={track.id}
              className="bg-zinc-950/60 border border-white/5 rounded-xl p-4 transition-all hover:border-white/15"
            >
              {/* Track Info Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shadow-lg"
                    style={{ backgroundColor: track.color, boxShadow: `0 0 10px ${track.color}` }}
                  />
                  <span className="font-sans font-bold text-zinc-200 w-24">
                    {track.name}
                  </span>
                  <div className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded border border-white/5 text-[10px] font-mono text-zinc-400">
                    <span className="opacity-60">Len:</span>
                    <button
                      onClick={() => handleStepCountChange(track.id, track.stepCount - 1)}
                      className="text-orange-500 hover:text-orange-400 px-1 font-black cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-zinc-100 font-bold px-1">{track.stepCount}</span>
                    <button
                      onClick={() => handleStepCountChange(track.id, track.stepCount + 1)}
                      className="text-orange-500 hover:text-orange-400 px-1 font-black cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Track Operations & Setting triggers */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => randomizeTrack(track.id)}
                    title="Randomize track notes"
                    className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-orange-400 rounded border border-white/5 transition cursor-pointer"
                  >
                    <Dices className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => clearTrack(track.id)}
                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-[10px] font-mono rounded border border-white/5 transition cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => fillTrack(track.id)}
                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-[10px] font-mono rounded border border-white/5 transition cursor-pointer"
                  >
                    Fill All
                  </button>
                  <button
                    onClick={() =>
                      setSelectedTrackSettings(selectedTrackSettings === track.id ? null : track.id)
                    }
                    className={`p-1.5 rounded border transition cursor-pointer ${
                      selectedTrackSettings === track.id
                        ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                        : "bg-zinc-900 hover:bg-zinc-850 border-white/5 text-zinc-400"
                    }`}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Extra settings drawer */}
              {selectedTrackSettings === track.id && (
                <div className="bg-zinc-900/80 border border-white/10 rounded-lg p-4 mb-4 text-xs space-y-4">
                  {/* Row 1: Pitch & Channel */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1 font-mono font-bold">
                        MIDI Transmit Pitch
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="24"
                          max="96"
                          value={track.pitch}
                          onChange={(e) => handlePitchChange(track.id, parseInt(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <span className="font-mono text-orange-400 min-w-[24px]">
                          {track.pitch}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1 font-mono font-bold">
                        MIDI Output Channel
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="1"
                          max="16"
                          value={track.channel}
                          onChange={(e) => handleChannelChange(track.id, parseInt(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <span className="font-mono text-orange-400 min-w-[24px]">
                          Ch {track.channel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Generative & Probability Variations Section */}
                  <div className="pt-3 border-t border-white/5">
                    <h4 className="text-[10px] uppercase tracking-widest text-orange-400 mb-3 font-mono font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Live Generative Variations & Probability
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Subdivisions / Ratchet */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-zinc-300 font-mono">Ratchet Roll Probability</span>
                          <span className="font-mono text-orange-400">{Math.round((track.ratchetChance ?? 0) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round((track.ratchetChance ?? 0) * 100)}
                          onChange={(e) => handleTrackPropertyChange(track.id, "ratchetChance", parseInt(e.target.value) / 100)}
                          className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-orange-500"
                        />
                        <p className="text-[9px] text-zinc-500 italic">Adds random double or triple sub-divisions on notes.</p>
                      </div>

                      {/* Pitch Drift or Velocity Humanizing */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-zinc-300 font-mono">Pitch Drift Probability</span>
                          <span className="font-mono text-orange-400">{Math.round((track.pitchDriftChance ?? 0) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round((track.pitchDriftChance ?? 0) * 100)}
                          onChange={(e) => handleTrackPropertyChange(track.id, "pitchDriftChance", parseInt(e.target.value) / 100)}
                          className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-orange-500"
                        />
                        <p className="text-[9px] text-zinc-500 italic">Shifts pitch randomly within chord scale intervals.</p>
                      </div>

                      {/* Auto Mutate Loop */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-300 font-mono">Evolving Loop Mutation</span>
                          <button
                            onClick={() => handleTrackPropertyChange(track.id, "autoMutate", !track.autoMutate)}
                            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                              track.autoMutate 
                                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" 
                                : "bg-zinc-800 text-zinc-400 border border-white/5"
                            }`}
                          >
                            {track.autoMutate ? "ACTIVE" : "DISABLED"}
                          </button>
                        </div>
                        
                        {track.autoMutate && (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[9px] text-zinc-400">
                              <span>Mutation Rate</span>
                              <span>{Math.round((track.mutateChance ?? 0.15) * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="5"
                              max="60"
                              value={Math.round((track.mutateChance ?? 0.15) * 100)}
                              onChange={(e) => handleTrackPropertyChange(track.id, "mutateChance", parseInt(e.target.value) / 100)}
                              className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-orange-500"
                            />
                          </div>
                        )}
                        <p className="text-[9px] text-zinc-500 italic">Auto-mutates grid notes/probabilities on every loop cycle.</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-4 justify-between items-center text-[10px] text-zinc-400 border-t border-white/5 mt-3">
                      <div className="flex items-center gap-2">
                        <input
                          id={`humanize-${track.id}`}
                          type="checkbox"
                          checked={track.humanizeVelocity ?? false}
                          onChange={(e) => handleTrackPropertyChange(track.id, "humanizeVelocity", e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-white/10 bg-zinc-950 text-orange-500 focus:ring-0 accent-orange-500 cursor-pointer"
                        />
                        <label htmlFor={`humanize-${track.id}`} className="font-mono cursor-pointer select-none">
                          Humanize Trigger Velocities (Randomize gain +/- 15%)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step Buttons Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-16 gap-2">
                {Array(track.stepCount)
                  .fill(0)
                  .map((_, idx) => {
                    const isPlayhead = isPlaying && currentStepIdx === idx;
                    const isTriggered = track.steps[idx] === 1;
                    const prob = track.probabilities[idx] ?? 1.0;

                    if (viewMode === "notes") {
                      return (
                        <button
                          key={idx}
                          onClick={() => handleStepToggle(track.id, idx)}
                          className={`relative h-12 rounded-lg border flex flex-col items-center justify-between p-1 transition-all touch-none select-none cursor-pointer ${
                            isTriggered
                              ? `border-transparent font-medium shadow-md`
                              : `bg-zinc-900/40 border-white/5 text-zinc-500 hover:border-white/15`
                          } ${
                            isPlayhead
                              ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-950 scale-102 z-10"
                              : ""
                          }`}
                          style={{
                            backgroundColor: isTriggered ? track.color : undefined,
                            boxShadow: isTriggered ? `0 0 12px ${track.color}60` : undefined,
                            color: isTriggered ? "#000" : undefined,
                          }}
                        >
                          {/* Step indicator */}
                          <span className={`text-[9px] font-mono self-start ${isTriggered ? "text-zinc-950/80 font-extrabold" : "text-zinc-500"}`}>
                            {idx + 1}
                          </span>
                          {/* Active state circle */}
                          {isTriggered && (
                            <div className="w-2 h-2 rounded-full bg-zinc-950/90 self-center" />
                          )}
                          {/* Probability sub-bar if custom */}
                          {prob < 1.0 && isTriggered && (
                            <span className="text-[8px] font-mono text-zinc-950/80 font-bold">
                              {Math.round(prob * 100)}%
                            </span>
                          )}
                        </button>
                      );
                    } else {
                      // Probability Mode
                      return (
                        <div
                          key={idx}
                          className={`relative h-16 rounded-lg border bg-zinc-900/40 border-white/5 flex flex-col justify-end p-1 overflow-hidden transition-all ${
                            isPlayhead ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-950 z-10" : ""
                          }`}
                        >
                          <span className="absolute top-1 left-1.5 text-[8px] font-mono text-zinc-500 z-10">
                            {idx + 1}
                          </span>
                          {/* Draggable/Tweakable Probability Bar */}
                          <div
                            className="absolute bottom-0 left-0 right-0 rounded-b-md transition-all"
                            style={{
                              height: `${prob * 100}%`,
                              backgroundColor: isTriggered ? `${track.color}40` : "#3f3f4630",
                              borderTop: `2px solid ${isTriggered ? track.color : "#71717a"}`,
                            }}
                          />
                          {/* Percentage Selector */}
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={Math.round(prob * 100)}
                            onChange={(e) =>
                                handleProbabilityChange(track.id, idx, parseInt(e.target.value) / 100)
                            }
                            className="absolute inset-0 opacity-0 cursor-ns-resize w-full h-full"
                          />
                          <span className="text-[9px] font-mono text-zinc-200 self-center z-10 pointer-events-none drop-shadow-md font-bold">
                            {Math.round(prob * 100)}%
                          </span>
                        </div>
                      );
                    }
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
