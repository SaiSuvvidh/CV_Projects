import React from 'react';
import { AlertTriangle, Clock, Download, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProctoring } from '../contexts/ProctoringContext';
import { format } from 'date-fns';

export const ViolationsLog: React.FC = () => {
  const { violations, session, exportViolations } = useProctoring();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900';
      case 'MAJOR': return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900';
      case 'MINOR': return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900';
      default: return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '🚨';
      case 'MAJOR': return '⚠️';
      case 'MINOR': return '⚡';
      default: return '📝';
    }
  };

  return (
    <div className="bg-wood-surface dark:bg-wood-surface-dark rounded-lg border border-wood-border dark:border-wood-border-dark h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-wood-border dark:border-wood-border-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-wood-accent dark:text-wood-accent-dark" />
            <h3 className="font-semibold text-wood-text dark:text-wood-text-dark">Violations Log</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-wood-accent dark:bg-wood-accent-dark text-white text-xs px-2 py-1 rounded-full">
              {violations.length}
            </span>
            {violations.length > 0 && (
              <button
                onClick={exportViolations}
                className="p-1.5 hover:bg-wood-light dark:hover:bg-wood-dark rounded-md transition-colors"
                title="Export Violations"
              >
                <Download className="w-4 h-4 text-wood-text-secondary dark:text-wood-text-secondary-dark" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Violations list */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {violations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-wood-text-secondary dark:text-wood-text-secondary-dark">
                No violations detected
              </p>
              <p className="text-sm text-wood-text-secondary dark:text-wood-text-secondary-dark mt-1">
                Keep up the good work!
              </p>
            </div>
          ) : (
            <div className="p-2">
              {violations.map((violation, index) => (
                <motion.div
                  key={violation.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`mb-2 p-3 rounded-lg border ${getSeverityColor(violation.severity)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-lg">{getSeverityIcon(violation.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSeverityColor(violation.severity)}`}>
                          {violation.severity}
                        </span>
                        <div className="flex items-center space-x-1 text-xs text-wood-text-secondary dark:text-wood-text-secondary-dark">
                          <Clock className="w-3 h-3" />
                          <span>{format(violation.timestamp, 'HH:mm:ss')}</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-wood-text dark:text-wood-text-dark mb-1">
                        {violation.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-wood-text-secondary dark:text-wood-text-secondary-dark">
                          Confidence: {(violation.confidence * 100).toFixed(0)}%
                        </span>
                        <span className="text-xs text-wood-text-secondary dark:text-wood-text-secondary-dark">
                          {violation.type.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary */}
      {violations.length > 0 && (
        <div className="px-4 py-3 border-t border-wood-border dark:border-wood-border-dark bg-wood-light dark:bg-wood-dark">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {violations.filter(v => v.severity === 'CRITICAL').length}
              </div>
              <div className="text-xs text-wood-text-secondary dark:text-wood-text-secondary-dark">Critical</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {violations.filter(v => v.severity === 'MAJOR').length}
              </div>
              <div className="text-xs text-wood-text-secondary dark:text-wood-text-secondary-dark">Major</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {violations.filter(v => v.severity === 'MINOR').length}
              </div>
              <div className="text-xs text-wood-text-secondary dark:text-wood-text-secondary-dark">Minor</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};