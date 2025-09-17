import React, { forwardRef, useEffect, useRef } from "react";
import { usePythonFaceDetection } from "../hooks/usePythonFaceDetection";
import { useRealAudioMonitoring } from "../hooks/useRealAudioMonitoring";

interface VideoFeedProps {
  cameraEnabled: boolean;
  micEnabled: boolean;
  mediaStream?: MediaStream | null;
  onViolation?: (violation: any) => void;
}

const VideoFeed = forwardRef<HTMLVideoElement, VideoFeedProps>(({
  cameraEnabled,
  micEnabled,
  mediaStream,
  onViolation
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Use real-time face detection
  const faceAnalysis = usePythonFaceDetection(
    videoRef,
    onViolation,
    cameraEnabled
  );

  // Use real-time audio monitoring
  const audioAnalysis = useRealAudioMonitoring(
    mediaStream || null,
    onViolation
  );

  // Attach media stream to video element
  useEffect(() => {
    if (videoRef.current) {
      if (mediaStream) {
        videoRef.current.srcObject = mediaStream;
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [mediaStream]);

  // Forward the ref to the video element
  React.useImperativeHandle(ref, () => videoRef.current!, []);

  return (
    <div className="p-4">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="rounded-lg shadow w-full h-64 object-cover"
      />

      {/* Real-time status indicators */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        {/* Face detection status */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Face Detection
          </h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={faceAnalysis.faceDetected ? 'text-green-600' : 'text-red-600'}>
                {faceAnalysis.faceDetected ? 'Detected' : 'Not Detected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Faces:</span>
              <span>{faceAnalysis.faceCount}</span>
            </div>
            {faceAnalysis.faceDetected && (
              <>
                <div className="flex justify-between">
                  <span>Pose Y:</span>
                  <span>{faceAnalysis.headPose.yaw.toFixed(2)}°</span>
                </div>
                <div className="flex justify-between">
                  <span>Pose P:</span>
                  <span>{faceAnalysis.headPose.pitch.toFixed(2)}°</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Audio monitoring status */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Audio Monitoring
          </h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Volume:</span>
              <span>{(audioAnalysis.volume * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Frequency:</span>
              <span>{audioAnalysis.frequency.toFixed(0)} Hz</span>
            </div>
            <div className="flex justify-between">
              <span>Speech:</span>
              <span className={audioAnalysis.speechActivity ? 'text-green-600' : 'text-gray-600'}>
                {audioAnalysis.speechActivity ? 'Active' : 'Silent'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Voices:</span>
              <span>{audioAnalysis.voiceCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Camera/Mic status */}
      <div className="mt-4 flex justify-center space-x-4">
        <div className={`px-3 py-1 rounded-full text-sm ${
          cameraEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          Camera: {cameraEnabled ? 'On' : 'Off'}
        </div>
        <div className={`px-3 py-1 rounded-full text-sm ${
          micEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          Mic: {micEnabled ? 'On' : 'Off'}
        </div>
      </div>
    </div>
  );
});

export default VideoFeed;
