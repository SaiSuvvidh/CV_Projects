// src/App.tsx
import React, { useState, useRef } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProctoringProvider } from './contexts/ProctoringContext';
import { ExamHeader } from './components/ExamHeader';
import VideoFeed from './components/VideoFeed';
import { ViolationsLog } from './components/ViolationsLog';
import { ExamControls } from './components/ExamControls';
import { useMediaStream } from './hooks/useMediaStream';
import './index.css';

const App: React.FC = () => {
  const {
    stream,
    cameraEnabled,
    micEnabled,
    startStream,
    stopStream,
    startCamera,
    stopCamera,
    startMic,
    stopMic,
    videoRef
  } = useMediaStream();

  // Start the media stream when the app loads
  React.useEffect(() => {
    startStream();
  }, []);

  const handleToggleCamera = async (enabled: boolean) => {
    try {
      if (enabled) {
        await startCamera();
      } else {
        stopCamera();
      }
      console.log('Camera toggled:', enabled);
    } catch (error) {
      console.error('Error toggling camera:', error);
      alert('Failed to access camera. Please check permissions.');
    }
  };

  const handleToggleMic = async (enabled: boolean) => {
    try {
      if (enabled) {
        await startMic();
      } else {
        stopMic();
      }
      console.log('Mic toggled:', enabled);
    } catch (error) {
      console.error('Error toggling microphone:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const handleViolation = (violation: any) => {
    console.log('Violation detected:', violation);
    // The violation will be handled by the proctoring context
  };

  return (
    <ThemeProvider>
      <ProctoringProvider>
        <div className="min-h-screen bg-wood-background dark:bg-wood-background-dark text-wood-text">
          {/* Top header with exam metadata and theme toggle */}
          <header className="max-w-7xl mx-auto px-4 py-4">
            <ExamHeader />
          </header>

          {/* Main content layout */}
          <main className="max-w-7xl mx-auto px-4 pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main video area + controls (left / main) */}
              <section className="lg:col-span-2 space-y-4">
                <div className="rounded-xl shadow-sm overflow-hidden bg-wood-surface dark:bg-wood-surface-dark border border-wood-border dark:border-wood-border-dark">
                  <VideoFeed
                    ref={videoRef}
                    cameraEnabled={cameraEnabled}
                    micEnabled={micEnabled}
                    mediaStream={stream}
                    onViolation={handleViolation}
                  />
                </div>

                <div>
                  <ExamControls
                    onToggleCamera={handleToggleCamera}
                    onToggleMic={handleToggleMic}
                    mediaStream={stream}
                  />
                </div>
              </section>

              {/* Violations & info pane (right) */}
              <aside className="space-y-4">
                <div className="rounded-xl shadow-sm overflow-hidden bg-wood-surface dark:bg-wood-surface-dark border border-wood-border dark:border-wood-border-dark h-full">
                  <ViolationsLog />
                </div>
              </aside>
            </div>
          </main>
        </div>
      </ProctoringProvider>
    </ThemeProvider>
  );
};

export default App;
