import { consultationReducer } from '../useConsultation';
import type { ConsultationState } from '../useConsultation';

const initialState: ConsultationState = {
  isRecording: false,
  isProcessing: false,
  consultation: null,
  elapsedMs: 0,
  error: null,
};

const makeConsultation = () => ({
  id: 'c-1',
  startedAt: 1000,
  status: 'recording' as const,
  transcript: [],
  coachingMessages: [],
});

describe('consultationReducer', () => {
  test('START_RECORDING sets isRecording, creates consultation, and clears error', () => {
    const consultation = makeConsultation();
    const stateWithError = { ...initialState, error: '이전 오류' };

    const state = consultationReducer(stateWithError, {
      type: 'START_RECORDING',
      payload: consultation,
    });

    expect(state.isRecording).toBe(true);
    expect(state.isProcessing).toBe(false);
    expect(state.consultation).toEqual(consultation);
    expect(state.elapsedMs).toBe(0);
    expect(state.error).toBe(null);
  });

  test('SET_PROCESSING updates isProcessing flag', () => {
    const stateTrue = consultationReducer(initialState, { type: 'SET_PROCESSING', payload: true });
    expect(stateTrue.isProcessing).toBe(true);

    const stateFalse = consultationReducer(stateTrue, { type: 'SET_PROCESSING', payload: false });
    expect(stateFalse.isProcessing).toBe(false);
  });

  test('ADD_TRANSCRIPT appends segment to consultation transcript', () => {
    const consultation = makeConsultation();
    const withConsultation = consultationReducer(initialState, {
      type: 'START_RECORDING',
      payload: consultation,
    });

    const segment = { id: 's-1', text: '안녕하세요', timestamp: 2000, chunkIndex: 0 };
    const state = consultationReducer(withConsultation, { type: 'ADD_TRANSCRIPT', payload: segment });

    expect(state.consultation!.transcript).toHaveLength(1);
    expect(state.consultation!.transcript[0]).toEqual(segment);
  });

  test('ADD_TRANSCRIPT accumulates multiple segments', () => {
    const consultation = makeConsultation();
    let state = consultationReducer(initialState, { type: 'START_RECORDING', payload: consultation });

    const seg1 = { id: 's-1', text: '첫 번째', timestamp: 1000, chunkIndex: 0 };
    const seg2 = { id: 's-2', text: '두 번째', timestamp: 2000, chunkIndex: 1 };

    state = consultationReducer(state, { type: 'ADD_TRANSCRIPT', payload: seg1 });
    state = consultationReducer(state, { type: 'ADD_TRANSCRIPT', payload: seg2 });

    expect(state.consultation!.transcript).toHaveLength(2);
    expect(state.consultation!.transcript[1].text).toBe('두 번째');
  });

  test('ADD_COACHING appends coaching messages', () => {
    const consultation = makeConsultation();
    const withConsultation = consultationReducer(initialState, {
      type: 'START_RECORDING',
      payload: consultation,
    });

    const messages = [
      {
        id: 'm-1',
        type: 'needs' as const,
        title: '니즈 파악',
        message: '고객 니즈를 확인하세요',
        suggestion: '어떤 제품 찾으세요?',
        timestamp: 2000,
      },
    ];
    const state = consultationReducer(withConsultation, { type: 'ADD_COACHING', payload: messages });

    expect(state.consultation!.coachingMessages).toHaveLength(1);
    expect(state.consultation!.coachingMessages[0].type).toBe('needs');
    expect(state.consultation!.coachingMessages[0].title).toBe('니즈 파악');
  });

  test('SET_ERROR sets error message and stops recording/processing', () => {
    const activeState: ConsultationState = {
      ...initialState,
      isRecording: true,
      isProcessing: true,
    };

    const state = consultationReducer(activeState, { type: 'SET_ERROR', payload: '권한 없음' });

    expect(state.error).toBe('권한 없음');
    expect(state.isRecording).toBe(false);
    expect(state.isProcessing).toBe(false);
  });

  test('UPDATE_ELAPSED updates elapsedMs', () => {
    const state = consultationReducer(initialState, { type: 'UPDATE_ELAPSED', payload: 5000 });
    expect(state.elapsedMs).toBe(5000);
  });

  test('COMPLETE_CONSULTATION sets status to completed with endedAt and stops recording', () => {
    const consultation = makeConsultation();
    const activeState = consultationReducer(
      { ...initialState, isRecording: true },
      { type: 'START_RECORDING', payload: consultation },
    );

    const state = consultationReducer(activeState, {
      type: 'COMPLETE_CONSULTATION',
      payload: 9000,
    });

    expect(state.isRecording).toBe(false);
    expect(state.consultation!.status).toBe('completed');
    expect(state.consultation!.endedAt).toBe(9000);
  });

  test('ADD_TRANSCRIPT is ignored when consultation is null', () => {
    const segment = { id: 's-1', text: '텍스트', timestamp: 1000, chunkIndex: 0 };
    const state = consultationReducer(initialState, { type: 'ADD_TRANSCRIPT', payload: segment });
    expect(state).toEqual(initialState);
  });

  test('ADD_COACHING is ignored when consultation is null', () => {
    const messages = [
      {
        id: 'm-1',
        type: 'product' as const,
        title: '제품 설명',
        message: '메시지',
        suggestion: '제안',
        timestamp: 1000,
      },
    ];
    const state = consultationReducer(initialState, { type: 'ADD_COACHING', payload: messages });
    expect(state).toEqual(initialState);
  });
});
