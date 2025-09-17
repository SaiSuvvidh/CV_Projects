import { useState, useEffect, useRef, useCallback } from 'react';

export const useMediaStream = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const updateVideoElement = useCallback((newStream: MediaStream | null) => {
    if (videoRef.current) {
      videoRef.current.srcObject = newStream;
    }
  }, []);

  const startCamera = async () => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      let newStream: MediaStream;
      if (stream) {
        // Combine with existing audio track if present
        newStream = new MediaStream([...stream.getTracks(), ...videoStream.getTracks()]);
      } else {
        newStream = videoStream;
      }

      setStream(newStream);
      setCameraEnabled(true);
      updateVideoElement(newStream);
      return newStream;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access camera');
      throw err;
    }
  };

  const startMic = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      let newStream: MediaStream;
      if (stream) {
        // Combine with existing video track if present
        newStream = new MediaStream([...stream.getTracks(), ...audioStream.getTracks()]);
      } else {
        newStream = audioStream;
      }

      setStream(newStream);
      setMicEnabled(true);
      updateVideoElement(newStream);
      return newStream;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      throw err;
    }
  };

  const stopCamera = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach(track => track.stop());

      const remainingTracks = stream.getTracks().filter(track => track.kind !== 'video');
      if (remainingTracks.length > 0) {
        const newStream = new MediaStream(remainingTracks);
        setStream(newStream);
        updateVideoElement(newStream);
      } else {
        setStream(null);
        updateVideoElement(null);
      }
    }
    setCameraEnabled(false);
  };

  const stopMic = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => track.stop());

      const remainingTracks = stream.getTracks().filter(track => track.kind !== 'audio');
      if (remainingTracks.length > 0) {
        const newStream = new MediaStream(remainingTracks);
        setStream(newStream);
        updateVideoElement(newStream);
      } else {
        setStream(null);
        updateVideoElement(null);
      }
    }
    setMicEnabled(false);
  };

  const startStream = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      setStream(mediaStream);
      setCameraEnabled(true);
      setMicEnabled(true);
      updateVideoElement(mediaStream);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access camera and microphone');
    } finally {
      setIsLoading(false);
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraEnabled(false);
    setMicEnabled(false);
    updateVideoElement(null);
  };

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  return {
    stream,
    error,
    isLoading,
    cameraEnabled,
    micEnabled,
    videoRef,
    startStream,
    stopStream,
    startCamera,
    stopCamera,
    startMic,
    stopMic
  };
};
