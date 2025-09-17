import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

type Violation = {
  time: string;
  type: string;
  severity: 'WARNING' | 'MAJOR' | 'CRITICAL';
  detail?: string;
};

export function usePythonFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement>,
  onViolation?: (v: Violation) => void,
  enabled: boolean = true
) {
  const socketRef = useRef<Socket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastViolationRef = useRef<number>(0);
  const [faceAnalysis, setFaceAnalysis] = useState({
    faceDetected: false,
    faceCount: 0,
    headPose: { yaw: 0, pitch: 0, roll: 0 },
    gazeDirection: { x: 0, y: 0 },
    lipMovement: false,
    inFrame: false,
  });

  // Thresholds
  const YAW_THRESHOLD = 0.18;
  const PITCH_THRESHOLD = 0.18;
  const DEBOUNCE_MS = 2500;

  const connectToBackend = useCallback(() => {
    if (socketRef.current?.connected) return;

    console.log('Connecting to Python face detection backend...');
    socketRef.current = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to Python backend');
      socketRef.current?.emit('start_detection');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from Python backend');
    });

    socketRef.current.on('status', (data) => {
      console.log('Backend status:', data.message);
    });

    socketRef.current.on('detection_result', (result) => {
      if (result.error) {
        console.error('Face detection error:', result.error);
        return;
      }

      const faceCount = result.face_count || 0;
      const faceDetected = faceCount > 0;

      // Calculate head pose approximation from face bounding box
      let headPose = { yaw: 0, pitch: 0, roll: 0 };
      let inFrame = false;

      if (faceDetected && result.faces && result.faces.length > 0) {
        const face = result.faces[0];
        const centerX = face.x + face.width / 2;
        const centerY = face.y + face.height / 2;

        // Approximate head pose based on face position in frame
        // Assuming 640x480 video dimensions
        const yaw = (centerX - 320) / 320; // -1 to 1
        const pitch = (centerY - 240) / 240; // -1 to 1

        headPose = { yaw, pitch, roll: 0 };
        inFrame = Math.abs(yaw) < YAW_THRESHOLD && Math.abs(pitch) < PITCH_THRESHOLD;
      }

      setFaceAnalysis({
        faceDetected,
        faceCount,
        headPose,
        gazeDirection: { x: 0, y: 0 }, // Not available from Python backend
        lipMovement: false, // Not available from Python backend
        inFrame,
      });

      // Trigger violations
      if (faceCount > 1 && onViolation) {
        maybeAddViolation(
          "MULTIPLE_FACES",
          `Multiple faces detected (${faceCount} faces)`,
          "CRITICAL"
        );
      }

      if (!faceDetected && onViolation) {
        maybeAddViolation("NO_FACE", "No face detected", "MAJOR");
      }

      if (!inFrame && faceDetected && onViolation) {
        maybeAddViolation(
          "HEAD_TURN",
          `Head movement detected (yaw=${headPose.yaw.toFixed(2)}, pitch=${headPose.pitch.toFixed(2)})`,
          "WARNING"
        );
      }
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Failed to connect to Python backend:', error);
    });
  }, [onViolation]);

  const disconnectFromBackend = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('stop_detection');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const captureAndSendFrame = useCallback(() => {
    if (!videoRef.current || !socketRef.current?.connected || !enabled) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const frameData = canvas.toDataURL('image/jpeg', 0.8);

    // Send to Python backend
    socketRef.current.emit('process_frame', { frame: frameData });
  }, [videoRef, enabled]);

  useEffect(() => {
    if (!enabled) return;

    connectToBackend();

    return () => {
      disconnectFromBackend();
    };
  }, [enabled, connectToBackend, disconnectFromBackend]);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(captureAndSendFrame, 100); // Process every 100ms

    return () => clearInterval(interval);
  }, [enabled, captureAndSendFrame]);

  function maybeAddViolation(type: string, detail: string, severity: 'WARNING' | 'MAJOR' | 'CRITICAL') {
    if (!onViolation) return;

    const now = Date.now();
    if (now - lastViolationRef.current < DEBOUNCE_MS) return;

    lastViolationRef.current = now;
    onViolation({
      time: new Date().toISOString(),
      type,
      severity,
      detail,
    });
  }

  return faceAnalysis;
}
