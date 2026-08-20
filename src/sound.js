/**
 * sound.js — Audio engine (Web Audio API + HTML5 audio for music).
 * Most sounds are synthesized in-browser; the warp music loops a real mp3
 * (`src/music/sound1.mp3`) from the scan completion until the welcome screen.
 * Events map to app phases: boot, ready, scanning, verified, warp, dashboard.
 */

import warpMusicUrl from "./music/sound1.mp3";
import scanUrl from "./music/scan.mp3";
import endUrl from "./music/end.mp3";

let ctx = null;
let master = null;
let ambientNodes = [];
let ambientGain = null;
let warpAudio = null;
let warpGain = null;
let scanAudio = null;
let endAudio = null;
let endGain = null;

const ensureCtx = () => {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};

/* Must be called from a user gesture (Enter/click) to satisfy autoplay rules */
export const unlockAudio = () => ensureCtx();

const tone = ({
  freq,
  endFreq,
  type = "sine",
  dur = 0.3,
  vol = 0.3,
  delay = 0,
  attack = 0.01,
}) => {
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
};

const noise = ({
  dur = 1,
  vol = 0.3,
  delay = 0,
  from = 200,
  to = 8000,
  type = "bandpass",
  q = 1,
}) => {
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
};

/* ------------------------------ event sounds ------------------------------ */

/* boot: system startup — rising arpeggio + low riser */
export const playBoot = () => {
  const notes = [220, 277.18, 329.63, 440];
  notes.forEach((f, i) =>
    tone({ freq: f, type: "square", dur: 0.14, vol: 0.12, delay: i * 0.11 }),
  );
  tone({ freq: 880, type: "sine", dur: 0.5, vol: 0.15, delay: 0.44 });
  noise({ dur: 1.1, vol: 0.09, from: 90, to: 1100, type: "lowpass" });
};

/* ready: confirmation blip, then ambient hum loop starts */
export const playReady = () => {
  tone({ freq: 523.25, type: "triangle", dur: 0.35, vol: 0.2 });
  tone({ freq: 659.25, type: "triangle", dur: 0.35, vol: 0.18, delay: 0.09 });
};

/* scanning: plays scan.mp3 (re-triggered every ping by SoundSystem) */
export const playScanPing = () => {
  ensureCtx();
  if (!scanAudio) {
    scanAudio = new Audio(scanUrl);
    scanAudio.volume = 0.9;
  }
  scanAudio.currentTime = 0;
  scanAudio.play().catch(() => {});
};

/* stops the scan sound immediately (called when entering the warp tunnel) */
export const stopScan = () => {
  if (!scanAudio) return;
  scanAudio.pause();
  scanAudio.currentTime = 0;
};

/* verified: ascending success chime with sparkle */
export const playVerify = () => {
  const seq = [523.25, 659.25, 783.99, 1046.5];
  seq.forEach((f, i) =>
    tone({ freq: f, type: "triangle", dur: 0.35, vol: 0.22, delay: i * 0.13 }),
  );
  noise({ dur: 0.9, vol: 0.1, delay: 0.1, from: 6000, to: 9000, type: "highpass" });
};

/* warp: music from sound1.mp3 loops until the welcome dashboard appears */
export const playWarpMusic = () => {
  const c = ensureCtx();
  if (!warpAudio) {
    warpAudio = new Audio(warpMusicUrl);
    warpAudio.loop = true;
    warpAudio.volume = 1.0;
    /* route through Web Audio to boost 2x louder than the element max */
    const src = c.createMediaElementSource(warpAudio);
    warpGain = c.createGain();
    warpGain.gain.value = 4.0;
    src.connect(warpGain).connect(c.destination);
  }
  warpAudio.play().catch(() => {});
};

export const stopWarpMusic = () => {
  if (!warpAudio) return;
  warpAudio.pause();
  warpAudio.currentTime = 0;
};

/* dashboard: end.mp3 plays once while the welcome + logo screen is shown */
export const playEndMusic = () => {
  const c = ensureCtx();
  if (!endAudio) {
    endAudio = new Audio(endUrl);
    endAudio.volume = 1.0;
    /* route through Web Audio to boost louder than the element max */
    const src = c.createMediaElementSource(endAudio);
    endGain = c.createGain();
    endGain.gain.value = 4.0;
    src.connect(endGain).connect(c.destination);
  }
  endAudio.currentTime = 0;
  endAudio.play().catch(() => {});
};

export const stopEndMusic = () => {
  if (!endAudio) return;
  endAudio.pause();
  endAudio.currentTime = 0;
};

/* dashboard: welcome fanfare + sustained chord */
export const playFanfare = () => {
  const notes = [523.25, 523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) =>
    tone({ freq: f, type: "triangle", dur: 0.28, vol: 0.2, delay: i * 0.14 }),
  );
  [523.25, 659.25, 783.99].forEach((f, i) =>
    tone({ freq: f, type: "sine", dur: 2.2, vol: 0.11, delay: 0.72 + i * 0.05 }),
  );
};

/* UI click (Enter / reset) */
export const playClick = () => {
  tone({ freq: 300, endFreq: 120, type: "square", dur: 0.08, vol: 0.1 });
};

/* warp sequence: short blip for each verification log line */
export const playTick = () => {
  tone({ freq: 900, endFreq: 1400, type: "square", dur: 0.07, vol: 0.07 });
  tone({ freq: 1400, type: "sine", dur: 0.12, vol: 0.06, delay: 0.05 });
};

/* ------------------------------ ambient loop ------------------------------ */

/* low sci-fi drone loop — used for ready & dashboard ambience */
export const startAmbient = () => {
  const c = ensureCtx();
  if (!c || ambientNodes.length) return;
  const t0 = c.currentTime;
  const g = c.createGain();
  g.gain.value = 0.0001;
  g.gain.exponentialRampToValueAtTime(0.05, t0 + 1.5);
  ambientGain = g;
  g.connect(master);

  const freqs = [55, 82.41, 110];
  ambientNodes = freqs.map((f, i) => {
    const osc = c.createOscillator();
    osc.type = i === 0 ? "sine" : "triangle";
    osc.frequency.value = f;
    const og = c.createGain();
    og.gain.value = i === 0 ? 0.7 : 0.35;
    osc.connect(og).connect(g);
    osc.start();
    return osc;
  });

  const lfo = c.createOscillator();
  lfo.frequency.value = 0.1;
  const lfoG = c.createGain();
  lfoG.gain.value = 0.02;
  lfo.connect(lfoG).connect(g.gain);
  lfo.start();
  ambientNodes.push(lfo);
};

export const stopAmbient = () => {
  const c = ctx;
  if (!c || !ambientNodes.length) return;
  const t0 = c.currentTime;
  ambientGain.gain.cancelScheduledValues(t0);
  ambientGain.gain.setValueAtTime(ambientGain.gain.value, t0);
  ambientGain.gain.linearRampToValueAtTime(0.0001, t0 + 0.6);
  const nodes = ambientNodes;
  setTimeout(() => {
    nodes.forEach((n) => {
      try {
        n.stop();
        n.disconnect();
      } catch {}
    });
  }, 700);
  ambientNodes = [];
  ambientGain = null;
};