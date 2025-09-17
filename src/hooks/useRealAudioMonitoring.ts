import { useEffect, useState } from "react";

type Violation = {
  time: string;
  type: string;
  severity: "WARNING" | "MAJOR" | "CRITICAL";
};

export function useRealAudioMonitoring(
  stream: MediaStream | null,
  onViolation?: (violation: Violation) => void
) {
  const [audioAnalysis, setAudioAnalysis] = useState({
    volume: 0,
    frequency: 0,
    speechActivity: false,
    voiceCount: 1,
    whisperActivity: false,
    backgroundNoise: false,
  });

  useEffect(() => {
    if (!stream) {
      setAudioAnalysis({
        volume: 0,
        frequency: 0,
        speechActivity: false,
        voiceCount: 0,
        whisperActivity: false,
        backgroundNoise: false,
      });
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let micSource: MediaStreamAudioSourceNode | null = null;
    let rafId: number;
    let lastViolationTime = 0;

    async function setup() {
      try {
        audioContext = new AudioContext();
        if (!stream) return;
        micSource = audioContext.createMediaStreamSource(stream);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        micSource.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);

        const detectAudio = () => {
          if (!analyser) return;

          analyser.getByteFrequencyData(dataArray);
          analyser.getByteFrequencyData(frequencyData);

          // Calculate volume (RMS-like)
          const sum = dataArray.reduce((a, b) => a + b * b, 0);
          const volume = Math.sqrt(sum / dataArray.length) / 128; // Normalize to 0-1

          // Calculate dominant frequency
          let maxIndex = 0;
          let maxValue = 0;
          for (let i = 0; i < frequencyData.length; i++) {
            if (frequencyData[i] > maxValue) {
              maxValue = frequencyData[i];
              maxIndex = i;
            }
          }
          const frequency = (maxIndex * audioContext!.sampleRate) / (2 * analyser.frequencyBinCount);

          // Enhanced speech detection with whisper detection
          const isWhisper = volume > 0.005 && volume < 0.02 && frequency > 200 && frequency < 2000;
          const isNormalSpeech = volume > 0.02 && frequency > 80 && frequency < 3400;
          const isBackgroundNoise = volume > 0.01 && (frequency < 80 || frequency > 3400);

          const speechActivity = isWhisper || isNormalSpeech;
          const whisperActivity = isWhisper;
          const backgroundNoise = isBackgroundNoise;

          // Voice count estimation (simplified)
          const voiceCount = speechActivity ? 1 : 0;

          setAudioAnalysis({
            volume,
            frequency,
            speechActivity,
            voiceCount,
            whisperActivity,
            backgroundNoise,
          });

          // Trigger violation if speech detected and callback provided
          if (speechActivity && onViolation) {
            const now = Date.now();
            if (now - lastViolationTime > 2000) { // Debounce violations
              lastViolationTime = now;
              onViolation({
                time: new Date().toISOString(),
                type: "Speech detected",
                severity: "CRITICAL",
              });
            }
          }

          rafId = requestAnimationFrame(detectAudio);
        };

        detectAudio();
      } catch (err) {
        console.error("Audio monitoring setup error:", err);
      }
    }

    setup();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (micSource) micSource.disconnect();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [stream, onViolation]);

  return audioAnalysis;
}
