// src/components/ProctoringManager.tsx
import React, { useRef, useState, useEffect } from "react";
import { useRealFaceDetection } from "../hooks/useRealFaceDetection";
import { useRealAudioMonitoring } from "../hooks/useRealAudioMonitoring";
import VideoFeed from "./VideoFeed";
import { ExamControls as ImportedExamControls } from "./ExamControls";
import { analyzeViolations } from "../agent/analyzeViolations";

type Severity = "WARNING" | "MAJOR" | "CRITICAL";
type Violation = {
  time: string;
  type: string;
  severity: Severity;
  detail?: string;
};

const AGENT_COOLDOWN_MS = 30_000; // don't call agent more often than this
const WINDOW_MS = 5 * 60_000; // 5 minute window for counting recent violations

export default function ProctoringManager() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [agentDecision, setAgentDecision] = useState<string | null>(null);
  const [agentReason, setAgentReason] = useState<string | null>(null);
  const [examEnded, setExamEnded] = useState(false);
  const [warningBanner, setWarningBanner] = useState<string | null>(null);

  const lastAgentCallRef = useRef<number>(0);

  // attach real detectors
  useEffect(() => {
    if (!cameraOn) return;
    // Start face detection only when camera is on
    const cleanup = useRealFaceDetection(videoRef, (v: Violation) => {
      setViolations((prev) => [...prev, v]);
    }, cameraOn) as (() => void) | undefined;
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [cameraOn, videoRef]);

  useRealAudioMonitoring((v: Violation) => {
    setViolations((prev) => [...prev, v]);
  });

  // utility: get count of a severity in the past N ms
  const countRecent = (sev: Severity, windowMs = WINDOW_MS) => {
    const cutoff = Date.now() - windowMs;
    return violations.filter((v) => new Date(v.time).getTime() >= cutoff && v.severity === sev).length;
  };

  // call agent once thresholds met and not in cooldown
  useEffect(() => {
    if (examEnded) return;

    const now = Date.now();
    if (now - lastAgentCallRef.current < AGENT_COOLDOWN_MS) return;

    // Threshold rules (adjustable):
    // - any CRITICAL violation triggers immediate agent review
    // - 3+ MAJOR within WINDOW_MS triggers agent review
    // - 5+ WARNING within WINDOW_MS triggers agent review
    const crits = countRecent("CRITICAL");
    const majors = countRecent("MAJOR");
    const warns = countRecent("WARNING");

    const shouldCall =
      crits >= 1 || majors >= 3 || warns >= 5;

    if (!shouldCall) return;

    // prepare a focused window of data to send
    const cutoff = Date.now() - WINDOW_MS;
    const recent = violations.filter((v) => new Date(v.time).getTime() >= cutoff);

    // mark last call time
    lastAgentCallRef.current = now;

    (async () => {
      try {
        const res = await analyzeViolations(recent);
        // res is { decision, reason?, raw }
        const decision = (res as any)?.decision ?? "IGNORE";
        const reason = (res as any)?.reason ?? (res as any)?.raw ?? "";

        setAgentDecision(decision);
        setAgentReason(reason);

        // log agent decision as a system-level violation entry
        setViolations((prev) => [
          ...prev,
          {
            time: new Date().toISOString(),
            type: `AGENT_DECISION:${decision}`,
            severity: decision === "END_EXAM" ? "CRITICAL" : "MAJOR",
            detail: reason,
          },
        ]);

        if (decision === "END_EXAM") {
          setExamEnded(true);
        } else if (decision === "FLASH_WARNING") {
          setWarningBanner(reason || "Major rule violation detected");
          // auto-clear banner after 6s
          setTimeout(() => setWarningBanner(null), 6000);
        } else {
          // IGNORE: do nothing
        }
      } catch (err) {
        console.error("analyzeViolations failed:", err);
      }
    })();
  }, [violations, examEnded]);

  if (examEnded) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-800 text-white">
        <div>
          <h1 className="text-2xl font-bold mb-4">Exam Terminated</h1>
          <p>Session ended by proctoring agent due to policy violations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {/* top controls */}
      <div className="mb-4">
        <ImportedExamControls
          onToggleCamera={(on) => setCameraOn(on)}
          onToggleMic={(on) => setMicOn(on)}
        />
      </div>

      {warningBanner && (
        <div className="mb-4 rounded-md bg-yellow-400 text-black px-4 py-2 text-center font-semibold shadow">
          {warningBanner}
        </div>
      )}

      {agentDecision && (
        <div className="mb-3 rounded-md bg-red-600 text-white px-3 py-2 text-center font-bold">
          Agent decision: {agentDecision} {agentReason ? ` — ${agentReason}` : ""}
        </div>
      )}

      <VideoFeed
        ref={videoRef}
        cameraEnabled={cameraOn}
        micEnabled={micOn}
        violations={violations}
      />

      {/* Violations log */}
      <div className="mt-6 max-h-48 overflow-auto bg-gray-50 p-3 rounded">
        <h3 className="font-semibold mb-2">Violations ({violations.length})</h3>
        <ul className="text-sm">
          {violations.map((v, i) => (
            <li key={i}>
              <strong>{new Date(v.time).toLocaleTimeString()}</strong> — {v.type} <em>({v.severity})</em>
              {v.detail ? <> — {v.detail}</> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type ExamControlsProps = {
  onToggleCamera: (on: boolean) => void;
  onToggleMic: (on: boolean) => void;
};

export function ExamControls({ onToggleCamera, onToggleMic }: ExamControlsProps) {
  return (
    <div className="flex gap-2">
      <button onClick={() => onToggleCamera(true)} className="btn btn-primary">
        Turn Camera On
      </button>
      <button onClick={() => onToggleCamera(false)} className="btn btn-secondary">
        Turn Camera Off
      </button>
      <button onClick={() => onToggleMic(true)} className="btn btn-primary">
        Turn Mic On
      </button>
      <button onClick={() => onToggleMic(false)} className="btn btn-secondary">
        Turn Mic Off
      </button>
    </div>
  );
}


