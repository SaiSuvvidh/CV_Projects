import React from 'react';
import { Camera, CameraOff, Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRealFaceDetection } from '../hooks/useRealFaceDetection';

interface CameraPreviewProps {
  mediaStream: MediaStream | null;
  onReadyStateChange: (isReady: boolean) => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({ mediaStream, onReadyStateChange }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const faceAnalysis = useRealFaceDetection(videoRef, undefined, false); // Preview mode, no violations

  React.useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  React.useEffect(() => {
    const isReady = mediaStream && faceAnalysis.faceDetected && faceAnalysis.faceCount === 1;
    onReadyStateChange(!!isReady);
  }, [mediaStream, faceAnalysis.faceDetected, faceAnalysis.faceCount, onReadyStateChange]);

  const getFaceStatus = () => {
    if (!mediaStream) return { status: 'no-camera', message: 'Camera not available', color: 'text-red-500' };
    if (!faceAnalysis.faceDetected) return { status: 'no-face', message: 'No face detected', color: 'text-yellow-500' };
    if (faceAnalysis.faceCount > 1) return { status: 'multiple-faces', message: 'Multiple faces detected', color: 'text-red-500' };
    if (Math.abs(faceAnalysis.headPose.yaw) > 15 || Math.abs(faceAnalysis.headPose.pitch) > 15) {
      return { status: 'face-turned', message: 'Please look directly at camera', color: 'text-yellow-500' };
    }
    return { status: 'ready', message: 'Perfect! You\'re ready to start', color: 'text-green-500' };
  };

  const faceStatus = getFaceStatus();

  return (
    <div className="relative bg-wood-surface dark:bg-wood-surface-dark rounded-lg border border-wood-border dark:border-wood-border-dark overflow-hidden">
      {/* Video element */}
      <div className="aspect-video bg-black relative">
        {mediaStream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <div className="flex flex-col items-center space-y-4">
              <Camera className="w-12 h-12 text-gray-500" />
              <p className="text-gray-500">Click to enable camera</p>
            </div>
          </div>
        )}
      </div>

      {/* Focus guide box with animation */}
      {mediaStream && (
        <div className="absolute inset-0 pointer-events-none">
          <motion.div 
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-2 rounded-lg ${
              faceStatus.status === 'ready' ? 'border-green-500' : 'border-white border-dashed'
            }`}
            animate={faceStatus.status === 'ready' ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-white text-sm font-medium text-center">
              Position your face within this area
            </div>
            
            {/* Status indicator */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
              {faceStatus.status === 'ready' ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <span className={`text-sm font-medium ${faceStatus.color}`}>
                {faceStatus.message}
              </span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Camera status */}
      <div className="p-4 bg-wood-light dark:bg-wood-dark">
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            mediaStream ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 
                          'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
          }`}>
            {mediaStream ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            <span>{mediaStream ? 'Camera Active' : 'Camera Inactive'}</span>
          </div>
          {faceAnalysis.faceDetected && (
            <div className="text-sm text-wood-text-secondary dark:text-wood-text-secondary-dark">
              Faces: {faceAnalysis.faceCount} | 
              Pose: Y{faceAnalysis.headPose.yaw.toFixed(1)}° P{faceAnalysis.headPose.pitch.toFixed(1)}°
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
