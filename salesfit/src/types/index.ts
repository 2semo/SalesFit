export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  chunkIndex: number;
}

export type CoachingType = 'needs' | 'product' | 'closing' | 'improvement' | 'recommend';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface CoachingMessage {
  id: string;
  type: CoachingType;
  title: string;
  message: string;
  suggestion: string;
  timestamp: number;
}

export interface ReviewReport {
  consultationId: string;
  customerNeedsScore: number;
  customerNeedsAnalysis: string;
  recommendedScripts: string[];
  productExplanationScore: number;
  productExplanationFeedback: string;
  closingTimingFeedback: string;
  closingTimingScore: number;
  improvementPoints: string[];
  suggestions: string[];
  generatedAt: number;
  totalDurationMs: number;
}

export type ConsultationStatus = 'recording' | 'processing' | 'completed' | 'error';

export interface Consultation {
  id: string;
  startedAt: number;
  endedAt?: number;
  status: ConsultationStatus;
  transcript: TranscriptSegment[];
  coachingMessages: CoachingMessage[];
  report?: ReviewReport;
}

export interface StoredConsultation {
  id: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  overallScore: number;
  reportSummary: string;
  hasReport: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'consultant' | 'admin';
  createdAt: string;
}
