import { InstrumentTrack } from "./types";

// Encode a number as MIDI Variable Length Quantity (VLQ)
function encodeVLQ(value: number): number[] {
  const bytes: number[] = [];
  let buffer = value & 0x7f;
  while ((value >>= 7) > 0) {
    bytes.push(buffer | 0x80);
    buffer = value & 0x7f;
  }
  bytes.push(buffer);
  return bytes.reverse();
}

// Helper to write string to byte array
function writeString(str: string, arr: number[]) {
  for (let i = 0; i < str.length; i++) {
    arr.push(str.charCodeAt(i));
  }
}

// Helper to write 32-bit integer
function write32Bit(val: number, arr: number[]) {
  arr.push((val >> 24) & 0xff);
  arr.push((val >> 16) & 0xff);
  arr.push((val >> 8) & 0xff);
  arr.push(val & 0xff);
}

// Helper to write 16-bit integer
function write16Bit(val: number, arr: number[]) {
  arr.push((val >> 8) & 0xff);
  arr.push(val & 0xff);
}

export function exportToMidi(tracks: InstrumentTrack[], bpm: number, scaleName: string) {
  const ticksPerQuarter = 96; // 96 ticks = 1 quarter note
  const ticksPerStep = 24; // 24 ticks = 1 sixteenth note step (4 steps per beat)

  const midiFileBytes: number[] = [];

  // 1. MThd Header Chunk
  writeString("MThd", midiFileBytes);
  write32Bit(6, midiFileBytes); // Header length is always 6
  write16Bit(1, midiFileBytes); // Format 1: Multi-track MIDI
  write16Bit(tracks.length + 1, midiFileBytes); // Tracks count: 1 conductor track + instrument tracks
  write16Bit(ticksPerQuarter, midiFileBytes); // Ticks per quarter note

  // 2. Conductor Track (Tempo, Time Signature)
  const conductorBytes: number[] = [];
  // Delta time 0
  conductorBytes.push(0);
  // Meta event: Set Tempo
  conductorBytes.push(0xff, 0x51, 0x03);
  // Microseconds per quarter note = 60,000,000 / BPM
  const microSecondsPerQuarter = Math.round(60000000 / bpm);
  conductorBytes.push((microSecondsPerQuarter >> 16) & 0xff);
  conductorBytes.push((microSecondsPerQuarter >> 8) & 0xff);
  conductorBytes.push(microSecondsPerQuarter & 0xff);

  // Time Signature: 4/4
  conductorBytes.push(0); // Delta
  conductorBytes.push(0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  // Track Name
  conductorBytes.push(0); // Delta
  conductorBytes.push(0xff, 0x03);
  const trackName = "Conductor Track";
  conductorBytes.push(trackName.length);
  writeString(trackName, conductorBytes);

  // End of Track
  conductorBytes.push(0); // Delta
  conductorBytes.push(0xff, 0x2f, 0x00);

  // Write Conductor Track to file
  writeString("MTrk", midiFileBytes);
  write32Bit(conductorBytes.length, midiFileBytes);
  midiFileBytes.push(...conductorBytes);

  // 3. Instrument Tracks
  tracks.forEach((track) => {
    const trackBytes: number[] = [];

    // Track Name Meta Event
    trackBytes.push(0); // Delta
    trackBytes.push(0xff, 0x03);
    const nameStr = `${track.name} (MIDI Channel ${track.channel})`;
    trackBytes.push(nameStr.length);
    writeString(nameStr, trackBytes);

    // Collect all note on and note off events chronologically
    interface MidiEvent {
      tick: number;
      status: number;
      data1: number;
      data2: number;
    }

    const events: MidiEvent[] = [];

    // Translate active sequencer steps to MIDI events
    for (let stepIdx = 0; stepIdx < track.stepCount; stepIdx++) {
      if (track.steps[stepIdx] === 1) {
        const startTick = stepIdx * ticksPerStep;
        const endTick = startTick + ticksPerStep - 4; // leave small gap between consecutive notes

        const pitch = track.pitch;
        const velocity = 100;

        // Note On
        events.push({
          tick: startTick,
          status: 0x90 | (track.channel - 1), // Note On, Channel index
          data1: pitch,
          data2: velocity,
        });

        // Note Off
        events.push({
          tick: endTick,
          status: 0x80 | (track.channel - 1), // Note Off, Channel index
          data1: pitch,
          data2: 0,
        });
      }
    }

    // Sort events by tick
    events.sort((a, b) => a.tick - b.tick);

    // Write events with Delta times
    let lastTick = 0;
    events.forEach((event) => {
      const delta = event.tick - lastTick;
      lastTick = event.tick;

      // Encode Delta Time as VLQ
      const vlqBytes = encodeVLQ(delta);
      trackBytes.push(...vlqBytes);

      // Write midi status and data bytes
      trackBytes.push(event.status, event.data1, event.data2);
    });

    // End of Track
    const deltaEnd = 24; // short tail
    trackBytes.push(...encodeVLQ(deltaEnd));
    trackBytes.push(0xff, 0x2f, 0x00);

    // Write Instrument Track to file
    writeString("MTrk", midiFileBytes);
    write32Bit(trackBytes.length, midiFileBytes);
    midiFileBytes.push(...trackBytes);
  });

  // Create downloadable Blob
  const byteArray = new Uint8Array(midiFileBytes);
  const blob = new Blob([byteArray], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);

  // Trigger download
  const link = document.createElement("a");
  link.href = url;
  link.download = `midi-loop-${bpm}bpm-${scaleName.toLowerCase().replace(/\s+/g, "-")}.mid`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
