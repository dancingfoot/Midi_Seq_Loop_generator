import React, { useState, useRef } from "react";
import { AutomationCurve } from "../types";
import { Sliders, Check, Eye, EyeOff, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";

interface AutomationCanvasProps {
  curves: AutomationCurve[];
  setCurves: React.Dispatch<React.SetStateAction<AutomationCurve[]>>;
  currentStep: number;
  isPlaying: boolean;
}

export const AutomationCanvas: React.FC<AutomationCanvasProps> = ({
  curves,
  setCurves,
  currentStep,
  isPlaying,
}) => {
  const [selectedCurveId, setSelectedCurveId] = useState<string>(curves[0]?.id || "");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const isDrawingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeCurve = curves.find((c) => c.id === selectedCurveId) || curves[0];

  const handlePointChange = (stepIdx: number, value: number) => {
    setCurves((prev) =>
      prev.map((c) => {
        if (c.id === selectedCurveId) {
          const newPoints = [...c.points];
          newPoints[stepIdx] = Math.max(0, Math.min(1, value));
          return { ...c, points: newPoints };
        }
        return c;
      })
    );
  };

  // Sweep-to-draw interactive gesture handler
  const handleInteract = (e: React.MouseEvent | React.TouchEvent, stepIdx: number) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientY = e.touches[0].clientY;
    } else {
      clientY = e.clientY;
    }

    const yNormalized = 1 - (clientY - rect.top) / rect.height;
    handlePointChange(stepIdx, yNormalized);
  };

  const handleMouseDown = (e: React.MouseEvent, stepIdx: number) => {
    isDrawingRef.current = true;
    handleInteract(e, stepIdx);
  };

  const handleMouseEnter = (e: React.MouseEvent, stepIdx: number) => {
    if (isDrawingRef.current) {
      handleInteract(e, stepIdx);
    }
  };

  const handleGlobalMouseUp = () => {
    isDrawingRef.current = false;
  };

  // Add global mouse up listener once
  React.useEffect(() => {
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  // Pre-configured preset curves
  const applyPreset = (type: "sine" | "saw" | "random" | "flat") => {
    let presetPoints = Array(16).fill(0.5);

    if (type === "sine") {
      presetPoints = Array(16)
        .fill(0)
        .map((_, i) => Math.sin((i / 15) * Math.PI * 2) * 0.4 + 0.5);
    } else if (type === "saw") {
      presetPoints = Array(16)
        .fill(0)
        .map((_, i) => i / 15);
    } else if (type === "random") {
      presetPoints = Array(16)
        .fill(0)
        .map(() => parseFloat(Math.random().toFixed(2)));
    } else if (type === "flat") {
      presetPoints = Array(16).fill(0.1);
    }

    setCurves((prev) =>
      prev.map((c) => (c.id === selectedCurveId ? { ...c, points: presetPoints } : c))
    );
  };

  const toggleCurveActive = (id: string) => {
    setCurves((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
  };

  if (isCollapsed) {
    return (
      <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sliders className="w-5 h-5 text-orange-500 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest font-mono">Live Automation</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Modulate synth parameters dynamically over the loop timeline.</p>
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
          <Sliders className="w-5 h-5 text-orange-500" />
          <div>
            <h2 className="text-base font-bold text-zinc-200 uppercase tracking-widest font-mono">Live Automation</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Modulate synth parameters dynamically over the loop timeline.</p>
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

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Side: Automation Selection Column */}
        <div className="w-full md:w-1/3 space-y-3">
          <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold mb-2">
            Select Active Parameter
          </div>

          <div className="space-y-2 mt-4">
            {curves.map((curve) => {
              const isSelected = curve.id === selectedCurveId;
              return (
                <div
                  key={curve.id}
                  onClick={() => setSelectedCurveId(curve.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? "bg-zinc-950 border-orange-500/40 text-orange-400"
                      : "bg-zinc-950/60 border-white/5 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: curve.color, boxShadow: `0 0 6px ${curve.color}` }}
                    />
                    <span className="text-xs font-sans font-bold">{curve.name}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCurveActive(curve.id);
                    }}
                    className="p-1 hover:bg-zinc-900 rounded transition text-zinc-500 hover:text-orange-400 cursor-pointer"
                  >
                    {curve.active ? (
                      <Eye className="w-4 h-4 text-orange-500" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Presets */}
          <div className="pt-2 border-t border-white/10">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-2 font-bold">
              Apply Shapes
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => applyPreset("sine")}
                className="py-1.5 px-2 bg-zinc-950 hover:bg-zinc-900 border border-white/5 rounded-lg text-zinc-300 font-mono text-[10px] transition text-center cursor-pointer"
              >
                Sine Wave
              </button>
              <button
                onClick={() => applyPreset("saw")}
                className="py-1.5 px-2 bg-zinc-950 hover:bg-zinc-900 border border-white/5 rounded-lg text-zinc-300 font-mono text-[10px] transition text-center cursor-pointer"
              >
                Ramp Up
              </button>
              <button
                onClick={() => applyPreset("random")}
                className="py-1.5 px-2 bg-zinc-950 hover:bg-zinc-900 border border-white/5 rounded-lg text-zinc-300 font-mono text-[10px] transition text-center cursor-pointer"
              >
                Random Noise
              </button>
              <button
                onClick={() => applyPreset("flat")}
                className="py-1.5 px-2 bg-zinc-950 hover:bg-zinc-900 border border-white/5 rounded-lg text-zinc-300 font-mono text-[10px] transition text-center cursor-pointer"
              >
                Flat low
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Drawing Board */}
        <div className="flex-1 bg-zinc-950/60 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono font-bold text-orange-400">
              Modulating: {activeCurve?.name}
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              Sweep/drag your finger or pointer to paint the envelope
            </span>
          </div>

          {/* Automation Columns */}
          <div
            ref={containerRef}
            className="h-44 w-full flex items-end gap-1 select-none touch-none bg-zinc-950 border-b border-white/5 pb-2 relative"
          >
            {activeCurve?.points.map((val, idx) => {
              const isPlayhead = isPlaying && currentStep % 16 === idx;

              return (
                <div
                  key={idx}
                  className="flex-1 h-full relative cursor-ns-resize"
                  onMouseDown={(e) => handleMouseDown(e, idx)}
                  onMouseEnter={(e) => handleMouseEnter(e, idx)}
                  onTouchStart={(e) => handleInteract(e, idx)}
                  onTouchMove={(e) => handleInteract(e, idx)}
                >
                  {/* Outer active playhead background track */}
                  {isPlayhead && (
                    <div className="absolute inset-0 bg-orange-500/10 rounded pointer-events-none" />
                  )}

                  {/* Vertical Level bar */}
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all pointer-events-none"
                    style={{
                      height: `${val * 100}%`,
                      backgroundColor: isPlayhead
                        ? "rgb(234, 88, 12)"
                        : activeCurve.color || "rgb(16, 185, 129)",
                      boxShadow: isPlayhead ? `0 0 10px rgba(234, 88, 12, 0.5)` : undefined,
                    }}
                  />

                  {/* Center Dot marker */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-slate-950 bg-white shadow-md pointer-events-none"
                    style={{
                      bottom: `calc(${val * 100}% - 4px)`,
                    }}
                  />

                  {/* Value bubble appearing on top on hover */}
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-zinc-400 opacity-60 pointer-events-none">
                    {Math.round(val * 100)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Stepper position track labels */}
          <div className="flex justify-between mt-2 px-1 text-[9px] font-mono text-zinc-500">
            {Array(16)
              .fill(0)
              .map((_, i) => (
                <span
                  key={i}
                  className={`flex-1 text-center ${
                    isPlaying && currentStep % 16 === i ? "text-orange-400 font-bold" : ""
                  }`}
                >
                  {i + 1}
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
