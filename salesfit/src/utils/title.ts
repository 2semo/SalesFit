const TITLE_MAP: Record<string, string> = {
  김일국: '점장님',
  윤현석: '부점장님',
};

export function getTitle(name: string): string {
  return TITLE_MAP[name] ?? '매니저님';
}

export interface CoachingLevel {
  label: string;
  emoji: string;
  color: string;
  message: string;
}

export function getCoachingLevel(score: number): CoachingLevel {
  if (score >= 80) return { label: '탁월해요', emoji: '✨', color: '#22c55e', message: '매우 훌륭한 상담이었어요!' };
  if (score >= 60) return { label: '잘하고 있어요', emoji: '👍', color: '#4A9EFF', message: '좋은 상담이었어요. 조금만 더 발전해봐요.' };
  if (score >= 40) return { label: '발전하고 있어요', emoji: '💪', color: '#f97316', message: '노력이 보여요. 피드백을 참고해 계속 성장해봐요.' };
  return { label: '함께 개선해봐요', emoji: '🎯', color: '#ef4444', message: '아래 코칭 내용을 참고해 다음 상담을 준비해봐요.' };
}
