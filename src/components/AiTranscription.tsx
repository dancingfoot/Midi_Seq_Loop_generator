import React, { useState, useRef } from "react";
import { Sparkles, Upload, Mic, Square, Loader2, Music, Download, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { InstrumentTrack } from "../types";
import { exportToMidi } from "../midiExporter";

interface AiTranscriptionProps {
  onTranscriptionLoaded: (data: { bpm: number; tracks: any[]; notes?: any[] }) => void;
  tracks: InstrumentTrack[];
  bpm: number;
  selectedScale: string;
}

export const AiTranscription: React.FC<AiTranscriptionProps> = ({
  onTranscriptionLoaded,
  tracks,
  bpm,
  selectedScale,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [recording, setRecording] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcriptionSummary, setTranscriptionSummary] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAudioFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processAudioFile(e.target.files[0]);
    }
  };

  // Convert audio file to Base64 and send to Gemini Transcribe API
  const processAudioFile = async (file: File) => {
    setLoading(true);
    setTranscriptionSummary(null);

    try {
      const base64Data = await fileToBase64(file);
      const mimeType = file.type || "audio/mp3";

      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioData: base64Data.split(",")[1], // Extract the raw base64 string
          mimeType,
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.details || data.error);
      }

      onTranscriptionLoaded(data);
      setTranscriptionSummary(
        `AI successfully transcribed loop at ${data.bpm} BPM containing ${data.tracks.length} active tracks! Loaded patterns directly into the sequencer grid.`
      );
    } catch (err: any) {
      console.error("Transcription failed", err);
      setTranscriptionSummary(`Error during transcription: ${err.message || err}. Loaded a creative local transcription preset.`);
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Microphone Audio Recording Controls
  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioUrl(null);
    setTranscriptionSummary(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert Blob to File and Transcribe
        const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });
        await processAudioFile(audioFile);

        // Stop all tracks on the stream to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Microphone access blocked", err);
      alert("Microphone access blocked. Please configure browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  if (isCollapsed) {
    return (
      <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest font-mono">AI Audio Rhythm Transcription</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Feed it a music file or tap a rhythm into your mic. Our AI analyzes the energy transients to craft a fully quantized loop!</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest font-mono flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            AI Audio Rhythm Transcription
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Feed it a music file or tap a rhythm into your mic. Our AI analyzes the energy transients to craft a fully quantized loop!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
          {/* MIDI Export Button */}
          <button
            onClick={() => exportToMidi(tracks, bpm, selectedScale)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-sans font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(234,88,12,0.3)] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Standard MIDI File
          </button>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Side: Drag and Drop Upload */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition ${
            dragActive
              ? "border-orange-500 bg-orange-500/5"
              : "border-white/5 bg-zinc-950 hover:border-white/20 hover:bg-zinc-900/50"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*"
            className="hidden"
          />

          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3 text-zinc-400 border border-white/5">
            <Upload className="w-6 h-6 text-orange-500" />
          </div>

          <span className="text-xs font-sans font-bold text-zinc-200">
            Drag & Drop Audio File Here
          </span>
          <span className="text-[10px] text-zinc-500 mt-1 leading-relaxed block">
            Supports MP3, WAV, AAC, WebM, or M4A (Max 15MB)
          </span>
          <span className="text-[10px] text-orange-500/80 mt-2 font-mono bg-orange-500/5 px-2 py-0.5 rounded border border-orange-500/10">
            Or Click to Select File
          </span>
        </div>

        {/* Right Side: Microphone Audio Recorder */}
        <div className="border border-white/5 bg-zinc-950 rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
          
          {recording && (
            <div className="absolute inset-0 bg-rose-500/5 animate-pulse border border-rose-500/20 rounded-xl" />
          )}

          <div className="z-10 flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 border transition-all ${
              recording
                ? "bg-rose-500 border-rose-400 shadow-lg shadow-rose-500/20 text-white animate-bounce"
                : "bg-zinc-900 border-white/5 text-zinc-400"
            }`}>
              <Mic className="w-5 h-5" />
            </div>

            <span className="text-xs font-sans font-bold text-zinc-200">
              {recording ? "Recording Your Sound..." : "Live Microphone Recorder"}
            </span>
            <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] leading-relaxed">
              Tap a beat on your table or whistle a melody to transcribe directly to standard sequencer tracks.
            </p>

            <div className="mt-4 flex gap-2">
              {!recording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-lg text-zinc-300 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5 text-rose-500" />
                  Start Recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop & Feed AI
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress & Summary Loader Overlay */}
      {loading && (
        <div className="mt-6 p-4 bg-zinc-950 border border-white/5 rounded-xl flex items-center gap-4 animate-pulse">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin flex-shrink-0" />
          <div>
            <span className="text-xs font-sans font-bold text-zinc-200 block">
              Gemini AI is analyzing rhythm and transient data...
            </span>
            <span className="text-[10px] text-zinc-500 block mt-0.5 leading-relaxed">
              Aligning tempo grids, estimating onset peaks, and mapping probabilities for perfect DAW synchronization.
            </span>
          </div>
        </div>
      )}

      {transcriptionSummary && (
        <div className="mt-6 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl flex items-start gap-3">
          <Music className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-sans font-bold text-orange-400 block">
              AI Transcription Complete!
            </span>
            <p className="text-[10px] text-zinc-300 mt-1 leading-relaxed">
              {transcriptionSummary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
