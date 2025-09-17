import React from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRealAudioMonitoring } from '../hooks/useRealAudioMonitoring';

interface MicrophoneTestProps {
  mediaStream: MediaStream | null;
  onReadyStateChange: (isReady: boolean) => void;
}

export const MicrophoneTest: React.FC<MicrophoneTestProps> = ({ mediaStream, onReadyStateChange }) => {
  const audioAnalysis = useRealAudioMonitoring(mediaStream); // Preview mode, no violations

  React.useEffect(() => {
    // Consider mic ready if we have stream (basic requirement)
    onReadyStateChange(!!mediaStream);
  }, [mediaStream, onReadyStateChange]);

  const getAudioStatus = () => {
    if (!mediaStream) return { status: 'no-mic', message: 'Microphone not available', color: 'text-red-500', icon: MicOff };
    if (audioAnalysis.speechActivity) return { status: 'voice-detected', message: 'Voice detected', color: 'text-green-500', icon: Mic };
    if (audioAnalysis.volume > 0.005) return { status: 'ambient', message: 'Ambient audio detected', color: 'text-yellow-500', icon: Volume2 };
    return { status: 'silent', message: 'Microphone ready - speak to test', color: 'text-blue-500', icon: Mic };
  };

  const audioStatus = getAudioStatus();
  const StatusIcon = audioStatus.icon;

  return (
    <div className="bg-wood-surface dark:bg-wood-surface-dark rounded-lg border border-wood-border dark:border-wood-border-dark p-6">
      <h3 className="text-lg font-semibold text-wood-text dark:text-wood-text-dark mb-4 flex items-center">
        <Mic className="w-5 h-5 mr-2 text-wood-accent dark:text-wood-accent-dark" />
        Microphone Test
      </h3>

      <div className="space-y-4">
        {/* Audio level visualization */}
        <div className="flex items-center space-x-4">
          <motion.div
            animate={audioAnalysis.speechActivity ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <StatusIcon className={`w-6 h-6 ${audioStatus.color}`} />
          </motion.div>
          
          <div className="flex-1">
            <div className="w-full h-3 bg-wood-light dark:bg-wood-dark rounded-full overflow-hidden">
              <motion.div 
                className={`h-full transition-all duration-100 ${
                  audioAnalysis.speechActivity ? 'bg-green-500' : 
                  audioAnalysis.volume > 0.005 ? 'bg-yellow-500' : 'bg-gray-400'
                }`}
                style={{ width: `${Math.min(100, audioAnalysis.volume * 2000)}%` }}
              />
            </div>
          </div>
          
          <span className="text-sm font-mono text-wood-text-secondary dark:text-wood-text-secondary-dark">
            {(audioAnalysis.volume * 100).toFixed(1)}%
          </span>
        </div>

        {/* Status message */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            audioStatus.status === 'voice-detected' ? 'bg-green-500 animate-pulse' :
            audioStatus.status === 'ambient' ? 'bg-yellow-500' :
            audioStatus.status === 'silent' ? 'bg-blue-500' : 'bg-red-500'
          }`} />
          <span className={`text-sm font-medium ${audioStatus.color}`}>
            {audioStatus.message}
          </span>
        </div>

        {/* Voice activity details */}
        {audioAnalysis.speechActivity && (
          <div className="bg-wood-light dark:bg-wood-dark rounded-lg p-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-wood-text-secondary dark:text-wood-text-secondary-dark">Frequency:</span>
                <span className="ml-2 font-mono text-wood-text dark:text-wood-text-dark">
                  {audioAnalysis.frequency.toFixed(0)} Hz
                </span>
              </div>
              <div>
                <span className="text-wood-text-secondary dark:text-wood-text-secondary-dark">Voices:</span>
                <span className="ml-2 font-mono text-wood-text dark:text-wood-text-dark">
                  {audioAnalysis.voiceCount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-wood-text-secondary dark:text-wood-text-secondary-dark">
          <p>• Speak normally to test voice detection</p>
          <p>• Ensure you're in a quiet environment</p>
          <p>• The system will monitor for unauthorized speech during the exam</p>
        </div>
      </div>
    </div>
  );
};
