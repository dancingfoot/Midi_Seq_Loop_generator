#!/usr/bin/env node

/**
 * Standalone Ableton Link & WebSocket Sync Bridge
 * 
 * Runs a standalone high-precision WebSocket synchronization bridge on port 8080
 * for connecting PolyRhythm Studio with local Ableton Link UDP networks or headless sessions.
 */

const { WebSocketServer, WebSocket } = require('ws');
const http = require('http');

const PORT = process.env.BRIDGE_PORT || 8080;

let abletonLinkInstance = null;
let isAbletonLinkActive = false;

// Try initializing native C++ Ableton Link bindings if available
try {
  const { Link } = require('abletonlink');
  abletonLinkInstance = new Link();
  abletonLinkInstance.enable();
  isAbletonLinkActive = true;
  console.log('✅ Ableton Link C++ native UDP engine successfully initialized!');
} catch (err) {
  console.log('ℹ️  Native `abletonlink` module not detected on system. Running high-precision WebSocket Master Clock bridge.');
  console.log('   (To enable raw UDP Ableton Link, install: `npm install abletonlink`)');
}

// Master state
let bridgeState = {
  bpm: 120,
  isPlaying: false,
  beat: 0,
  lastUpdated: Date.now()
};

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    bridge: 'PolyRhythm Ableton Link Bridge',
    abletonLinkNative: isAbletonLinkActive,
    state: bridgeState,
    connectedClients: wss.clients.size
  }));
});

const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  clients.add(ws);
  console.log(`[LinkBridge] Client connected from ${clientIp} (Total: ${clients.size})`);

  // Send current state on connect
  ws.send(JSON.stringify({
    type: 'WELCOME',
    bpm: bridgeState.bpm,
    isPlaying: bridgeState.isPlaying,
    abletonLinkNative: isAbletonLinkActive,
    activeClients: clients.size
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'PING':
          ws.send(JSON.stringify({ type: 'PONG', serverTime: Date.now(), clientTime: data.clientTime }));
          break;

        case 'TEMPO_CHANGE':
        case 'SET_BPM':
          if (typeof data.bpm === 'number' && data.bpm >= 20 && data.bpm <= 300) {
            bridgeState.bpm = data.bpm;
            bridgeState.lastUpdated = Date.now();
            
            if (isAbletonLinkActive && abletonLinkInstance) {
              abletonLinkInstance.bpm = data.bpm;
            }

            broadcast({ type: 'TEMPO_CHANGE', bpm: bridgeState.bpm, sender: 'bridge' }, ws);
          }
          break;

        case 'TRANSPORT_CHANGE':
        case 'SET_PLAYING':
          bridgeState.isPlaying = Boolean(data.isPlaying);
          bridgeState.lastUpdated = Date.now();
          broadcast({ type: 'TRANSPORT_CHANGE', isPlaying: bridgeState.isPlaying, sender: 'bridge' }, ws);
          break;

        case 'BEAT_ALIGN':
          bridgeState.beat = data.beat || 0;
          broadcast({ type: 'BEAT_ALIGN', beat: bridgeState.beat, sender: 'bridge' }, ws);
          break;

        default:
          broadcast(data, ws);
          break;
      }
    } catch (err) {
      console.error('[LinkBridge] Error processing message:', err.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[LinkBridge] Client disconnected. (Total: ${clients.size})`);
  });

  ws.on('error', (err) => {
    console.error('[LinkBridge] Socket error:', err.message);
  });
});

// Broadcast helper
function broadcast(data, excludeWs = null) {
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Bind native Link listeners if available
if (isAbletonLinkActive && abletonLinkInstance) {
  abletonLinkInstance.on('tempo', (bpm) => {
    console.log(`[AbletonLink] External tempo updated: ${bpm.toFixed(2)} BPM`);
    bridgeState.bpm = Math.round(bpm);
    broadcast({ type: 'TEMPO_CHANGE', bpm: bridgeState.bpm, source: 'AbletonLink' });
  });

  abletonLinkInstance.on('numPeers', (numPeers) => {
    console.log(`[AbletonLink] Ableton Link network peers count: ${numPeers}`);
    broadcast({ type: 'LINK_PEERS_COUNT', numPeers });
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ┌─────────────────────────────────────────────────────────────┐
  │                                                             │
  │   🎵 PolyRhythm Ableton Link Bridge Server                  │
  │                                                             │
  │   - WebSocket Bridge URL:  ws://localhost:${PORT}              │
  │   - Status Check URL:     http://localhost:${PORT}             │
  │   - Ableton Link UDP:     ${isAbletonLinkActive ? 'ENABLED (Native C++) ' : 'DISABLED (Simulated)  '} │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘
  `);
});

// Handle graceful shutdown
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
  console.log('\nStopping Link Bridge...');
  if (isAbletonLinkActive && abletonLinkInstance) {
    abletonLinkInstance.disable();
  }
  server.close(() => {
    console.log('Bridge stopped.');
    process.exit(0);
  });
}
