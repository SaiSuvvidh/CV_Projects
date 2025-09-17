import React, { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react';
import { ExamSession, Violation, ViolationType, ViolationSeverity } from '../types/proctoring';
import { analyzeViolations } from '../agent/analyzeViolations';

interface ProctoringState {
  session: ExamSession | null;
  isRecording: boolean;
  violations: Violation[];
  currentViolation: Violation | null;
  warningDecision: "END_EXAM" | "FLASH_WARNING" | "IGNORE";
  warningReason?: string;
}

type ProctoringAction =
  | { type: 'START_SESSION'; payload: ExamSession }
  | { type: 'END_SESSION' }
  | { type: 'ADD_VIOLATION'; payload: Violation }
  | { type: 'CLEAR_CURRENT_VIOLATION' }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'SET_WARNING'; payload: { decision: "END_EXAM" | "FLASH_WARNING" | "IGNORE"; reason?: string } };

const initialState: ProctoringState = {
  session: null,
  isRecording: false,
  violations: [],
  currentViolation: null,
  warningDecision: "IGNORE",
  warningReason: undefined,
};

const proctoringReducer = (state: ProctoringState, action: ProctoringAction): ProctoringState => {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...state,
        session: { ...action.payload, status: 'IN_PROGRESS', startTime: new Date() },
        violations: [],
        warningDecision: "IGNORE",
        warningReason: undefined,
      };
    case 'END_SESSION':
      return {
        ...state,
        session: state.session ? { ...state.session, status: 'COMPLETED', endTime: new Date() } : null,
        isRecording: false,
        warningDecision: "IGNORE",
        warningReason: undefined,
      };
    case 'ADD_VIOLATION':
      return {
        ...state,
        violations: [...state.violations, action.payload],
        currentViolation: action.payload,
      };
    case 'CLEAR_CURRENT_VIOLATION':
      return {
        ...state,
        currentViolation: null,
      };
    case 'START_RECORDING':
      return {
        ...state,
        isRecording: true,
      };
    case 'STOP_RECORDING':
      return {
        ...state,
        isRecording: false,
      };
    case 'SET_WARNING':
      return {
        ...state,
        warningDecision: action.payload.decision,
        warningReason: action.payload.reason,
      };
    default:
      return state;
  }
};

interface ProctoringContextType extends ProctoringState {
  startSession: (examData: Omit<ExamSession, 'id' | 'violations' | 'status'>) => void;
  endSession: () => void;
  addViolation: (type: ViolationType, severity: ViolationSeverity, description: string, confidence?: number) => void;
  clearCurrentViolation: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  exportViolations: () => void;
  calculateProctoringScore: () => number;
}

const ProctoringContext = createContext<ProctoringContextType | undefined>(undefined);

export const useProctoring = () => {
  const context = useContext(ProctoringContext);
  if (!context) {
    throw new Error('useProctoring must be used within a ProctoringProvider');
  }
  return context;
};

export const ProctoringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(proctoringReducer, initialState);
  const [warningTimeoutId, setWarningTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const startSession = useCallback((examData: Omit<ExamSession, 'id' | 'violations' | 'status'>) => {
    const session: ExamSession = {
      ...examData,
      id: `exam_${Date.now()}`,
      violations: [],
      status: 'NOT_STARTED',
    };
    dispatch({ type: 'START_SESSION', payload: session });
  }, []);

  const endSession = useCallback(() => {
    dispatch({ type: 'END_SESSION' });
    if (warningTimeoutId) {
      clearTimeout(warningTimeoutId);
      setWarningTimeoutId(null);
    }
  }, [warningTimeoutId]);

  const addViolation = useCallback((type: ViolationType, severity: ViolationSeverity, description: string, confidence = 0.8) => {
    const violation: Violation = {
      id: `violation_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      type,
      severity,
      description,
      confidence,
    };
    dispatch({ type: 'ADD_VIOLATION', payload: violation });

    // Clear the current violation after 3 seconds
    setTimeout(() => {
      dispatch({ type: 'CLEAR_CURRENT_VIOLATION' });
    }, 3000);
  }, []);

  const clearCurrentViolation = useCallback(() => {
    dispatch({ type: 'CLEAR_CURRENT_VIOLATION' });
  }, []);

  const startRecording = useCallback(() => {
    dispatch({ type: 'START_RECORDING' });
  }, []);

  const stopRecording = useCallback(() => {
    dispatch({ type: 'STOP_RECORDING' });
  }, []);

  const exportViolations = useCallback(() => {
    if (!state.violations.length) return;

    // JSON export
    const jsonData = JSON.stringify({
      session: state.session,
      violations: state.violations,
      exportTime: new Date().toISOString(),
    }, null, 2);
    
    const jsonBlob = new Blob([jsonData], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `proctoring_report_${state.session?.id}.json`;
    jsonLink.click();

    // CSV export
    const csvHeaders = ['Timestamp', 'Type', 'Severity', 'Description', 'Confidence'];
    const csvRows = state.violations.map(v => [
      v.timestamp.toISOString(),
      v.type,
      v.severity,
      v.description,
      v.confidence.toString()
    ]);
    
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `proctoring_report_${state.session?.id}.csv`;
    csvLink.click();
  }, [state.violations, state.session]);

  const calculateProctoringScore = useCallback(() => {
    if (!state.violations.length) return 100;

    const totalDeductions = state.violations.reduce((total, violation) => {
      const deduction = violation.severity === 'CRITICAL' ? 15 : 
                      violation.severity === 'MAJOR' ? 8 : 3;
      return total + (deduction * violation.confidence);
    }, 0);

    return Math.max(0, 100 - totalDeductions);
  }, [state.violations]);

  // New effect to analyze violations and act on LLM decision
  useEffect(() => {
    if (!state.session || !state.session.status || state.session.status !== 'IN_PROGRESS') return;
    if (state.violations.length === 0) return;

    let isCancelled = false;

    async function analyzeAndAct() {
      const result = await analyzeViolations(state.violations);
      if (isCancelled) return;

      dispatch({ type: 'SET_WARNING', payload: { decision: result.decision, reason: result.reason } });

      if (result.decision === 'END_EXAM') {
        // End the exam session automatically after a short delay to allow UI update
        setTimeout(() => {
          dispatch({ type: 'END_SESSION' });
        }, 2000);
      } else if (result.decision === 'FLASH_WARNING') {
        // Optionally, implement flashing warning UI or notification here
        // For now, just keep the warning state set
      }
    }

    analyzeAndAct();

    return () => {
      isCancelled = true;
    };
  }, [state.violations]);

  return (
    <ProctoringContext.Provider value={{
      ...state,
      startSession,
      endSession,
      addViolation,
      clearCurrentViolation,
      startRecording,
      stopRecording,
      exportViolations,
      calculateProctoringScore,
    }}>
      {children}
    </ProctoringContext.Provider>
  );
};
