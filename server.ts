import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Configure generated audio directory
const AUDIO_DIR = path.join(process.cwd(), "generated_audio");
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Helper to wrap raw 48kHz, 16-bit, Stereo PCM bytes into a compliant WAV file
function addWavHeader(pcmBuffer: Buffer, sampleRate = 48000, numChannels = 2, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  const dataLength = pcmBuffer.length;
  const fileLength = dataLength + 36;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  // RIFF identifier
  header.write('RIFF', 0);
  header.writeUInt32LE(fileLength, 4);
  // WAVE identifier
  header.write('WAVE', 8);
  // FMT sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Sub-chunk size
  header.writeUInt16LE(1, 20);  // Format: 1 (PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  // DATA sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Convert 24kHz 16-bit Mono PCM to 48kHz 16-bit Stereo PCM using high-fidelity linear interpolation
function resampleMono24kHzToStereo48kHz(monoPcm24k: Buffer): Buffer {
  const numInputSamples = Math.floor(monoPcm24k.length / 2);
  const outputBuffer = Buffer.alloc(numInputSamples * 8);

  for (let i = 0; i < numInputSamples; i++) {
    const s1 = monoPcm24k.readInt16LE(i * 2);
    const s2 = (i < numInputSamples - 1) ? monoPcm24k.readInt16LE((i + 1) * 2) : s1;

    const mid = Math.round((s1 + s2) / 2);

    // Frame 1
    outputBuffer.writeInt16LE(s1, i * 8 + 0);
    outputBuffer.writeInt16LE(s1, i * 8 + 2);

    // Frame 2
    outputBuffer.writeInt16LE(mid, i * 8 + 4);
    outputBuffer.writeInt16LE(mid, i * 8 + 6);
  }

  return outputBuffer;
}

// Safely extract raw PCM from audio buffer (whether it is standard WAV with RIFF header or raw L16 PCM)
function extractPcmData(buffer: Buffer): { pcm: Buffer; sampleRate: number; channels: number } {
  if (buffer.length > 44 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE') {
    let offset = 12;
    let sampleRate = 24000;
    let channels = 1;
    let dataOffset = 44;
    let dataLength = buffer.length - 44;

    while (offset + 8 <= buffer.length) {
      const chunkId = buffer.toString('ascii', offset, offset + 4);
      const chunkSize = buffer.readUInt32LE(offset + 4);
      if (chunkId === 'fmt ' && chunkSize >= 16) {
        channels = buffer.readUInt16LE(offset + 10);
        sampleRate = buffer.readUInt32LE(offset + 12);
      } else if (chunkId === 'data') {
        dataOffset = offset + 8;
        dataLength = Math.min(chunkSize, buffer.length - dataOffset);
        break;
      }
      offset += 8 + chunkSize;
    }

    const pcm = buffer.subarray(dataOffset, dataOffset + dataLength);
    return { pcm, sampleRate, channels };
  }

  return { pcm: buffer, sampleRate: 24000, channels: 1 };
}

// Normalize any incoming PCM (Mono 24kHz, Stereo 24kHz, etc.) to broadcast-standard 48kHz Stereo 16-bit
function normalizeToStereo48kHz(rawPcm: Buffer, inRate: number, inChannels: number): Buffer {
  if (inRate === 48000 && inChannels === 2) {
    return rawPcm;
  }
  if (inRate === 24000 && inChannels === 1) {
    return resampleMono24kHzToStereo48kHz(rawPcm);
  }

  const inSamplesPerChannel = Math.floor(rawPcm.length / (2 * inChannels));
  const ratio = 48000 / inRate;
  const outSamplesPerChannel = Math.floor(inSamplesPerChannel * ratio);
  const outBuffer = Buffer.alloc(outSamplesPerChannel * 4);

  for (let i = 0; i < outSamplesPerChannel; i++) {
    const srcIndexFloat = i / ratio;
    const srcIdx0 = Math.min(Math.floor(srcIndexFloat), inSamplesPerChannel - 1);
    const srcIdx1 = Math.min(srcIdx0 + 1, inSamplesPerChannel - 1);
    const frac = srcIndexFloat - srcIdx0;

    const s0L = rawPcm.readInt16LE(srcIdx0 * 2 * inChannels);
    const s1L = rawPcm.readInt16LE(srcIdx1 * 2 * inChannels);
    const sampleL = Math.round(s0L + frac * (s1L - s0L));

    const s0R = inChannels > 1 ? rawPcm.readInt16LE((srcIdx0 * 2 * inChannels) + 2) : s0L;
    const s1R = inChannels > 1 ? rawPcm.readInt16LE((srcIdx1 * 2 * inChannels) + 2) : s1L;
    const sampleR = Math.round(s0R + frac * (s1R - s0R));

    outBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, sampleL)), i * 4 + 0);
    outBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, sampleR)), i * 4 + 2);
  }

  return outBuffer;
}

// Warm Tube Bass Boost: gentle, 100% stable low-frequency saturation for chest resonance
function applyWarmTubeBass(pcmStereo48k: Buffer, gainDb = 3.5): Buffer {
  const totalFrames = Math.floor(pcmStereo48k.length / 4);
  const out = Buffer.alloc(pcmStereo48k.length);
  let lowL = 0;
  let lowR = 0;
  // One-pole smoothing at ~500Hz for 48kHz
  const alpha = 0.065;
  const boostFactor = Math.pow(10, Math.min(5, Math.max(0, gainDb)) / 20) - 1.0;

  for (let i = 0; i < totalFrames; i++) {
    let inL = pcmStereo48k.readInt16LE(i * 4 + 0) / 32768.0;
    let inR = pcmStereo48k.readInt16LE(i * 4 + 2) / 32768.0;

    if (!Number.isFinite(inL)) inL = 0;
    if (!Number.isFinite(inR)) inR = 0;

    lowL += alpha * (inL - lowL);
    lowR += alpha * (inR - lowR);

    if (!Number.isFinite(lowL)) lowL = 0;
    if (!Number.isFinite(lowR)) lowR = 0;

    // Warm tube saturation on the low end + gentle boost
    let boostedL = inL + boostFactor * Math.tanh(lowL * 1.2);
    let boostedR = inR + boostFactor * Math.tanh(lowR * 1.2);

    if (!Number.isFinite(boostedL)) boostedL = inL;
    if (!Number.isFinite(boostedR)) boostedR = inR;

    const sL = Math.max(-32768, Math.min(32767, Math.round(boostedL * 32767)));
    const sR = Math.max(-32768, Math.min(32767, Math.round(boostedR * 32767)));

    out.writeInt16LE(sL, i * 4 + 0);
    out.writeInt16LE(sR, i * 4 + 2);
  }

  return out;
}

// Studio Broadcast Compressor & Limiter: Dynamic punch, consistent volume, and brickwall peak safety
function applyBroadcastMastering(pcmStereo48k: Buffer): Buffer {
  const totalFrames = Math.floor(pcmStereo48k.length / 4);
  const out = Buffer.alloc(pcmStereo48k.length);

  let envelope = 0;
  const threshold = 0.22; // ~ -13 dB
  const ratio = 2.4;
  const makeupGain = 1.35; // +2.6 dB punch

  for (let i = 0; i < totalFrames; i++) {
    let inL = pcmStereo48k.readInt16LE(i * 4 + 0) / 32768.0;
    let inR = pcmStereo48k.readInt16LE(i * 4 + 2) / 32768.0;

    if (!Number.isFinite(inL)) inL = 0;
    if (!Number.isFinite(inR)) inR = 0;

    const peak = Math.max(Math.abs(inL), Math.abs(inR));

    if (peak > envelope) {
      envelope += (peak - envelope) * 0.1;
    } else {
      envelope += (peak - envelope) * 0.005;
    }

    if (!Number.isFinite(envelope) || envelope < 0) {
      envelope = 0;
    }

    let gain = 1.0;
    if (envelope > threshold) {
      const over = envelope - threshold;
      const compressedOver = over / ratio;
      gain = (threshold + compressedOver) / (envelope + 1e-6);
    }

    if (!Number.isFinite(gain) || gain < 0.01) {
      gain = 1.0;
    }

    let outL = inL * gain * makeupGain;
    let outR = inR * gain * makeupGain;

    // Peak limiter
    const limit = 0.96;
    if (Math.abs(outL) > limit) {
      outL = Math.sign(outL) * (limit + Math.tanh((Math.abs(outL) - limit) * 0.5) * 0.03);
    }
    if (Math.abs(outR) > limit) {
      outR = Math.sign(outR) * (limit + Math.tanh((Math.abs(outR) - limit) * 0.5) * 0.03);
    }

    if (!Number.isFinite(outL)) outL = inL;
    if (!Number.isFinite(outR)) outR = inR;

    const sL = Math.max(-32768, Math.min(32767, Math.round(outL * 32767)));
    const sR = Math.max(-32768, Math.min(32767, Math.round(outR * 32767)));

    out.writeInt16LE(sL, i * 4 + 0);
    out.writeInt16LE(sR, i * 4 + 2);
  }

  return out;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Check Gemini Key Availability
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      has_key: !!process.env.GEMINI_API_KEY,
      is_production: process.env.NODE_ENV === "production"
    });
  });

  // API Route: Subtitle Generator (SRT & VTT)
  app.post("/api/subtitles", (req, res) => {
    try {
      const { text, durationSeconds = 15, format = "srt" } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: "Text is required for subtitles" });
      }

      // Split text into meaningful subtitle segments
      const sentences = text
        .replace(/([.?!…])\s+/g, "$1|")
        .split("|")
        .map((s: string) => s.trim())
        .filter(Boolean);

      const count = Math.max(1, sentences.length);
      const segmentDuration = durationSeconds / count;

      const formatTime = (secs: number, isVtt: boolean) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        const ms = Math.floor((secs - Math.floor(secs)) * 1000);
        const sep = isVtt ? "." : ",";
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const ss = String(s).padStart(2, "0");
        const mmm = String(ms).padStart(3, "0");
        return `${hh}:${mm}:${ss}${sep}${mmm}`;
      };

      let subtitleOutput = "";
      if (format === "vtt") {
        subtitleOutput += "WEBVTT\n\n";
      }

      sentences.forEach((sentence: string, idx: number) => {
        const startSec = idx * segmentDuration;
        const endSec = Math.min(durationSeconds, (idx + 1) * segmentDuration);
        const startFormatted = formatTime(startSec, format === "vtt");
        const endFormatted = formatTime(endSec, format === "vtt");

        if (format === "srt") {
          subtitleOutput += `${idx + 1}\n${startFormatted} --> ${endFormatted}\n${sentence}\n\n`;
        } else {
          subtitleOutput += `${idx + 1}\n${startFormatted} --> ${endFormatted}\n${sentence}\n\n`;
        }
      });

      res.json({
        success: true,
        content: subtitleOutput.trim(),
        format,
        filename: `vox-subtitles.${format}`
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to generate subtitles" });
    }
  });

  // API Route: Generate Studio Audio via Gemini TTS
  app.post("/api/tts", async (req, res) => {
    try {
      const { 
        text, 
        voice, 
        id, 
        speed, 
        pitch, 
        pauses, 
        model, 
        persona, 
        customPersonaPrompt, 
        emotion,
        warmBass = true,
        broadcastMastering = true,
        dialogueMode = false,
        dialogueSpeakers
      } = req.body;
      
      if (!text || !text.trim()) {
        return res.status(400).json({ error: "Text content is required" });
      }

      const activeKey = process.env.GEMINI_API_KEY;
      if (!activeKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY отсутствует. Пожалуйста, добавьте её во вкладке Settings > Secrets." 
        });
      }

      // Valid prebuilt voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
      const voiceName = voice || "Charon";
      const recordId = id || `vox-${Date.now()}`;
      // Selected Gemini Model (default: flagship gemini-3.8-flash-tts)
      const selectedModel = model === "gemini-3.8-flash-lite-tts" ? "gemini-3.8-flash-lite-tts" : "gemini-3.8-flash-tts";

      let activeVoiceName = voiceName;
      let styleInstructions: string[] = [];

      // Detect language for targeted speech styling instructions
      const isUkrainian = /[іїєґІЇЄҐ]/.test(text);
      const isRussian = /[ёъыэЁЪЫЭ]/.test(text) || (/[а-яА-Я]/.test(text) && !isUkrainian);

      // 1. Voice Identity & Persona Mapping
      const currentPersona = persona || (voiceName === "Zephyr" ? "pitt" : voiceName.toLowerCase());

      if (currentPersona === "pitt" || voiceName === "Zephyr") {
        activeVoiceName = "Charon";
        if (isUkrainian) {
          styleInstructions.push(
            "in a deep, mature, warm, distinctly husky, raspy, and gravelly cinematic male voice sounding exactly like Brad Pitt's movie voiceover with a prominent velvety vocal fry, smoky texture, and a beautiful light hoarseness, speaking Ukrainian with a charismatic American accent (говоріть дуже глибоким, мужнім баритоном Бреда Пітта з вираженою оксамитовою хрипотою, привабливим хриплим придихом, помітними низькими вібраціями та американським акцентом, категорично уникайте чистого дикторського тону)"
          );
        } else if (isRussian) {
          styleInstructions.push(
            "in a deep, mature, warm, distinctly husky, raspy, and gravelly cinematic male voice sounding exactly like Brad Pitt's movie voiceover with a prominent velvety vocal fry, smoky texture, and a beautiful light hoarseness, speaking Russian with a charismatic American accent (говорите очень глубоким, мужественным баритоном Брэда Питта с выраженной бархатистой хрипотой, приятным хриплым придыханием, легким хрипом в связках, заметными низкими вибрациями и американским акцентом, категорически избегайте чистого дикторского тона)"
          );
        } else {
          styleInstructions.push(
            "in a deep, mature, warm, highly realistic, distinctly husky, raspy, and gravelly, laid-back cinematic male voice, sounding exactly like Brad Pitt's movie voiceovers with a charismatic American actor accent, featuring a prominent velvety vocal fry, smoky gravel texture, and a beautiful light hoarseness"
          );
        }
      } else if (currentPersona === "freeman") {
        activeVoiceName = "Charon";
        if (isUkrainian) {
          styleInstructions.push("in an ultra-deep, majestic, velvety baritone-bass sounding like legendary narrator Morgan Freeman, deeply resonant, wise, and calmly authoritative (говоріть надглибоким, величним, оксамитовим басом мудрого оповідача)");
        } else if (isRussian) {
          styleInstructions.push("in an ultra-deep, majestic, velvety baritone-bass sounding like legendary narrator Morgan Freeman, deeply resonant, wise, and calmly authoritative (говорите сверхглубоким, величественным, бархатным басом мудрого рассказчика кино)");
        } else {
          styleInstructions.push("in an ultra-deep, majestic, velvety baritone-bass sounding like legendary narrator Morgan Freeman, deeply resonant, wise, majestic and authoritative");
        }
      } else if (currentPersona === "cyberpunk") {
        activeVoiceName = "Charon";
        if (isUkrainian) {
          styleInstructions.push("in a gritty, smoky, world-weary cyberpunk detective noir voice, raspy baritone with cigarette rasp (говорите хрипким, втомленим нуарним голосом детектива)");
        } else if (isRussian) {
          styleInstructions.push("in a gritty, smoky, world-weary cyberpunk detective noir voice, raspy baritone with cigarette rasp (говорите хриплым, уставшим нуарным голосом детектива киберпанка)");
        } else {
          styleInstructions.push("in a gritty, smoky, world-weary cyberpunk detective noir voice, raspy baritone with gravelly texture");
        }
      } else if (currentPersona === "meditation") {
        activeVoiceName = "Kore";
        if (isUkrainian) {
          styleInstructions.push("in a super soft, gentle, soothing ASMR meditation whisper, warm, relaxing and comforting (говоріть ніжним заспокійливим пошептом ASMR)");
        } else if (isRussian) {
          styleInstructions.push("in a super soft, gentle, soothing ASMR meditation whisper, warm, relaxing and comforting (говорите нежным убаюкивающим шепотом медитации и ASMR)");
        } else {
          styleInstructions.push("in a super soft, gentle, soothing ASMR meditation whisper, warm, relaxing and comforting");
        }
      } else if (currentPersona === "podcast_host") {
        activeVoiceName = "Puck";
        if (isUkrainian) {
          styleInstructions.push("in an energetic, modern, engaging YouTube creator and podcast host voice (говоріть енергійним, драйвовим голосом сучасного ведучого подкасту)");
        } else if (isRussian) {
          styleInstructions.push("in an energetic, modern, engaging YouTube creator and podcast host voice (говорите энергичным, драйвовым голосом современного ведущего подкаста)");
        } else {
          styleInstructions.push("in an energetic, modern, engaging YouTube creator and podcast host voice with punchy storytelling");
        }
      } else if (currentPersona === "keanu") {
        activeVoiceName = "Charon";
        styleInstructions.push("in a calm, cool, magnetic, cinematic baritone like Keanu Reeves in The Matrix or John Wick, restrained power, measured cadence, philosophical depth (говорите спокойным, стильным, магнетическим баритоном Киану Ривза)");
      } else if (currentPersona === "dicaprio") {
        activeVoiceName = "Puck";
        styleInstructions.push("in an expressive, vibrant, passionate dramatic acting tone like Leonardo DiCaprio, high emotional range and intensity (говорите эмоциональным, выразительным, страстным голосом Леонардо ДиКаприо)");
      } else if (currentPersona === "statham") {
        activeVoiceName = "Charon";
        styleInstructions.push("in a tough, gritty, deep, gravelly British-action hero voice like Jason Statham, confident, curt, streetwise (говорите брутальным, хриплым, жестким голосом Джейсона Стэйтема)");
      } else if (currentPersona === "witcher") {
        activeVoiceName = "Charon";
        styleInstructions.push("in a low, gritty, world-weary mutant hunter voice like Geralt of Rivia (The Witcher), gruff rasp, calm lethal confidence (говорите суровым, хриплым, низким баритоном Ведьмака)");
      } else if (currentPersona === "radio_dj") {
        activeVoiceName = "Charon";
        styleInstructions.push("in a smooth, velvety, late-night FM radio host voice, warm intimacy and relaxing proximity (говорите бархатным, доверительным голосом ведущего ночного радиоэфира)");
      } else if (currentPersona === "sports") {
        activeVoiceName = "Puck";
        styleInstructions.push("in an explosive, high-energy, fast-paced live sports commentator voice, breathless excitement (говорите взрывным, динамичным голосом спортивного комментатора)");
      } else if (currentPersona === "fairytale") {
        activeVoiceName = "Charon";
        styleInstructions.push("in a warm, kind, comforting old storyteller voice, like a loving grandfather telling fairy tales by a fireplace (говорите добрым, теплым, мудрым голосом сказочника)");
      } else if (currentPersona === "maxim") {
        activeVoiceName = "Charon";
        styleInstructions.push("in a crisp, authoritative, impeccably clear Russian television news anchor voice (говорите эталонным, четким дикторским голосом федеральных новостей)");
      } else if (currentPersona === "anna") {
        activeVoiceName = "Kore";
        styleInstructions.push("in a melodious, pristine, highly pleasant Russian female audiobook narrator voice (говорите чистым, мелодичным, выразительным женским голосом аудиокниг)");
      } else if (currentPersona === "elena") {
        activeVoiceName = "Fenrir";
        styleInstructions.push("in a rich, charismatic, emotionally deep dramatic actress voice (говорите глубоким, выразительным голосом драматической актрисы театра и кино)");
      } else if (currentPersona === "mikhail") {
        activeVoiceName = "Charon";
        styleInstructions.push("in a deep, academic, majestic documentary narrator voice (говорите академическим, основательным голосом документалиста Discovery)");
      } else if (currentPersona === "victoria") {
        activeVoiceName = "Kore";
        styleInstructions.push("in a bright, charismatic, polished lifestyle TV presenter female voice (говорите ярким, обаятельным голосом телеведущей)");
      } else if (currentPersona === "business") {
        activeVoiceName = "Charon";
        styleInstructions.push("in a confident, executive, persuasive corporate keynote speaker voice (говорите статусным, авторитетным голосом бизнес-лидера)");
      } else if (currentPersona === "comedy") {
        activeVoiceName = "Puck";
        styleInstructions.push("in a witty, humorous, playful stand-up comedian voice with animated sarcastic timing (говорите артистичным, ироничным голосом стендап-комика)");
      } else if (currentPersona === "ai_assistant") {
        activeVoiceName = "Kore";
        styleInstructions.push("in a polite, futuristic, perfectly articulated smart AI assistant voice like Jarvis or Siri (говорите вежливым, футуристичным голосом умного голосового ассистента)");
      } else if (currentPersona === "robot") {
        activeVoiceName = "Charon";
        styleInstructions.push("in a mechanical, rhythmic, futuristic sci-fi cyborg voice with precise robotic enunciation (говорите механическим, ритмичным голосом футуристического робота)");
      } else if (currentPersona === "custom" && customPersonaPrompt?.trim()) {
        styleInstructions.push(customPersonaPrompt.trim());
      } else if (voiceName === "Charon") {
        styleInstructions.push("in a deep, resonant, warm, and highly professional male baritone voice");
      } else if (voiceName === "Puck") {
        styleInstructions.push("in a youthful, energetic, bright, and dynamic male voice");
      } else if (voiceName === "Kore") {
        styleInstructions.push("in a warm, pleasant, highly clear, and natural female voice");
      } else if (voiceName === "Fenrir") {
        styleInstructions.push("in a rich, charismatic, expressive, and cinematic female voice with deep emotional intonations");
      }

      // 2. Emotions and Intonations
      if (emotion && emotion !== "neutral") {
        switch (emotion) {
          case "whisper":
            styleInstructions.push("speak in an intimate, velvety whisper, soft breathy voice (говоріть бархатистим інтимним пошептом з м'яким придихом)");
            break;
          case "dramatic":
            styleInstructions.push("speak in an intense, suspenseful, dramatic thriller movie narration tone (говорите в напряженном, драматическом тоне кинотриллера)");
            break;
          case "enthusiastic":
            styleInstructions.push("speak enthusiastically, cheerfully and energetically with a bright smile (говорите воодушевленно, радостно и энергично)");
            break;
          case "sarcastic":
            styleInstructions.push("speak with playful sarcasm, subtle dry irony, and a witty smirk (говорите с легкой иронией и остроумным сарказмом)");
            break;
          case "confident":
            styleInstructions.push("speak with supreme confidence, authority, and poised conviction (говорите максимально уверенно, авторитетно и убедительно)");
            break;
          case "calm":
            styleInstructions.push("speak with deep calm, serenity, and gentle relaxation (говорите спокойно, умиротворенно и расслабленно)");
            break;
        }
      }

      // 3. Pitch adjustments
      if (pitch !== undefined) {
        const pitchVal = Number(pitch);
        if (pitchVal < 0) {
          styleInstructions.push("with a noticeably lower, deeper, chesty pitch (более низким, глубоким тоном)");
        } else if (pitchVal > 0) {
          styleInstructions.push("with a noticeably higher, lighter, youthful pitch (более высоким, звонким тоном)");
        }
      }

      // 4. Speed adjustments
      if (speed !== undefined) {
        const speedVal = Number(speed);
        if (speedVal < 1.0) {
          styleInstructions.push("slowly and deliberately, pacing yourself with deep pauses (медленно и размеренно)");
        } else if (speedVal > 1.0) {
          styleInstructions.push("quickly and dynamically, with a fast-paced conversational tempo (быстро и динамично)");
        }
      }

      // 5. Pauses adjustments
      if (pauses === "short") {
        styleInstructions.push("keeping pauses between sentences extremely brief");
      } else if (pauses === "long") {
        styleInstructions.push("making pauses between sentences long, dramatic, and highly expressive");
      }

      const styleInstructionText = styleInstructions.join(", ");

      console.log(`Generating TTS via model [${selectedModel}] for ID ${recordId} using voice: ${activeVoiceName}`);
      if (styleInstructionText) {
        console.log(`Voice Styling Prompt: "${styleInstructionText}"`);
      }

      // Check if dual-speaker screenplay dialogue mode is requested
      let response;
      if (dialogueMode && selectedModel === "gemini-3.8-flash-tts") {
        // Parse dialogue lines into dual speakers
        const spk1Name = dialogueSpeakers?.speaker1?.name || "Алекс";
        const spk2Name = dialogueSpeakers?.speaker2?.name || "Сэм";
        const spk1Voice = dialogueSpeakers?.speaker1?.voice || "Charon";
        const spk2Voice = dialogueSpeakers?.speaker2?.voice || "Kore";

        const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
        const parts: any[] = [];

        lines.forEach((line: string) => {
          if (line.toLowerCase().startsWith(spk1Name.toLowerCase() + ":")) {
            const dialogueLine = line.substring(spk1Name.length + 1).trim();
            parts.push({
              text: `${spk1Name}: ${dialogueLine}`,
              speechMetadata: {
                speaker: spk1Name,
                style: dialogueSpeakers?.speaker1?.style || styleInstructionText || "Charismatic movie lead"
              }
            });
          } else if (line.toLowerCase().startsWith(spk2Name.toLowerCase() + ":")) {
            const dialogueLine = line.substring(spk2Name.length + 1).trim();
            parts.push({
              text: `${spk2Name}: ${dialogueLine}`,
              speechMetadata: {
                speaker: spk2Name,
                style: dialogueSpeakers?.speaker2?.style || "Natural conversational co-host"
              }
            });
          } else {
            // Default to speaker 1
            parts.push({
              text: `${spk1Name}: ${line}`,
              speechMetadata: {
                speaker: spk1Name,
                style: styleInstructionText || "Clear narration"
              }
            });
          }
        });

        const dialogueModels = [
          "gemini-3.8-flash-tts",
          "gemini-2.5-flash-preview-tts",
          "gemini-3.1-flash-tts-preview"
        ];

        let lastDialogueError: any = null;
        for (const dModel of dialogueModels) {
          try {
            console.log(`Attempting Dialogue TTS generation using model: ${dModel}...`);
            response = await ai.models.generateContent({
              model: dModel,
              contents: [{ role: "user", parts }],
              config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                      {
                        speaker: spk1Name,
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: spk1Voice } }
                      },
                      {
                        speaker: spk2Name,
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: spk2Voice } }
                      }
                    ]
                  }
                }
              }
            });

            const candidateParts = response?.candidates?.[0]?.content?.parts || [];
            const hasAudio = candidateParts.some((p: any) => p?.inlineData?.data);
            if (hasAudio) {
              break;
            }
          } catch (dErr: any) {
            console.warn(`Dialogue model ${dModel} failed: ${dErr.message}. Trying next fallback...`);
            lastDialogueError = dErr;
          }
        }

        if (!response && lastDialogueError) {
          throw lastDialogueError;
        }
      } else {
        // Standard single speaker mode with automatic multi-model quota fallback
        const cleanSpokenText = text.trim();
        const modelsToTry = [
          selectedModel,
          "gemini-2.5-flash-preview-tts",
          "gemini-3.8-flash-lite-tts",
          "gemini-3.1-flash-tts-preview"
        ].filter((m, idx, arr) => arr.indexOf(m) === idx);

        let lastModelError: any = null;
        let successfulModel = selectedModel;

        for (const modelCandidate of modelsToTry) {
          try {
            console.log(`Attempting Gemini TTS generation using model: ${modelCandidate}...`);
            response = await ai.models.generateContent({
              model: modelCandidate,
              contents: [{
                role: "user",
                parts: [{
                  text: cleanSpokenText,
                  speechMetadata: styleInstructionText ? { style: styleInstructionText } : undefined
                }]
              }],
              config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: activeVoiceName },
                  },
                },
              },
            });

            // Verify if candidate contains audio data
            const candidateParts = response?.candidates?.[0]?.content?.parts || [];
            const hasAudio = candidateParts.some((p: any) => p?.inlineData?.data);
            if (hasAudio) {
              successfulModel = modelCandidate;
              break;
            }
          } catch (modelErr: any) {
            console.warn(`Model ${modelCandidate} failed: ${modelErr.message}. Trying next fallback model...`);
            lastModelError = modelErr;
          }
        }

        if (!response && lastModelError) {
          throw lastModelError;
        }
      }

      const allParts = response?.candidates?.[0]?.content?.parts || [];
      const audioPart = allParts.find((p: any) => p?.inlineData?.data);
      const inlineData = audioPart?.inlineData || allParts[0]?.inlineData;
      const base64Audio = inlineData?.data;
      const mimeType = inlineData?.mimeType || "audio/wav";

      if (!base64Audio) {
        return res.status(500).json({ 
          error: "Модели Gemini TTS не смогли сгенерировать аудио (возможно, исчерпана квота запросов). Пожалуйста, попробуйте системный голос или повторите через минуту." 
        });
      }

      console.log(`Gemini TTS response received. mimeType: ${mimeType}`);

      const rawBuffer = Buffer.from(base64Audio, 'base64');
      const { pcm, sampleRate, channels } = extractPcmData(rawBuffer);

      // 1. Resample & Normalize to studio 48kHz Stereo 16-bit
      let processedPcm = normalizeToStereo48kHz(pcm, sampleRate, channels);

      // 2. Apply Warm Tube Bass Boost (cinematic chest resonance)
      if (warmBass) {
        console.log("Applying Warm Tube Bass Boost filter (+5dB @ 140Hz)...");
        processedPcm = applyWarmTubeBass(processedPcm, 5.0);
      }

      // 3. Apply Broadcast Studio Compressor & Limiter
      if (broadcastMastering) {
        console.log("Applying Broadcast Studio Compressor & Limiter...");
        processedPcm = applyBroadcastMastering(processedPcm);
      }

      // 4. Wrap into clean, universal 48kHz Stereo 16-bit WAV file
      const audioBuffer = addWavHeader(processedPcm, 48000, 2, 16);
      const filename = `${recordId}.wav`;
      const filePath = path.join(AUDIO_DIR, filename);
      fs.writeFileSync(filePath, audioBuffer);

      res.json({ 
        audioUrl: `/api/audio/${filename}`,
        id: recordId,
        success: true,
        format: "wav",
        sampleRate: 48000,
        channels: 2,
        modelUsed: selectedModel,
        audioBase64: audioBuffer.toString('base64')
      });
    } catch (error: any) {
      console.error("Gemini TTS Error:", error);
      res.status(500).json({ 
        error: error.message || "Ошибка подключения или генерации аудио на сервере Gemini" 
      });
    }
  });

  // API Route: Get Base64 encoded audio to bypass sandbox browser redirect blocks on downloads
  app.get("/api/audio-base64/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(AUDIO_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Аудиофайл не найден или срок его хранения истек." });
    }

    try {
      const fileBuffer = fs.readFileSync(filePath);
      res.json({
        success: true,
        base64: fileBuffer.toString("base64"),
        filename: filename
      });
    } catch (error: any) {
      console.error("Error reading audio file for base64 download:", error);
      res.status(500).json({ error: error.message || "Не удалось прочитать файл на сервере." });
    }
  });

  // API Route: Serve audio streams (WAV, MP3, etc.) with RFC 206 Range Support
  app.all("/api/audio/:filename", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Disposition, Accept-Ranges");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.get("/api/audio/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(AUDIO_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Audio file not found or expired" });
    }

    // Determine correct content-type header for strict media players and video editors
    let contentType = "audio/wav";
    if (filename.toLowerCase().endsWith(".mp3")) {
      contentType = "audio/mpeg";
    } else if (filename.toLowerCase().endsWith(".ogg")) {
      contentType = "audio/ogg";
    } else if (filename.toLowerCase().endsWith(".webm")) {
      contentType = "audio/webm";
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (req.query.download === "true") {
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
        return res.end();
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });

  // Integrate Vite Dev/Prod Middlewares according to App Guidelines
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vox Studio full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
