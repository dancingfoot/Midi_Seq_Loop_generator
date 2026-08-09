import React, { useState, useEffect, useRef } from "react";
import { JamPeer } from "../types";
import { Link, Wifi, Radio, Zap, Play, Square, Users, Volume2, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";

interface JamSyncPanelProps {
  isPlaying: boolean;
  bpm: number;
  onTempoChange: (bpm: number) => void;
  onTransportChange: (playing: boolean) => void;
  currentStep: number;
  engine: any;
}

export const JamSyncPanel: React.FC<JamSyncPanelProps> = ({
  isPlaying,
  bpm,
  onTempoChange,
  onTransportChange,
  currentStep,
  engine,
}) => {
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [peerList, setPeerList] = useState<JamPeer[]>([]);
  const [selfId, setSelfId] = useState<string>("");
  const [selfName, setSelfName] = useState<string>("Jammer");
  const [latency, setLatency] = useState<number>(0);
  const [rtpPackets, setRtpPackets] = useState<{ id: string; msg: string; time: string }[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const latencyTimerRef = useRef<any>(null);

  // Sync WebSocket Connection
  useEffect(() => {
    connectJamRoom();
    return () => {
      disconnectJamRoom();
    };
  }, []);

  const connectJamRoom = () => {
    if (wsRef.current) return;

    // Derive protocol (ws/wss) from location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/sync`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      logRtpPacket("RTP-MIDI Joined network group multicast on port 5006");
      
      // Start polling latency
      latencyTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "PING", clientTime: performance.now() }));
        }
      }, 3000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "WELCOME":
            setSelfId(data.id);
            setSelfName(data.name);
            setPeerList(data.activeJammers.filter((j: any) => j.id !== data.id));
            break;

          case "PEER_JOINED":
            setPeerList(data.activeJammers.filter((j: any) => j.id !== selfId));
            logRtpPacket(`New node discovered: ${data.name}`);
            break;

          case "PEER_LEFT":
            setPeerList(data.activeJammers.filter((j: any) => j.id !== selfId));
            logRtpPacket(`Node left network: ${data.name}`);
            break;

          case "PONG":
            const rtt = performance.now() - data.clientTime;
            setLatency(Math.round(rtt / 2));
            break;

          case "TRANSPORT_CHANGE":
            onTransportChange(data.playing);
            logRtpPacket(`Network sync: Play/Stop command from ${data.senderName}`);
            break;

          case "TEMPO_CHANGE":
            onTempoChange(data.bpm);
            logRtpPacket(`Network sync: Tempo change to ${data.bpm} BPM from ${data.senderName}`);
            break;

          case "BEAT_ALIGN":
            // Microsecond align phase to match player
            if (isPlaying) {
              const localStepLengthMs = (60 / bpm) / 4 * 1000;
              const remoteStep = data.step;
              const remoteTime = data.timestamp;
              const timeDiff = performance.now() - remoteTime;
              const localOffsetSteps = Math.floor(timeDiff / localStepLengthMs);
              const targetStep = remoteStep + localOffsetSteps;
              engine.currentStep = targetStep;
              logRtpPacket(`Ableton Link: Re-aligned phase offset with ${data.senderName}`);
            }
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("Parse incoming sync failed", err);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      setPeerList([]);
      if (latencyTimerRef.current) {
        clearInterval(latencyTimerRef.current);
      }
    };
  };

  const disconnectJamRoom = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (latencyTimerRef.current) {
      clearInterval(latencyTimerRef.current);
    }
    setWsConnected(false);
  };

  const logRtpPacket = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const packetId = Math.random().toString(36).substring(7);
    setRtpPackets((prev) => [{ id: packetId, msg, time: timestamp }, ...prev].slice(0, 10));
  };

  // Broadcast local changes
  const broadcastTransport = (playing: boolean) => {
    if (wsRef.current && wsConnected) {
      wsRef.current.send(JSON.stringify({
        type: "TRANSPORT_CHANGE",
        playing
      }));
    }
  };

  const broadcastTempo = (newBpm: number) => {
    if (wsRef.current && wsConnected) {
      wsRef.current.send(JSON.stringify({
        type: "TEMPO_CHANGE",
        bpm: newBpm
      }));
    }
  };

  // Periodic phase broadcast (similar to Link's heartbeat)
  useEffect(() => {
    if (wsRef.current && wsConnected && isPlaying && currentStep % 4 === 0) {
      wsRef.current.send(JSON.stringify({
        type: "BEAT_ALIGN",
        step: currentStep,
        bpm: bpm
      }));
    }
  }, [currentStep, isPlaying, wsConnected, bpm]);

  if (isCollapsed) {
    return (
      <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link className="w-5 h-5 text-orange-500 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest font-mono">Ableton Link Live Sync</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Enables peer-to-peer beat phase alignment. Open this app in another tab or device to trigger jam sessions.</p>
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
            <h2 className="text-base font-bold text-zinc-200 uppercase tracking-widest font-mono">Ableton Link Live Sync</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Enables peer-to-peer beat phase alignment. Open this app in another tab or device to trigger multi-device jam sessions.</p>
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
        
        {/* Left Side: Connection Status & Ableton Link Pulser */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
              Sync Engine Status
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 ${
              wsConnected
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-orange-500/10 text-orange-500 border border-orange-500/20"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-emerald-500" : "bg-orange-500 animate-ping"}`} />
              {wsConnected ? "LINK SESSION ACTIVE" : "LOCAL MODE"}
            </span>
          </div>

          <p className="text-xs text-zinc-400">
            Enables peer-to-peer beat phase alignment. Open this app in another tab or device to trigger multi-device jam sessions.
          </p>

          {/* Ableton Link Visualizer Pumping Ring */}
          <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden h-44">
            
            {/* Pulsating Beat Ring */}
            <div
              className={`absolute border rounded-full transition-all duration-150 ${
                isPlaying && currentStep % 4 === 0
                  ? "w-28 h-28 border-orange-500 bg-orange-500/10 animate-ping"
                  : "w-20 h-20 border-white/5"
              }`}
              style={{ borderWidth: "3px" }}
            />

            {/* Core Pulser */}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border z-10 transition-all ${
              isPlaying ? "bg-orange-600 border-orange-500 shadow-lg shadow-orange-500/20" : "bg-zinc-900 border-white/5 text-zinc-500"
            }`}>
              <Zap className={`w-6 h-6 ${isPlaying ? "text-white animate-bounce" : "text-zinc-600"}`} />
            </div>

            {/* Status Info Overlay */}
            <div className="z-10 text-center mt-3">
              <span className="text-xs font-sans font-bold text-zinc-200 block">
                {isPlaying ? `Beat ${Math.floor(currentStep / 4) + 1} (${(currentStep % 4) + 1}/4)` : "Transport Stopped"}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 mt-0.5 block">
                {wsConnected ? `Synced Node Latency: ~${latency}ms` : "Simulating local Link timeline"}
              </span>
            </div>
          </div>

          {/* Peer connection management buttons */}
          <div className="flex gap-2">
            {!wsConnected ? (
              <button
                onClick={connectJamRoom}
                className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white font-sans font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(234,88,12,0.3)] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wifi className="w-4 h-4" />
                Establish Jam Connection
              </button>
            ) : (
              <button
                onClick={disconnectJamRoom}
                className="flex-1 py-2 bg-zinc-950 hover:bg-zinc-900 text-rose-400 border border-white/10 font-sans font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                Disconnect Sync
              </button>
            )}
          </div>
        </div>

        {/* Right Side: QmidiNet RTP-MIDI Packet Console */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest font-mono flex items-center gap-2">
              <Radio className="w-5 h-5 text-orange-500" />
              QmidiNet RTP-MIDI Traffic
            </h3>
            {wsConnected && (
              <span className="text-[10px] font-mono text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {peerList.length} Peer(s)
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-400">
            Visualizes simulated RTP UDP multicast/unicast MIDI payload bytes streaming over Ethernet and local networks.
          </p>

          <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-4 flex flex-col h-[216px]">
            <div className="flex-1 bg-zinc-950 border border-white/5 rounded p-3 overflow-y-auto font-mono text-[9px] text-orange-400/90 space-y-2 custom-scrollbar">
              
              {/* Fake Clock pulse display */}
              {isPlaying && (
                <div className="text-[8px] text-emerald-500/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  [UDP Multicast] 24 PPQN Clock Pulsing at {bpm} BPM (Payload: [0xF8])
                </div>
              )}

              {rtpPackets.map((pkt) => (
                <div key={pkt.id} className="border-l border-orange-500/30 pl-2 leading-relaxed">
                  <span className="text-zinc-500">[{pkt.time}]</span> {pkt.msg}
                </div>
              ))}

              {rtpPackets.length === 0 && !isPlaying && (
                <div className="text-zinc-500 italic text-center pt-16">
                  Awaiting RTP MIDI stream init. Engage transport...
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
