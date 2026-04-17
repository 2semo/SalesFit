import { useCallback, useEffect, useReducer, useRef } from 'react';

import { audioService } from '../services/audioService';
import { geminiService } from '../services/geminiService';
import type { CoachingMessage, Consultation, TranscriptSegment } from '../types';

export interface ConsultationState {
  isRecording: boolean;
  isProcessing: boolean;
  consultation: Consultation | null;
  elapsedMs: number;
  error: string | null;
}

export type ConsultationAction =
  | { type: 'START_RECORDING'; payload: Consultation }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'ADD_TRANSCRIPT'; payload: TranscriptSegment }
  | { type: 'ADD_COACHING'; payload: CoachingMessage[] }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'UPDATE_ELAPSED'; payload: number }
  | { type: 'COMPLETE_CONSULTATION'; payload: number };

export function consultationReducer(
  state: ConsultationState,
  action: ConsultationAction,
): ConsultationState {
  switch (action.type) {
    case 'START_RECORDING':
      return {
        ...state,
        isRecording: true,
        isProcessing: false,
        consultation: action.payload,
        elapsedMs: 0,
        error: null,
      };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'ADD_TRANSCRIPT':
      if (!state.consultation) return state;
      return {
        ...state,
        consultation: {
          ...state.consultation,
          transcript: [...state.consultation.transcript, action.payload],
        },
      };
    case 'ADD_COACHING':
      if (!state.consultation) return state;
      return {
        ...state,
        consultation: {
          ...state.consultation,
          coachingMessages: [...state.consultation.coachingMessages, ...action.payload],
        },
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isRecording: false, isProcessing: false };
    case 'UPDATE_ELAPSED':
      return { ...state, elapsedMs: action.payload };
    case 'COMPLETE_CONSULTATION':
      if (!state.consultation) return state;
      return {
        ...state,
        isRecording: false,
        consultation: {
          ...state.consultation,
          status: 'completed',
          endedAt: action.payload,
        },
      };
    default:
      return state;
  }
}

const initialState: ConsultationState = {
  isRecording: false,
  isProcessing: false,
  consultation: null,
  elapsedMs: 0,
  error: null,
};

interface ConsultationActions {
  startConsultation: () => Promise<void>;
  stopConsultation: () => Promise<Consultation>;
}

export function useConsultation(): ConsultationState & ConsultationActions {
  const [state, dispatch] = useReducer(consultationReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
      if (stateRef.current.isRecording) {
        void audioService.stopRecording();
      }
    };
  }, []);

  const startConsultation = useCallback(async () => {
    const hasPermission = await audioService.requestPermissions();
    if (!hasPermission) {
      dispatch({ type: 'SET_ERROR', payload: '마이크 권한이 필요합니다.' });
      return;
    }

    const consultation: Consultation = {
      id: `consultation-${Date.now()}`,
      startedAt: Date.now(),
      status: 'recording',
      transcript: [],
      coachingMessages: [],
    };

    dispatch({ type: 'START_RECORDING', payload: consultation });
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        dispatch({ type: 'UPDATE_ELAPSED', payload: Date.now() - startTimeRef.current });
      }
    }, 1000);

    await audioService.startRecording(async (chunkBase64: string, chunkIndex: number) => {
      dispatch({ type: 'SET_PROCESSING', payload: true });
      try {
        const segment = await geminiService.transcribeAudio(chunkBase64, chunkIndex);
        dispatch({ type: 'ADD_TRANSCRIPT', payload: segment });

        if (segment.text.trim()) {
          const tips = await geminiService.getCoachingTips(segment.text);
          if (tips.length > 0) {
            dispatch({ type: 'ADD_COACHING', payload: tips });
          }
        }
      } finally {
        dispatch({ type: 'SET_PROCESSING', payload: false });
      }
    });
  }, []);

  const stopConsultation = useCallback(async (): Promise<Consultation> => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    await audioService.stopRecording();

    const endedAt = Date.now();
    const currentConsultation = stateRef.current.consultation;

    if (!currentConsultation) {
      throw new Error('No active consultation');
    }

    const completedConsultation: Consultation = {
      ...currentConsultation,
      status: 'completed',
      endedAt,
    };

    dispatch({ type: 'COMPLETE_CONSULTATION', payload: endedAt });

    return completedConsultation;
  }, []);

  return {
    ...state,
    startConsultation,
    stopConsultation,
  };
}
