import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuditRules } from '@/types/audit';
import { defaultRules } from '@/lib/audit-rules';

// Define ML Parameters interface
interface MLParameters {
  contamination: number;
  n_neighbors: number;
  anomaly_threshold: number;
}

// Import existing UploadData type
import { type UploadData } from '@/lib/data-processor';

// Define extended Upload Data interface for session
interface SessionUploadData extends UploadData {
  uploadedAt?: string;
  fileName?: string;
}

// Define Session State interface
interface SessionState {
  // Step 1: Data Upload
  uploadData: SessionUploadData | null;
  
  // Step 2: Data Exploration  
  explorationFilters: {
    searchTerm: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  
  // Step 3: Audit Rules
  auditRules: AuditRules;
  
  // Step 4: ML Analysis
  mlParameters: MLParameters;
  
  // Navigation state
  currentStep: number;
  completedSteps: Set<number>;
}

// Define Context interface
interface SessionContextType {
  session: SessionState;
  updateUploadData: (data: SessionUploadData) => void;
  updateExplorationFilters: (filters: Partial<SessionState['explorationFilters']>) => void;
  updateAuditRules: (rules: AuditRules) => void;
  updateMLParameters: (parameters: MLParameters) => void;
  setCurrentStep: (step: number) => void;
  markStepCompleted: (step: number) => void;
  resetSession: () => void;
}

// Default session state
const defaultSessionState: SessionState = {
  uploadData: null,
  explorationFilters: {
    searchTerm: '',
    sortBy: 'corpName',
    sortOrder: 'asc'
  },
  auditRules: defaultRules,
  mlParameters: {
    contamination: 0.1,
    n_neighbors: 20,
    anomaly_threshold: 0.5
  },
  currentStep: 1,
  completedSteps: new Set()
};

// Create context
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Session storage key
const SESSION_STORAGE_KEY = 'audit_session_state';

// Provider component
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(() => {
    // Initialize from localStorage on first render
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsedSession = JSON.parse(stored);
        // Convert completedSteps array back to Set
        if (parsedSession.completedSteps) {
          parsedSession.completedSteps = new Set(parsedSession.completedSteps);
        }
        return parsedSession;
      }
    } catch (error) {
      console.warn('Failed to load session from localStorage:', error);
    }
    return defaultSessionState;
  });

  // Save session to localStorage whenever it changes
  useEffect(() => {
    try {
      const sessionToStore = {
        ...session,
        // Convert Set to array for JSON serialization
        completedSteps: Array.from(session.completedSteps)
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionToStore));
    } catch (error) {
      console.warn('Failed to save session to localStorage:', error);
    }
  }, [session]);

  // Update functions
  const updateUploadData = (data: SessionUploadData) => {
    setSession(prev => ({
      ...prev,
      uploadData: data
    }));
  };

  const updateExplorationFilters = (filters: Partial<SessionState['explorationFilters']>) => {
    setSession(prev => ({
      ...prev,
      explorationFilters: {
        ...prev.explorationFilters,
        ...filters
      }
    }));
  };

  const updateAuditRules = (rules: AuditRules) => {
    setSession(prev => ({
      ...prev,
      auditRules: rules
    }));
  };

  const updateMLParameters = (parameters: MLParameters) => {
    setSession(prev => ({
      ...prev,
      mlParameters: parameters
    }));
  };

  const setCurrentStep = (step: number) => {
    setSession(prev => ({
      ...prev,
      currentStep: step
    }));
  };

  const markStepCompleted = (step: number) => {
    setSession(prev => {
      const newCompleted = new Set(prev.completedSteps);
      newCompleted.add(step);
      return {
        ...prev,
        completedSteps: newCompleted
      };
    });
  };

  const resetSession = () => {
    setSession(defaultSessionState);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const contextValue: SessionContextType = {
    session,
    updateUploadData,
    updateExplorationFilters,
    updateAuditRules,
    updateMLParameters,
    setCurrentStep,
    markStepCompleted,
    resetSession
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

// Custom hook to use session context
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

// Export types for use in other components
export type { SessionState, MLParameters, UploadData };