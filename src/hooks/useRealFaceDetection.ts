import { useEffect, useRef, useState } from "react";
import {
  FaceDetector,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

type Severity = "WARNING" | "MAJOR" | "CRITICAL";
type Violation = {
  time: string;
  type: string;
  severity: Severity;
  detail?: string;
};

export function useRealFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement>,
  onViolation?: (v: Violation) => void,
  enabled: boolean = true
) {
  const detectorRef = useRef<FaceDetector | null>(null);
  const lastViolationRef = useRef<number>(0);
  const gazeAwayStartRef = useRef<number | null>(null);
  const gazeAwayCountRef = useRef<number>(0);
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
  const GAZE_AWAY_THRESHOLD = 0.25; // Threshold for gaze away from screen
  const GAZE_AWAY_DURATION = 3000; // Duration in ms to consider as prolonged gaze away

  useEffect(() => {
    if (!enabled) return;

    let running = true;

    async function init() {
      try {
        console.log("Initializing face detection...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );

        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/face_detection_short_range.tflite",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.3, // Lower threshold for better detection
          minSuppressionThreshold: 0.2,
        });

        detectorRef.current = detector;
        console.log("Face detection initialized successfully");
      } catch (err) {
        console.error("Face detection initialization error:", err);
        // Try fallback initialization
        try {
          console.log("Trying fallback face detection initialization...");
          const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
          );

          const detector = await FaceDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@latest/face_detection_short_range.tflite",
            },
            runningMode: "VIDEO",
            minDetectionConfidence: 0.3,
            minSuppressionThreshold: 0.2,
          });

          detectorRef.current = detector;
          console.log("Fallback face detection initialized successfully");
        } catch (fallbackErr) {
          console.error("Fallback face detection initialization also failed:", fallbackErr);
        }
      }
    }

    init();

    return () => {
      running = false;
      detectorRef.current?.close();
      detectorRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let frameId: number;
    let lastDetectionTime = 0;
    const DETECTION_INTERVAL = 100; // Detect every 100ms for better performance

    const detectFrame = async () => {
      const now = Date.now();
      if (now - lastDetectionTime < DETECTION_INTERVAL) {
        frameId = requestAnimationFrame(detectFrame);
        return;
      }
      lastDetectionTime = now;

      if (!videoRef.current || !detectorRef.current) {
        frameId = requestAnimationFrame(detectFrame);
        return;
      }

      // Check if video is ready
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        frameId = requestAnimationFrame(detectFrame);
        return;
      }

      try {
        const detector = detectorRef.current;
        const results = await detector.detectForVideo(
          videoRef.current,
          performance.now()
        );

        const faceCount = results.detections?.length || 0;
        const faceDetected = faceCount > 0;

        let headPose = { yaw: 0, pitch: 0, roll: 0 };
        let inFrame = false;
        let gazeDirection = { x: 0, y: 0 };

        // Check for multiple faces
        if (faceCount > 1 && onViolation) {
          maybeAddViolation(
            "MULTIPLE_FACES",
            `Multiple faces detected (${faceCount} faces)`,
            "CRITICAL"
          );
        }

        if (faceDetected && results.detections && results.detections.length > 0) {
          const detection = results.detections[0];
          const keypoints = detection.keypoints || [];

          if (keypoints.length > 2) {
            const nose = keypoints[2];
            const leftEye = keypoints[0];
            const rightEye = keypoints[1];

            const yaw = (nose.x - 0.5) * 2; // Convert to degrees-like value
            const pitch = (nose.y - 0.5) * 2;

            // Calculate gaze direction based on eye positions
            const eyeCenterX = (leftEye.x + rightEye.x) / 2;
            const eyeCenterY = (leftEye.y + rightEye.y) / 2;
            gazeDirection = {
              x: (eyeCenterX - 0.5) * 2,
              y: (eyeCenterY - 0.5) * 2
            };

            headPose = { yaw, pitch, roll: 0 };
            inFrame = Math.abs(yaw) < YAW_THRESHOLD && Math.abs(pitch) < PITCH_THRESHOLD;

            // Check for head rotation (looking away)
            if (!inFrame && onViolation) {
              maybeAddViolation(
                "HEAD_TURN",
                `Head movement detected (yaw=${yaw.toFixed(2)}, pitch=${pitch.toFixed(2)})`,
                "WARNING"
              );
            }

            // Check for prolonged gaze away from screen
            const isGazeAway = Math.abs(gazeDirection.x) > GAZE_AWAY_THRESHOLD ||
                              Math.abs(gazeDirection.y) > GAZE_AWAY_THRESHOLD;

            if (isGazeAway) {
              if (gazeAwayStartRef.current === null) {
                gazeAwayStartRef.current = Date.now();
              } else if (Date.now() - gazeAwayStartRef.current > GAZE_AWAY_DURATION) {
                gazeAwayCountRef.current += 1;
                if (onViolation) {
                  maybeAddViolation(
                    "GAZE_AWAY",
                    `Prolonged gaze away from screen (${gazeAwayCountRef.current} instances)`,
                    "MAJOR"
                  );
                }
                gazeAwayStartRef.current = Date.now(); // Reset for next detection
              }
            } else {
              gazeAwayStartRef.current = null; // Reset when gaze returns to screen
            }
          }
        } else if (onViolation) {
          maybeAddViolation("NO_FACE", "No face detected", "MAJOR");
        }

        setFaceAnalysis({
          faceDetected,
          faceCount,
          headPose,
          gazeDirection,
          lipMovement: false, // Placeholder
          inFrame,
        });
      } catch (err) {
        console.error("Face detection error:", err);
        // Continue trying to detect even if there's an error
      }

      frameId = requestAnimationFrame(detectFrame);
    };

    detectFrame();

    return () => cancelAnimationFrame(frameId);
  }, [videoRef, enabled, onViolation]);

  function maybeAddViolation(type: string, detail: string, severity: Severity) {
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
