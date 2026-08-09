# 🎵 PolyRhythm Studio & Novation Launchpad Sequencer

An advanced web-based music production workstation featuring a 16-step polyphonic sequencer, humanized groove swing engine with real-time **D3.js Swing Waveform visualization**, full **Novation Launchpad X** integration (Web MIDI + virtual 8x8 RGB matrix), AI-powered pattern generation, and P2P collaboration.

---

## 🌟 Key Features

### 🎛️ Transport Deck & D3 Swing Waveform Graph
* **Interactive D3 Groove Visualizer**: Visualizes 16th-note micro-timing offsets dynamically as you adjust the swing percentage (0–100%).
* **Drag-to-Adjust Timing**: Click or drag directly on the D3 waveform canvas to manipulate groove swing in real time.
* **Micro-Timing Display**: Real-time delay readouts in milliseconds (`+ms`) detailing how odd 16th notes shift off the strict grid for authentic funk, Dilla-style, or triplet shuffles.

### 🎹 Novation Launchpad X Integration
* **Hardware & Virtual 8x8 RGB Grid**: Seamlessly connects to **Novation Launchpad X, Mini, or Pro** via the browser's Web MIDI API, with zero driver installation required.
* **3 Operating Modes**:
  * **Sequencer Mode**: Map track pattern steps across the 8x8 RGB pad layout.
  * **Swing Faders Mode**: Vertical column faders to adjust global groove swing in 12.5% increments.
  * **Drum Pads Mode**: Trigger voice test taps directly from the pads.
* **Scene Button Controls**: Top function buttons control Swing offset (+/-), Tempo (+/-), Session Start/Stop, and quick Swing presets (0%, 25%, 50%, 66%, 75%).

### 🎧 Web MIDI & Custom Hardware Mapping
* **MIDI Output Sync**: Transmit MTC Quarter Frame timecodes and clock messages to external synthesizers or hardware drum machines.
* **MIDI Learn**: Bind physical knobs, sliders, or pedals to master tempo, swing percentage, filter cutoff, or track volume.

### 🤖 Gemini AI Pattern Generation & Audio Transcription
* Smart AI-assisted pattern generator to create drum grooves and melodic hooks tailored to specific genres.
* Audio pitch/rhythm transcription using Gemini multimodal analysis.

---

## 🚀 Quick Start & Installation

### Prerequisites
* **Node.js** v18.0.0 or higher
* **npm** v9.0.0 or higher
* A Web MIDI compatible web browser (such as Google Chrome, Brave, or Microsoft Edge)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/polyrhythm-studio.git
cd polyrhythm-studio
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 3. Build for Production
To generate a production-ready static build:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

---

## 📖 How to Use

### 1. Basic Step Sequencing
* Click any cell on the 16-step track grid to toggle steps on or off.
* Adjust **Probability** sliders per step to create generative, evolving beat variations.
* Enable **Ratcheting** (sub-step double/triple triggers) or **Pitch Drift** for organic lead lines.

### 2. Adjusting Groove & Swing
* Locate the **Groove Swing** module in the Transport Deck.
* Drag the swing slider or click/drag anywhere on the **D3 Swing Waveform** graph to shift odd 16th-note timing.
* Observe how the waveform curve updates in real time to match straight 16th grids, light micro-shuffles, funk bounce, or heavy Dilla-style drag.

### 3. Connecting a Novation Launchpad X
1. Connect your Novation Launchpad X via USB.
2. Allow Web MIDI permissions in your web browser if prompted.
3. The Launchpad X deck will automatically detect the device (`Live: Launchpad X LPX`).
4. Use the virtual on-screen deck or physical pads to trigger steps and switch performance modes.

---

## 🔗 Ableton Link Bridge & AppImage Packaging

### Why an Ableton Link Bridge is Required
Ableton Link relies on raw UDP multicast sockets (`port 20808`) on the local network to discover other Link-enabled DAWs (such as Ableton Live, Bitwig, or SERATO) and synchronize tempo/phase with microsecond precision. Standard web browsers sandbox raw UDP socket access for security reasons.

To support Ableton Link in a web application:
1. A lightweight native bridge process runs locally (`node-abletonlink` or C++ binary).
2. The bridge connects to Ableton Link on the LAN via UDP.
3. The bridge communicates with PolyRhythm Studio over a local WebSocket (`ws://localhost:8080`).

### Packaging Into a Single `.AppImage` File
**Yes, the web application, bridge binary, and Node/Electron runtime can all be packaged into a single standalone `.AppImage` executable for Linux.**

#### Recommended Packaging Setup (Electron + Electron-Builder):

1. **Structure your Electron main process (`electron/main.ts`)**:
```typescript
import { app, BrowserWindow } from 'electron';
import { Link } from 'abletonlink'; // Native C++ Link bindings
import { WebSocketServer } from 'ws';

// Start native Ableton Link instance
const link = new Link();
link.enable();

// Start local WebSocket bridge server for the app
const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
  link.on('tempo', (bpm: number) => ws.send(JSON.stringify({ type: 'BPM', bpm })));
  ws.on('message', (msg: string) => {
    const data = JSON.parse(msg);
    if (data.type === 'SET_BPM') link.bpm = data.bpm;
  });
});

// Launch GUI
app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 1280, height: 800 });
  win.loadURL('http://localhost:3000'); // or dist/index.html
});
```

2. **Add `electron-builder` configuration in `package.json`**:
```json
{
  "build": {
    "appId": "com.polyrhythm.app",
    "productName": "PolyRhythm Studio",
    "linux": {
      "target": ["AppImage"],
      "category": "Audio"
    }
  }
}
```

3. **Build the `.AppImage` package**:
```bash
npx electron-builder --linux AppImage
```

The resulting `dist/PolyRhythm_Studio.AppImage` contains everything in one executable file. Running `./PolyRhythm_Studio.AppImage` launches the UI and the Ableton Link bridge simultaneously with full network synchronization capabilities.

---

## 🛠️ Built With

* **Framework**: React 18 & TypeScript
* **Build System**: Vite
* **Data Visualization**: D3.js
* **Styling**: Tailwind CSS
* **Icons**: Lucide React
* **Audio Engine**: Web Audio API & Web MIDI API
* **AI Integration**: `@google/genai` (Gemini API)

---

## 📄 License

MIT License — feel free to use and adapt for your own music technology projects!
