import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface SwingWaveformProps {
  swing: number; // 0 - 100%
  bpm: number; // Master tempo
  isPlaying: boolean;
  currentStep: number;
  onSwingChange?: (newSwing: number) => void;
}

export const SwingWaveform: React.FC<SwingWaveformProps> = ({
  swing,
  bpm,
  isPlaying,
  currentStep,
  onSwingChange,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Calculate timing offset metrics
  const stepDurationMs = (60000 / bpm) / 4; // Duration of 16th note in ms
  const offsetMs = (swing / 100) * stepDurationMs * 0.5;

  // Determine groove character description
  const getGrooveName = (s: number) => {
    if (s <= 2) return "Straight 16th Grid";
    if (s <= 25) return "Light Micro-Shuffle";
    if (s <= 45) return "Funk Groove";
    if (s <= 58) return "Half-Triplet Bounce";
    if (s <= 70) return "Classic Triplet Swing (MPC/Dilla)";
    return "Heavy Drag / Lazy Shuffle";
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 340;
    const height = 130;
    const margin = { top: 22, right: 16, bottom: 28, left: 16 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous SVG contents
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("overflow", "visible");

    // Definitions for Gradients & Filters
    const defs = svg.append("defs");

    // Waveform Area Gradient
    const areaGradient = defs
      .append("linearGradient")
      .attr("id", "swingWaveGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    areaGradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#f97316") // Orange-500
      .attr("stop-opacity", 0.4);

    areaGradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#ea580c") // Orange-600
      .attr("stop-opacity", 0.02);

    // Glow Filter
    const filter = defs.append("filter").attr("id", "glow").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
    filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "blur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Total steps to visualize (8 steps = 2 full beats)
    const numSteps = 8;
    const stepXStep = innerWidth / numSteps;

    // X scale
    const xScale = d3.scaleLinear().domain([0, numSteps]).range([0, innerWidth]);

    // Draw baseline straight 16th grid (dotted background lines)
    for (let i = 0; i <= numSteps; i++) {
      const xStraight = xScale(i);

      // Grid vertical line
      g.append("line")
        .attr("x1", xStraight)
        .attr("y1", 0)
        .attr("x2", xStraight)
        .attr("y2", innerHeight)
        .attr("stroke", i % 2 === 0 ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.05)")
        .attr("stroke-dasharray", i % 2 === 1 ? "2,2" : "none")
        .attr("stroke-width", i % 4 === 0 ? 1.5 : 1);

      // Label
      if (i < numSteps) {
        g.append("text")
          .attr("x", xStraight + 4)
          .attr("y", innerHeight + 18)
          .attr("fill", "rgba(161, 161, 170, 0.6)")
          .attr("font-size", "9px")
          .attr("font-family", "monospace")
          .attr("font-weight", i % 2 === 1 ? "normal" : "bold")
          .text(`S${i + 1}`);
      }
    }

    // Compute Swung X positions
    const swungPositions: number[] = [];
    for (let i = 0; i < numSteps; i++) {
      let x = i;
      if (i % 2 === 1) {
        // odd step delayed by swing percentage
        const shiftFactor = (swing / 100) * 0.5;
        x = i + shiftFactor;
      }
      swungPositions.push(xScale(x));
    }

    // Build dense points for smooth waveform rendering
    interface WavePoint {
      x: number;
      y: number;
    }
    const wavePoints: WavePoint[] = [];
    const samples = 160;

    for (let s = 0; s <= samples; s++) {
      const t = (s / samples) * numSteps;
      const xPixel = xScale(t);

      // Compute amplitude Y based on proximity to swung step points
      let amp = 0;
      for (let i = 0; i < numSteps; i++) {
        const stepX = swungPositions[i];
        const dist = Math.abs(xPixel - stepX);
        const gaussian = Math.exp(-Math.pow(dist / (stepXStep * 0.35), 2));
        amp = Math.max(amp, gaussian);
      }

      // Convert amplitude (0 to 1) to Y coordinate
      const yPixel = innerHeight - amp * (innerHeight - 10);
      wavePoints.push({ x: xPixel, y: yPixel });
    }

    // D3 Area generator
    const areaGen = d3
      .area<WavePoint>()
      .x((d) => d.x)
      .y0(innerHeight)
      .y1((d) => d.y)
      .curve(d3.curveMonotoneX);

    // D3 Line generator
    const lineGen = d3
      .line<WavePoint>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveMonotoneX);

    // Render Area
    g.append("path").datum(wavePoints).attr("fill", "url(#swingWaveGradient)").attr("d", areaGen);

    // Render Glow Stroke Line
    g.append("path")
      .datum(wavePoints)
      .attr("fill", "none")
      .attr("stroke", "#f97316")
      .attr("stroke-width", 2)
      .attr("filter", "url(#glow)")
      .attr("d", lineGen);

    // Draw offset connector indicators for swung odd steps
    for (let i = 1; i < numSteps; i += 2) {
      const straightX = xScale(i);
      const swungX = swungPositions[i];

      if (swing > 2 && Math.abs(swungX - straightX) > 2) {
        // Connector band
        g.append("rect")
          .attr("x", straightX)
          .attr("y", 12)
          .attr("width", swungX - straightX)
          .attr("height", 14)
          .attr("fill", "rgba(249, 115, 22, 0.2)")
          .attr("rx", 3);

        // Arrow indicator
        g.append("line")
          .attr("x1", straightX)
          .attr("y1", 19)
          .attr("x2", swungX)
          .attr("y2", 19)
          .attr("stroke", "#fb923c")
          .attr("stroke-width", 1.5)
          .attr("marker-end", "url(#arrow)");
      }

      // Swung step pulse node
      const activeStepIndex = currentStep % numSteps;
      const isActive = isPlaying && activeStepIndex === i;

      g.append("circle")
        .attr("cx", swungX)
        .attr("y", innerHeight - (innerHeight - 10))
        .attr("r", isActive ? 6 : 3.5)
        .attr("fill", isActive ? "#ffffff" : "#f97316")
        .attr("stroke", "#ea580c")
        .attr("stroke-width", isActive ? 2 : 1)
        .attr("filter", isActive ? "url(#glow)" : "none");
    }

    // Playhead line when playing
    if (isPlaying) {
      const activeStepInCycle = currentStep % numSteps;
      const playheadX = swungPositions[activeStepInCycle] ?? 0;

      g.append("line")
        .attr("x1", playheadX)
        .attr("y1", -5)
        .attr("x2", playheadX)
        .attr("y2", innerHeight + 5)
        .attr("stroke", "#38bdf8") // Sky blue glowing laser
        .attr("stroke-width", 2)
        .attr("filter", "url(#glow)");

      g.append("circle")
        .attr("cx", playheadX)
        .attr("cy", -5)
        .attr("r", 4)
        .attr("fill", "#38bdf8");
    }

    // Attach interactive D3 Drag & Click listener to allow dragging on the graph to adjust swing!
    if (onSwingChange) {
      const drag = d3.drag<SVGSVGElement, unknown>().on("drag", (event) => {
        const [mouseX] = d3.pointer(event, g.node());
        const clampedX = Math.max(0, Math.min(innerWidth, mouseX));
        // Calculate relative position within an odd step's swing slot
        const stepWidth = innerWidth / numSteps;
        const normalizedPos = (clampedX % (stepWidth * 2)) / stepWidth;
        let newSwing = 0;

        if (normalizedPos >= 1) {
          // In swung region
          newSwing = Math.round(((normalizedPos - 1) / 0.5) * 100);
        } else {
          newSwing = Math.round((normalizedPos / 1.0) * 50);
        }

        const clampedSwing = Math.max(0, Math.min(100, newSwing));
        onSwingChange(clampedSwing);
      });

      svg.call(drag as any);

      svg.on("click", (event) => {
        const [mouseX] = d3.pointer(event, g.node());
        const clampedX = Math.max(0, Math.min(innerWidth, mouseX));
        const pct = clampedX / innerWidth;
        const clickedSwing = Math.round(pct * 100);
        onSwingChange(clickedSwing);
      });
    }
  }, [swing, bpm, isPlaying, currentStep, onSwingChange]);

  return (
    <div ref={containerRef} className="w-full space-y-2 select-none">
      {/* Dynamic Header Metrics */}
      <div className="flex items-center justify-between text-[11px] font-mono px-1">
        <span className="text-zinc-400 flex items-center gap-1.5 font-bold">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          {getGrooveName(swing)}
        </span>
        <span className="text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
          +{offsetMs.toFixed(1)} ms 16th delay
        </span>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative bg-zinc-950/80 border border-white/10 rounded-xl p-2.5 overflow-hidden shadow-inner cursor-ew-resize group hover:border-orange-500/40 transition">
        <svg ref={svgRef} className="w-full h-[130px] block" />

        {/* Drag Hint Overlay */}
        <div className="absolute top-2 right-2 text-[9px] font-mono text-zinc-500 opacity-0 group-hover:opacity-100 transition bg-zinc-900/90 px-1.5 py-0.5 rounded border border-white/10 pointer-events-none">
          Click or Drag to adjust swing
        </div>
      </div>
    </div>
  );
};
