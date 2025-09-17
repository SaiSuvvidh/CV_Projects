export interface Violation {
  id: string;
  timestamp: Date;
  type: ViolationType;
  severity: ViolationSeverity;
  description: string;
  confidence: number;
}

export type ViolationType = 
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES'
  | 'FACE_TURNED_AWAY'
  | 'LEFT_FRAME'
  | 'SPEECH_DETECTED'
  | 'MULTIPLE_VOICES'
  | 'BACKGROUND_NOISE'
  | 'GAZE_OFF_SCREEN'
  | 'LIP_AUDIO_MISMATCH'
  | 'TAB_SWITCH'
  | 'BROWSER_WINDOW_OPENED'
  | 'COPY_PASTE_ATTEMPT'
  | 'LIGHTING_CHANGE'
  | 'OBJECT_DETECTED'
  | 'SUSPICIOUS_MOVEMENT';

export type ViolationSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL';

export interface ExamSession {
  id: string;
  examName: string;
  candidateId: string;
  startTime?: Date;
  endTime?: Date;
  duration: number; // in minutes
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'TERMINATED';
  violations: Violation[];
  proctoringScore?: number;
}

export interface AudioAnalysis {
  volume: number;
  frequency: number;
  speechActivity: boolean;
  voiceCount: number;
  whisperActivity?: boolean;
  backgroundNoise?: boolean;
}

export interface FaceAnalysis {
  faceDetected: boolean;
  faceCount: number;
  headPose: {
    yaw: number;
    pitch: number;
    roll: number;
  };
  gazeDirection: {
    x: number;
    y: number;
  };
  lipMovement: boolean;
  inFrame: boolean;
}