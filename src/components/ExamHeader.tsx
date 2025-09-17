import React from 'react';
import { Clock, User, FileText, Activity } from 'lucide-react';
import { useProctoring } from '../contexts/ProctoringContext';
import { ThemeToggle } from './ThemeToggle';
import { format } from 'date-fns';

export const ExamHeader: React.FC = () => {
  const { session, calculateProctoringScore } = useProctoring();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedTime = () => {
    if (!session?.startTime) return '00:00:00';
    const elapsed = Math.floor((currentTime.getTime() - session.startTime.getTime()) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => {
    if (!session?.startTime || !session?.duration) return '--:--:--';
    const elapsed = Math.floor((currentTime.getTime() - session.startTime.getTime()) / 1000);
    const remaining = Math.max(0, (session.duration * 60) - elapsed);
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-wood-surface dark:bg-wood-surface-dark border-b border-wood-border dark:border-wood-border-dark px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-wood-accent dark:text-wood-accent-dark" />
            <div>
              <p className="text-sm text-wood-text-secondary dark:text-wood-text-secondary-dark">Exam Name</p>
              <p className="font-semibold text-wood-text dark:text-wood-text-dark">
                {session?.examName || 'No Exam Active'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-wood-accent dark:text-wood-accent-dark" />
            <div>
              <p className="text-sm text-wood-text-secondary dark:text-wood-text-secondary-dark">Candidate ID</p>
              <p className="font-semibold text-wood-text dark:text-wood-text-dark">
                {session?.candidateId || '--'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-wood-accent dark:text-wood-accent-dark" />
            <div>
              <p className="text-sm text-wood-text-secondary dark:text-wood-text-secondary-dark">Time Remaining</p>
              <p className="font-mono font-semibold text-wood-text dark:text-wood-text-dark">
                {getRemainingTime()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-wood-accent dark:text-wood-accent-dark" />
            <div>
              <p className="text-sm text-wood-text-secondary dark:text-wood-text-secondary-dark">Proctoring Score</p>
              <p className="font-semibold text-wood-text dark:text-wood-text-dark">
                {session?.status === 'IN_PROGRESS' ? calculateProctoringScore().toFixed(0) : '--'}/100
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              session?.status === 'IN_PROGRESS' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`} />
            <span className="text-sm font-medium text-wood-text dark:text-wood-text-dark">
              {session?.status === 'IN_PROGRESS' ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};