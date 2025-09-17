import { useState, useEffect, useRef } from 'react';
import { useProctoring } from '../contexts/ProctoringContext';
import { FaceAnalysis } from '../types/proctoring';

export const useFaceDetection = (videoElement: HTMLVideoElement | null, isActive: boolean) => {
  const [analysis, setAnalysis] = useState<FaceAnalysis>({
    faceDetected: false,
    faceCount: 0,
    headPose: { yaw: 0, pitch: 0, roll: 0 },
    gazeDirection: { x: 0, y: 0 },
    lipMovement: false,
    inFrame: true,
  });

  const { addViolation } = useProctoring();
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastViolationRef = useRef<{ [key: string]: number }>({});

  const detectFaces = async () => {
    if (!videoElement || !isActive) return;

    try {
      // Simulate face detection analysis
      // In a real implementation, this would use MediaPipe or TensorFlow.js
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0);

        // Mock face detection results
        const mockFaceCount = Math.random() > 0.1 ? 1 : Math.random() > 0.95 ? 2 : 0;
        const mockHeadPose = {
          yaw: (Math.random() - 0.5) * 60, // -30 to 30 degrees
          pitch: (Math.random() - 0.5) * 40, // -20 to 20 degrees
          roll: (Math.random() - 0.5) * 30, // -15 to 15 degrees
        };
        
        const mockGazeDirection = {
          x: 0.5 + (Math.random() - 0.5) * 0.4, // 0.3 to 0.7 (center-ish)
          y: 0.5 + (Math.random() - 0.5) * 0.4, // 0.3 to 0.7 (center-ish)
        };

        const newAnalysis: FaceAnalysis = {
          faceDetected: mockFaceCount > 0,
          faceCount: mockFaceCount,
          headPose: mockHeadPose,
          gazeDirection: mockGazeDirection,
          lipMovement: Math.random() > 0.7,
          inFrame: mockFaceCount > 0,
        };

        setAnalysis(newAnalysis);

        // Check for violations
        const now = Date.now();
        const VIOLATION_COOLDOWN = 5000; // 5 seconds

        if (newAnalysis.faceCount === 0 && 
            (!lastViolationRef.current['NO_FACE'] || now - lastViolationRef.current['NO_FACE'] > VIOLATION_COOLDOWN)) {
          addViolation('NO_FACE_DETECTED', 'MAJOR', 'No face detected in camera feed');
          lastViolationRef.current['NO_FACE'] = now;
        }

        if (newAnalysis.faceCount > 1 && 
            (!lastViolationRef.current['MULTIPLE_FACES'] || now - lastViolationRef.current['MULTIPLE_FACES'] > VIOLATION_COOLDOWN)) {
          addViolation('MULTIPLE_FACES', 'CRITICAL', `${newAnalysis.faceCount} faces detected in frame`);
          lastViolationRef.current['MULTIPLE_FACES'] = now;
        }

        // Check head pose violations (looking away)
        const isLookingAway = Math.abs(newAnalysis.headPose.yaw) > 25 || Math.abs(newAnalysis.headPose.pitch) > 20;
        if (isLookingAway && 
            (!lastViolationRef.current['FACE_TURNED'] || now - lastViolationRef.current['FACE_TURNED'] > VIOLATION_COOLDOWN)) {
          addViolation('FACE_TURNED_AWAY', 'MAJOR', 'Face turned away from camera for extended period');
          lastViolationRef.current['FACE_TURNED'] = now;
        }

        // Check gaze direction violations
        const isGazeOffScreen = newAnalysis.gazeDirection.x < 0.2 || newAnalysis.gazeDirection.x > 0.8 ||
                               newAnalysis.gazeDirection.y < 0.2 || newAnalysis.gazeDirection.y > 0.8;
        if (isGazeOffScreen && 
            (!lastViolationRef.current['GAZE_OFF'] || now - lastViolationRef.current['GAZE_OFF'] > VIOLATION_COOLDOWN)) {
          addViolation('GAZE_OFF_SCREEN', 'MINOR', 'Gaze detected off-screen for extended period');
          lastViolationRef.current['GAZE_OFF'] = now;
        }
      }
    } catch (error) {
      console.error('Face detection error:', error);
    }
  };

  useEffect(() => {
    if (isActive && videoElement) {
      intervalRef.current = setInterval(detectFaces, 500); // Check every 500ms
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, videoElement]);

  return analysis;
};