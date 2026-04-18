import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

function Step({ num, text }: { num: number; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepNum}>{num}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function Tag({ color, label }: { color: string; label: string }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

function Row({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function QA({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity style={styles.qa} onPress={() => setOpen(!open)} activeOpacity={0.75}>
      <View style={styles.qaHeader}>
        <Text style={styles.qaQ}>Q. {q}</Text>
        <Text style={styles.qaChevron}>{open ? '▲' : '▼'}</Text>
      </View>
      {open && <Text style={styles.qaA}>A. {a}</Text>}
    </TouchableOpacity>
  );
}

export function HelpScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>사용 가이드</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Lotte Himart SalesFit</Text>
          <Text style={styles.heroSub}>AI 영업 코치 사용 가이드</Text>
        </View>

        <SectionBlock title="1. 로그인">
          <Step num={1} text="앱 접속 시 로그인 화면이 나타납니다." />
          <Step num={2} text="사번 7자리를 입력합니다. (예: 4020895)" />
          <Step num={3} text="로그인 버튼을 누릅니다." />
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>💡 비밀번호는 사번과 동일합니다.</Text>
          </View>
        </SectionBlock>

        <SectionBlock title="2. 상담 시작">
          <Step num={1} text="홈 화면에서 '상담 시작하기' 버튼을 누릅니다." />
          <Step num={2} text="마이크 권한 허용을 선택합니다." />
          <Step num={3} text="상담이 자동으로 녹음됩니다. 🔴 녹음 중 표시 확인." />
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>💡 고객과 대화를 시작하면 앱이 자동으로 분석합니다.</Text>
          </View>
        </SectionBlock>

        <SectionBlock title="3. 상담 중 화면">
          <Text style={styles.subLabel}>📝 실시간 대화 변환</Text>
          <Text style={styles.bodyText}>상담 내용이 텍스트로 자동 변환되어 상단에 표시됩니다.</Text>

          <Text style={[styles.subLabel, { marginTop: 12 }]}>💡 AI 코칭 카드</Text>
          <Row icon="🔵" title="고객 니즈 파악" desc="고객의 필요를 파악하는 팁" />
          <Row icon="🟢" title="제품 설명" desc="제품 특장점 설명 방법" />
          <Row icon="🟠" title="클로징" desc="구매 결정 유도 타이밍" />
          <Row icon="🟡" title="개선 사항" desc="더 나은 상담을 위한 조언" />
          <Row icon="⭐" title="모델 추천 (보라색)" desc="고객 관심사에 맞는 중점모델·가격·혜택 자동 추천" />

          <Text style={[styles.subLabel, { marginTop: 12 }]}>💬 AI 대화 버튼</Text>
          <Text style={styles.bodyText}>상담 중 궁금한 점을 AI 코치에게 바로 질문할 수 있습니다.</Text>
          <View style={styles.exampleBox}>
            <Text style={styles.exampleText}>"이 고객에게 어떤 TV를 추천할까요?"</Text>
            <Text style={styles.exampleText}>"지금 클로징 멘트를 어떻게 하면 좋을까요?"</Text>
            <Text style={styles.exampleText}>"고객이 가격을 부담스러워하는데 어떻게 대응할까요?"</Text>
          </View>
        </SectionBlock>

        <SectionBlock title="4. 복기 리포트">
          <Step num={1} text="'상담 종료' 버튼을 누릅니다." />
          <Step num={2} text="AI가 전체 상담을 분석합니다. (10~20초)" />
          <Step num={3} text="4가지 항목의 점수와 피드백을 확인합니다." />

          <View style={styles.scoreGuide}>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreDot, { color: '#22c55e' }]}>●</Text>
              <Text style={styles.scoreLabel}>80점 이상 — 우수</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreDot, { color: '#f97316' }]}>●</Text>
              <Text style={styles.scoreLabel}>60~79점 — 보통</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreDot, { color: '#ef4444' }]}>●</Text>
              <Text style={styles.scoreLabel}>60점 미만 — 개선 필요</Text>
            </View>
          </View>

          <Text style={[styles.subLabel, { marginTop: 12 }]}>💬 리포트에서 AI와 대화</Text>
          <Text style={styles.bodyText}>우하단 파란 💬 버튼으로 리포트 내용을 바탕으로 AI와 심층 토론할 수 있습니다.</Text>
          <View style={styles.exampleBox}>
            <Text style={styles.exampleText}>"오늘 상담에서 가장 아쉬운 부분이 뭐였나요?"</Text>
            <Text style={styles.exampleText}>"다음에 비슷한 고객을 만나면 어떻게 접근할까요?"</Text>
          </View>
        </SectionBlock>

        <SectionBlock title="❓ 자주 묻는 질문">
          <QA
            q="로그인이 안 돼요."
            a="사번 7자리를 정확히 입력했는지 확인해 주세요. 문제가 지속되면 관리자에게 문의하세요."
          />
          <QA
            q="대화 내용이 화면에 안 나와요."
            a="마이크 권한이 허용되어 있는지 확인해 주세요. 브라우저 주소창 왼쪽 🔒 아이콘 → 마이크 → 허용"
          />
          <QA
            q="AI 코칭 카드가 안 나와요."
            a="대화량이 충분해야 분석이 시작됩니다. 15~30초 분량의 대화 후 자동으로 표시됩니다."
          />
          <QA
            q="리포트 생성이 너무 오래 걸려요."
            a="상담 시간이 길수록 분석 시간이 늘어납니다. 최대 30초 정도 기다려 주세요."
          />
        </SectionBlock>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  backText: { color: '#4A9EFF', fontSize: 15, width: 48 },
  headerTitle: { color: '#E5E7EB', fontSize: 16, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  hero: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  heroTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  heroSub: { color: '#6B7280', fontSize: 13, marginTop: 4 },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: { color: '#E5E7EB', fontSize: 15, fontWeight: '600' },
  chevron: { color: '#6B7280', fontSize: 11 },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  stepBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#4A9EFF', alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  stepNum: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, color: '#D1D5DB', fontSize: 14, lineHeight: 20 },
  infoBox: {
    backgroundColor: '#1E293B', borderRadius: 8,
    padding: 10, marginTop: 4,
  },
  infoText: { color: '#93C5FD', fontSize: 13 },
  subLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  bodyText: { color: '#D1D5DB', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  rowIcon: { fontSize: 16, marginTop: 1 },
  rowContent: { flex: 1 },
  rowTitle: { color: '#E5E7EB', fontSize: 13, fontWeight: '600' },
  rowDesc: { color: '#9CA3AF', fontSize: 12, marginTop: 1 },
  exampleBox: {
    backgroundColor: '#1E1E1E', borderRadius: 8,
    padding: 10, gap: 4,
  },
  exampleText: { color: '#9CA3AF', fontSize: 12, fontStyle: 'italic' },
  scoreGuide: { marginTop: 8, gap: 4 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreDot: { fontSize: 16 },
  scoreLabel: { color: '#D1D5DB', fontSize: 13 },
  tag: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 4 },
  tagText: { fontSize: 11, fontWeight: '600' },
  qa: {
    backgroundColor: '#1E1E1E', borderRadius: 10,
    padding: 12, marginBottom: 8,
  },
  qaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qaQ: { color: '#E5E7EB', fontSize: 13, fontWeight: '500', flex: 1 },
  qaChevron: { color: '#6B7280', fontSize: 10, marginLeft: 8 },
  qaA: { color: '#9CA3AF', fontSize: 13, lineHeight: 18, marginTop: 8 },
});
