import { useState } from 'react';
import { Play, Square, Settings, UserCheck, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useProctoring } from '../contexts/ProctoringContext';
import { CameraPreview } from './CameraPreview';
import { MicrophoneTest } from './MicrophoneTest';

export interface ExamControlsProps {
  onToggleCamera: (enabled: boolean) => void;
  onToggleMic: (enabled: boolean) => void;
  mediaStream: MediaStream | null;
}

export function ExamControls({ onToggleCamera, onToggleMic, mediaStream }: ExamControlsProps) {
  const { session, startSession, endSession, startRecording, stopRecording, calculateProctoringScore } = useProctoring();
  const [showSetup, setShowSetup] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [examData, setExamData] = useState({
    examName: 'Mathematics Final Exam',
    candidateId: 'CAND001',
    duration: 120, // minutes
  });

  const handleStartExam = () => {
    if (session?.status === 'IN_PROGRESS') return;
    
    startSession(examData);
    startRecording();
  };

  const handleEndExam = () => {
    if (session?.status !== 'IN_PROGRESS') return;
    
    stopRecording();
    endSession();
    
    // Show final score
    const finalScore = calculateProctoringScore();
    alert(`Exam completed!\nFinal Proctoring Score: ${finalScore.toFixed(0)}/100`);
  };

  const isExamActive = session?.status === 'IN_PROGRESS';
  const isSystemReady = cameraReady && micReady;

  return (
    <div className="space-y-4">
      {/* System Readiness Check */}
      {!isExamActive && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CameraPreview mediaStream={mediaStream} onReadyStateChange={setCameraReady} />
          <MicrophoneTest mediaStream={mediaStream} onReadyStateChange={setMicReady} />
        </div>
      )}

      {/* Setup Panel */}
      {showSetup && !isExamActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-wood-surface dark:bg-wood-surface-dark rounded-lg border border-wood-border dark:border-wood-border-dark p-6"
        >
          <h3 className="text-lg font-semibold text-wood-text dark:text-wood-text-dark mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Exam Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-wood-text dark:text-wood-text-dark mb-2">
                Exam Name
              </label>
              <input
                type="text"
                value={examData.examName}
                onChange={(e) => setExamData({ ...examData, examName: e.target.value })}
                className="w-full px-3 py-2 border border-wood-border dark:border-wood-border-dark rounded-md bg-wood-light dark:bg-wood-dark text-wood-text dark:text-wood-text-dark focus:outline-none focus:ring-2 focus:ring-wood-accent dark:focus:ring-wood-accent-dark"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-wood-text dark:text-wood-text-dark mb-2">
                Candidate ID
              </label>
              <input
                type="text"
                value={examData.candidateId}
                onChange={(e) => setExamData({ ...examData, candidateId: e.target.value })}
                className="w-full px-3 py-2 border border-wood-border dark:border-wood-border-dark rounded-md bg-wood-light dark:bg-wood-dark text-wood-text dark:text-wood-text-dark focus:outline-none focus:ring-2 focus:ring-wood-accent dark:focus:ring-wood-accent-dark"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-wood-text dark:text-wood-text-dark mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={examData.duration}
                onChange={(e) => setExamData({ ...examData, duration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-wood-border dark:border-wood-border-dark rounded-md bg-wood-light dark:bg-wood-dark text-wood-text dark:text-wood-text-dark focus:outline-none focus:ring-2 focus:ring-wood-accent dark:focus:ring-wood-accent-dark"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Controls */}
      <div className="flex items-center justify-center space-x-4">
        {!isExamActive ? (
          <>
            {/* System Status Indicator */}
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              isSystemReady ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                             'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
            }`}>
              <CheckCircle className={`w-5 h-5 ${isSystemReady ? 'text-green-500' : 'text-yellow-500'}`} />
              <span className="text-sm font-medium">
                {isSystemReady ? 'System Ready' : 'System Check in Progress'}
              </span>
            </div>
            
            <button
              onClick={() => setShowSetup(!showSetup)}
              className="px-6 py-3 bg-wood-accent dark:bg-wood-accent-dark text-white rounded-lg font-medium hover:bg-wood-accent-hover dark:hover:bg-wood-accent-dark-hover transition-colors flex items-center space-x-2"
            >
              <Settings className="w-5 h-5" />
              <span>Setup Exam</span>
            </button>
            
            <motion.button
              onClick={handleStartExam}
              disabled={!isSystemReady}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-8 py-4 rounded-lg font-semibold text-lg flex items-center space-x-3 shadow-lg transition-all duration-200 ${
                isSystemReady 
                  ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer' 
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              <Play className="w-6 h-6" />
              <span>Start Exam</span>
            </motion.button>
          </>
        ) : (
          <motion.button
            onClick={handleEndExam}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-lg flex items-center space-x-3 shadow-lg transition-all duration-200"
          >
            <Square className="w-6 h-6" />
            <span>End Exam</span>
          </motion.button>
        )}
      </div>

      {/* ID Verification Button (shown during exam) */}
      {isExamActive && (
        <div className="text-center">
          <button
            onClick={() => {
              // Simulate ID verification
              alert('Please hold your ID card up to the camera for verification.');
            }}
            className="px-4 py-2 bg-wood-accent dark:bg-wood-accent-dark text-white rounded-lg font-medium hover:bg-wood-accent-hover dark:hover:bg-wood-accent-dark-hover transition-colors flex items-center space-x-2 mx-auto"
          >
            <UserCheck className="w-4 h-4" />
            <span>ID Verification</span>
          </button>
        </div>
      )}

      {/* Camera and Mic Controls */}
      <div className="flex gap-4">
        <button
          className="px-3 py-1 rounded bg-blue-500 text-white"
          onClick={() => onToggleCamera(true)}
        >
          Camera On
        </button>
        <button
          className="px-3 py-1 rounded bg-gray-500 text-white"
          onClick={() => onToggleCamera(false)}
        >
          Camera Off
        </button>
        <button
          className="px-3 py-1 rounded bg-green-500 text-white"
          onClick={() => onToggleMic(true)}
        >
          Mic On
        </button>
        <button
          className="px-3 py-1 rounded bg-red-500 text-white"
          onClick={() => onToggleMic(false)}
        >
          Mic Off
        </button>
      </div>
    </div>
  );
};