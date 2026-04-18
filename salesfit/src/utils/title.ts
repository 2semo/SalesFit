const TITLE_MAP: Record<string, string> = {
  김일국: '점장님',
  윤현석: '부점장님',
};

export function getTitle(name: string): string {
  return TITLE_MAP[name] ?? '매니저님';
}
