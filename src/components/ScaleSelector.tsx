import React, { useState } from "react";
import { BeatPreset, ScalePreset } from "../types";
import { Music, LayoutGrid, Scale, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";

interface ScaleSelectorProps {
  onLoadPreset: (preset: BeatPreset) => void;
  selectedScale: string;
  setSelectedScale: (scaleName: string) => void;
  rootNote: string;
  setRootNote: (note: string) => void;
}

export const ScaleSelector: React.FC<ScaleSelectorProps> = ({
  onLoadPreset,
  selectedScale,
  setSelectedScale,
  rootNote,
  setRootNote,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const rootNotesList = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  // Well known beat presets
  const beatPresets: BeatPreset[] = [
    {
      name: "Classic Techno",
      genre: "Electronic",
      bpm: 126,
      tracks: [
        { name: "Kick", steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
        { name: "Snare", steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
        { name: "Closed Hat", steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1] },
        { name: "Clap", steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
        { name: "Synth", steps: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
      ],
    },
    {
      name: "Trap Rolling 808",
      genre: "Hip-Hop",
      bpm: 140,
      tracks: [
        { name: "Kick", steps: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0] },
        { name: "Snare", steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
        { name: "Closed Hat", steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], probabilities: [1, 0.5, 1, 0.4, 1, 0.9, 1, 0.5, 1, 0.4, 1, 0.8, 1, 0.5, 1, 0.9] },
        { name: "Clap", steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
        { name: "Synth", steps: [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0] },
      ],
    },
    {
      name: "Dembow Reggaeton",
      genre: "Latin",
      bpm: 110,
      tracks: [
        { name: "Kick", steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
        { name: "Snare", steps: [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0] },
        { name: "Closed Hat", steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0] },
        { name: "Clap", steps: [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0] },
        { name: "Synth", steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0] },
      ],
    },
    {
      name: "Liquid Drum & Bass",
      genre: "Bass Music",
      bpm: 172,
      tracks: [
        { name: "Kick", steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0] },
        { name: "Snare", steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
        { name: "Closed Hat", steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
        { name: "Clap", steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0] },
        { name: "Synth", steps: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1] },
      ],
    },
    {
      name: "Polyrhythmic Ambient",
      genre: "Ambient",
      bpm: 90,
      tracks: [
        { name: "Kick", steps: [1, 0, 0, 0, 0], stepCount: 5 },
        { name: "Snare", steps: [0, 0, 0, 0, 1, 0, 0], stepCount: 7 },
        { name: "Closed Hat", steps: [1, 1, 0], stepCount: 3 },
        { name: "Clap", steps: [0, 0, 0, 0, 0, 1], stepCount: 6 },
        { name: "Synth", steps: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0], stepCount: 16 },
      ],
    },
  ];

  // Well known musical scale modes
  const scales: ScalePreset[] = [
    { name: "Ionian (Major)", notes: [0, 2, 4, 5, 7, 9, 11], mode: "Bright/Happy" },
    { name: "Aeolian (Minor)", notes: [0, 2, 3, 5, 7, 8, 10], mode: "Sad/Classic" },
    { name: "Dorian", notes: [0, 2, 3, 5, 7, 9, 10], mode: "Mystical/Jazz" },
    { name: "Phrygian", notes: [0, 1, 3, 5, 7, 8, 10], mode: "Dark/Spanish" },
    { name: "Mixolydian", notes: [0, 2, 4, 5, 7, 9, 10], mode: "Bluesy/Rock" },
    { name: "Lydian", notes: [0, 2, 4, 6, 7, 9, 11], mode: "Spacey/Ethereal" },
    { name: "Pentatonic Minor", notes: [0, 3, 5, 7, 10], mode: "Folk/Rock" },
  ];

  if (isCollapsed) {
    return (
      <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Music className="w-5 h-5 text-orange-500 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest font-mono">Scales, Modes & Presets</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Load rhythmic templates and quantize synthesized notes in real time.</p>
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
          : "bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-xl"
      }
    >
      {/* Unified top header bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Music className="w-5 h-5 text-orange-500" />
          <div>
            <h2 className="text-base font-bold text-zinc-200 uppercase tracking-widest font-mono">Scales, Modes & Presets</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Load rhythmic templates and quantize synthesized notes in real time.</p>
          </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Preset Beats Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest font-mono">Quick-Load Beats</h3>
          </div>
          <p className="text-xs text-zinc-400">
            Instantly inject a rhythm outline, custom channel settings, and structural guidelines.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {beatPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => onLoadPreset(preset)}
                className="flex flex-col items-start p-3 bg-zinc-950 hover:bg-zinc-900 border border-white/5 hover:border-white/15 rounded-xl transition text-left cursor-pointer group"
              >
                <span className="text-xs font-sans font-bold text-zinc-300 group-hover:text-orange-400 transition">
                  {preset.name}
                </span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded border border-white/5">
                    {preset.genre}
                  </span>
                  <span className="text-[9px] font-mono text-orange-500 bg-orange-500/5 px-1 py-0.5 rounded border border-orange-500/20">
                    {preset.bpm} BPM
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Scales & Modes Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest font-mono">Live Scale Quantization</h3>
          </div>
          <p className="text-xs text-zinc-400">
            Quantize synthesized leads to keep all melodic keyboard patterns perfectly aligned in key.
          </p>

          <div className="space-y-4 mt-4">
            {/* Root Note Picker */}
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-2 font-bold">
                Key Center (Root)
              </span>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                {rootNotesList.map((note) => {
                  const isSelected = rootNote === note;
                  return (
                    <button
                      key={note}
                      onClick={() => setRootNote(note)}
                      className={`py-1 rounded text-xs font-mono font-bold border transition text-center cursor-pointer ${
                        isSelected
                          ? "bg-orange-600 border-orange-500 text-white font-black shadow-[0_0_15px_rgba(234,88,12,0.4)]"
                          : "bg-zinc-950 border-white/5 hover:border-white/15 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {note}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode Select List */}
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-2 font-bold">
                Scale/Modal Preset
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar">
                {scales.map((scale) => {
                  const isSelected = selectedScale === scale.name;
                  return (
                    <button
                      key={scale.name}
                      onClick={() => setSelectedScale(scale.name)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition ${
                        isSelected
                          ? "bg-zinc-950 border-orange-500/50 text-orange-400 shadow-[0_0_15px_rgba(234,88,12,0.15)]"
                          : "bg-zinc-950 border-white/5 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-sans font-bold block">{scale.name}</span>
                        <span className="text-[9px] font-mono text-zinc-500 font-bold">{scale.mode}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
