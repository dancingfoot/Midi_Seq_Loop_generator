import React, { useState } from "react";
import { MidiMapping } from "../types";
import { Hammer, Check, Link, RefreshCw, Radio, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";

interface MidiMappingPanelProps {
  engine: any;
  mappings: MidiMapping[];
  setMappings: React.Dispatch<React.SetStateAction<MidiMapping[]>>;
  midiActivity: string[];
  setMidiActivity: React.Dispatch<React.SetStateAction<string[]>>;
}

export const MidiMappingPanel: React.FC<MidiMappingPanelProps> = ({
  engine,
  mappings,
  setMappings,
  midiActivity,
  setMidiActivity,
}) => {
  const [learningParam, setLearningParam] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Initial parameters available for mapping
  const parameters = [
    { id: "bpm", name: "Master Tempo (BPM)" },
    { id: "synthFilter", name: "Synth Filter Cutoff" },
    { id: "synthVolume", name: "Synth Volume" },
    { id: "track-vol-Kick", name: "Track Volume (Kick)" },
    { id: "track-vol-Snare", name: "Track Volume (Snare)" },
    { id: "track-vol-Closed Hat", name: "Track Volume (Hat)" },
  ];

  // Start learning MIDI CC
  const handleLearn = (paramId: string) => {
    setLearningParam(paramId);
    engine.startMidiLearn(paramId);

    // Listen for learn complete
    engine.onMidiLearn = (newMapping: MidiMapping) => {
      setMappings((prev) => {
        const filtered = prev.filter((m) => m.parameterId !== newMapping.parameterId);
        return [...filtered, newMapping];
      });
      setLearningParam(null);
    };
  };

  // Clear a mapping
  const clearMapping = (paramId: string) => {
    setMappings((prev) => prev.filter((m) => m.parameterId !== paramId));
    const engineIdx = engine.midiMappings.findIndex((m: any) => m.parameterId === paramId);
    if (engineIdx !== -1) {
      engine.midiMappings.splice(engineIdx, 1);
    }
  };

  // Simulate incoming CC message (for testing / demo purposes)
  const simulateIncomingCC = (ccNumber: number, value: number, channel: number = 1) => {
    // We construct a simulated MIDI event structure
    const event = {
      data: new Uint8Array([0xb0 | (channel - 1), ccNumber, value]),
    } as any;

    engine.handleMidiInputMessage(event);

    // Re-sync local state
    setMappings([...engine.midiMappings]);
  };

  if (isCollapsed) {
    return (
      <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link className="w-5 h-5 text-orange-500 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest font-mono">MIDI Controller Mapping</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Link external faders, dials, or MIDI devices to map parameters dynamically.</p>
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
          <Link className="w-5 h-5 text-orange-500" />
          <div>
            <h2 className="text-base font-bold text-zinc-200 uppercase tracking-widest font-mono">MIDI Controller Mapping</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Link external faders, dials, or MIDI devices to map parameters dynamically.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left column: Mappings dashboard */}
        <div className="space-y-4">
          <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-2">
            MAPPING LIST & ASSIGNMENTS
          </div>

          <div className="space-y-2 mt-4">
            {parameters.map((param) => {
              const mapping = mappings.find((m) => m.parameterId === param.id);
              const isLearning = learningParam === param.id;

              return (
                <div
                  key={param.id}
                  className="bg-zinc-950/60 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4 transition hover:border-white/10"
                >
                  <div>
                    <span className="text-xs font-sans font-bold text-zinc-200 block">
                      {param.name}
                    </span>
                    {mapping ? (
                      <span className="text-[10px] font-mono text-orange-500 bg-orange-500/5 px-1.5 py-0.5 rounded border border-orange-500/20 mt-1 inline-block">
                        CC #{mapping.ccNumber} (Ch {mapping.channel})
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5 mt-1 inline-block">
                        Unmapped
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {mapping && (
                      <button
                        onClick={() => clearMapping(param.id)}
                        className="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded text-[10px] transition font-mono font-bold cursor-pointer"
                      >
                        Unlink
                      </button>
                    )}
                    <button
                      onClick={() => handleLearn(param.id)}
                      className={`px-3 py-1.5 rounded text-[11px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isLearning
                          ? "bg-orange-600 animate-pulse text-white shadow-[0_0_15px_rgba(234,88,12,0.4)]"
                          : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5"
                      }`}
                    >
                      {isLearning ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Waiting CC...
                        </>
                      ) : (
                        "Learn CC"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: MIDI Ports & Virtual Controller Simulator */}
        <div className="space-y-6">
          {/* Virtual hardware simulator */}
          <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-4">
            <h4 className="text-xs uppercase font-mono tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
              Hardware MIDI Link Simulator
            </h4>
            <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed">
              No hardware connected? Tweak these virtual faders to broadcast CC bytes into our learn engine.
            </p>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-zinc-400 block truncate">Knob 1 (CC #10)</span>
                <input
                  type="range"
                  min="0"
                  max="127"
                  defaultValue="64"
                  onChange={(e) => simulateIncomingCC(10, parseInt(e.target.value))}
                  className="w-full h-8 bg-zinc-900 rounded appearance-none cursor-pointer accent-orange-500 p-1 border border-white/5"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-mono text-zinc-400 block truncate">Slider 2 (CC #11)</span>
                <input
                  type="range"
                  min="0"
                  max="127"
                  defaultValue="40"
                  onChange={(e) => simulateIncomingCC(11, parseInt(e.target.value))}
                  className="w-full h-8 bg-zinc-900 rounded appearance-none cursor-pointer accent-orange-500 p-1 border border-white/5"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-mono text-zinc-400 block truncate">Dial 3 (CC #12)</span>
                <input
                  type="range"
                  min="0"
                  max="127"
                  defaultValue="20"
                  onChange={(e) => simulateIncomingCC(12, parseInt(e.target.value))}
                  className="w-full h-8 bg-zinc-900 rounded appearance-none cursor-pointer accent-orange-500 p-1 border border-white/5"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500" />
                <span className="text-[10px] font-sans text-zinc-400 font-medium">Virtual MIDI Port Ready</span>
              </div>
              <button
                onClick={() => {
                  engine.updateMidiPorts();
                }}
                className="text-[9px] font-mono text-orange-500 hover:text-orange-400 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Scan Hardware
              </button>
            </div>
          </div>

          {/* Activity Console */}
          <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-4 flex flex-col h-44">
            <h4 className="text-xs uppercase font-mono tracking-wider text-zinc-400 mb-2">
              MIDI Transmission Monitor
            </h4>
            <div className="flex-1 bg-zinc-950 border border-white/5 rounded p-2 overflow-y-auto font-mono text-[9px] text-emerald-400 space-y-1 custom-scrollbar">
              {midiActivity.slice(-8).map((log, i) => (
                <div key={i} className="leading-relaxed border-l-2 border-emerald-500/20 pl-2">
                  {log}
                </div>
              ))}
              {midiActivity.length === 0 && (
                <div className="text-zinc-500 italic text-center pt-8">
                  Awaiting transport clock and MIDI I/O signals...
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
