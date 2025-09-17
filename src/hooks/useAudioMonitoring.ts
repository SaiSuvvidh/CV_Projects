import { useState, useEffect, useRef } from 'react';
import { useProctoring } from '../contexts/ProctoringContext';
import { AudioAnalysis } from '../types/proctoring';

export const useAudioMonitoring = (stream: MediaStream | null, isActive: boolean) => {
  const [analysis, setAnalysis] = useState<AudioAnalysis>({
    volume: 0,
    frequency: 0,
    speechActivity: false,
    voiceCount: 1,
  });

  const { addViolation } = useProctoring();
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const animationFrameRef = useRef<number>();
  const lastViolationRef = useRef<{ [key: string]: number }>({});

  const analyzeAudio = () => {
    if (!analyserRef.current || !isActive) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate volume (RMS)
    const volume = Math.sqrt(
      dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length
    ) / 255;

    // Calculate dominant frequency
    let maxIndex = 0;
    let maxValue = 0;
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }
    const frequency = (maxIndex * audioContextRef.current!.sampleRate) / (2 * dataArray.length);

    // Detect speech activity (simple threshold-based)
    const speechActivity = volume > 0.02 && frequency > 80 && frequency < 3400;
    
    // Mock voice count detection (would use more sophisticated ML in real implementation)
    const voiceCount = speechActivity ? (Math.random() > 0.9 ? 2 : 1) : 0;

    const newAnalysis: AudioAnalysis = {
      volume,
      frequency,
      speechActivity,
      voiceCount,
    };

    setAnalysis(newAnalysis);

    // Check for violations
    const now = Date.now();
    const VIOLATION_COOLDOWN = 3000; // 3 seconds

    if (speechActivity && 
        (!lastViolationRef.current['SPEECH'] || now - lastViolationRef.current['SPEECH'] > VIOLATION_COOLDOWN)) {
      addViolation('SPEECH_DETECTED', 'MINOR', 'Speech activity detected during exam');
      lastViolationRef.current['SPEECH'] = now;
    }

    if (voiceCount > 1 && 
        (!lastViolationRef.current['MULTIPLE_VOICES'] || now - lastViolationRef.current['MULTIPLE_VOICES'] > VIOLATION_COOLDOWN)) {
      addViolation('MULTIPLE_VOICES', 'CRITICAL', 'Multiple voices detected in audio feed');
      lastViolationRef.current['MULTIPLE_VOICES'] = now;
    }

    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  };

  useEffect(() => {
    if (stream && isActive) {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 2048;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      analyzeAudio();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stream, isActive]);

  return analysis;
};