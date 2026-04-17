import { supabase } from '../lib/supabase';
import type { ReviewReport, StoredConsultation } from '../types';

export interface ConsultantSummary {
  userId: string;
  name: string;
  email: string;
  totalConsultations: number;
  avgScore: number;
  avgNeedsScore: number;
  avgProductScore: number;
  avgClosingScore: number;
  lastConsultationAt: string | null;
}

async function getConsultantSummaries(): Promise<ConsultantSummary[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        `
        id,
        name,
        email,
        consultations (
          overall_score,
          started_at,
          consultation_reports (
            customer_needs_score,
            product_explanation_score,
            closing_timing_score
          )
        )
      `,
      )
      .eq('role', 'consultant');

    if (error) {
      console.error('adminService: getConsultantSummaries error', error);
      return [];
    }

    return (data ?? []).map((profile) => {
      const consultations = (profile.consultations as Array<Record<string, unknown>>) ?? [];
      const totalConsultations = consultations.length;

      let sumScore = 0;
      let sumNeeds = 0;
      let sumProduct = 0;
      let sumClosing = 0;
      let reportCount = 0;

      for (const c of consultations) {
        sumScore += (c.overall_score as number) ?? 0;
        const reports = (c.consultation_reports as Array<Record<string, unknown>>) ?? [];
        if (reports.length > 0) {
          const r = reports[0];
          sumNeeds += (r.customer_needs_score as number) ?? 0;
          sumProduct += (r.product_explanation_score as number) ?? 0;
          sumClosing += (r.closing_timing_score as number) ?? 0;
          reportCount++;
        }
      }

      const startedAts = consultations
        .map((c) => c.started_at as string)
        .filter(Boolean)
        .sort()
        .reverse();

      return {
        userId: profile.id as string,
        name: profile.name as string,
        email: profile.email as string,
        totalConsultations,
        avgScore: totalConsultations > 0 ? Math.round(sumScore / totalConsultations) : 0,
        avgNeedsScore: reportCount > 0 ? Math.round(sumNeeds / reportCount) : 0,
        avgProductScore: reportCount > 0 ? Math.round(sumProduct / reportCount) : 0,
        avgClosingScore: reportCount > 0 ? Math.round(sumClosing / reportCount) : 0,
        lastConsultationAt: startedAts[0] ?? null,
      };
    });
  } catch (error) {
    console.error('adminService: getConsultantSummaries error', error);
    return [];
  }
}

async function getConsultationsByUser(userId: string): Promise<StoredConsultation[]> {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select(
        `
        id,
        started_at,
        ended_at,
        duration_ms,
        overall_score,
        consultation_reports (
          customer_needs_analysis
        )
      `,
      )
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('adminService: getConsultationsByUser error', error);
      return [];
    }

    return (data ?? []).map((row) => {
      const reports = (row.consultation_reports as Array<{ customer_needs_analysis: string }>) ?? [];
      return {
        id: row.id as string,
        startedAt: new Date(row.started_at as string).getTime(),
        endedAt: row.ended_at ? new Date(row.ended_at as string).getTime() : 0,
        durationMs: (row.duration_ms as number) ?? 0,
        overallScore: (row.overall_score as number) ?? 0,
        reportSummary: reports[0]?.customer_needs_analysis ?? '',
        hasReport: reports.length > 0,
      };
    });
  } catch (error) {
    console.error('adminService: getConsultationsByUser error', error);
    return [];
  }
}

async function getReportDetail(consultationId: string): Promise<ReviewReport | null> {
  try {
    const { data, error } = await supabase
      .from('consultation_reports')
      .select('*')
      .eq('consultation_id', consultationId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      consultationId,
      customerNeedsScore: (data.customer_needs_score as number) ?? 0,
      customerNeedsAnalysis: (data.customer_needs_analysis as string) ?? '',
      recommendedScripts: (data.recommended_scripts as string[]) ?? [],
      productExplanationScore: (data.product_explanation_score as number) ?? 0,
      productExplanationFeedback: (data.product_explanation_feedback as string) ?? '',
      closingTimingScore: (data.closing_timing_score as number) ?? 0,
      closingTimingFeedback: (data.closing_timing_feedback as string) ?? '',
      improvementPoints: (data.improvement_points as string[]) ?? [],
      suggestions: (data.suggestions as string[]) ?? [],
      generatedAt: new Date(data.generated_at as string).getTime(),
      totalDurationMs: (data.total_duration_ms as number) ?? 0,
    };
  } catch (error) {
    console.error('adminService: getReportDetail error', error);
    return null;
  }
}

export const adminService = { getConsultantSummaries, getConsultationsByUser, getReportDetail };
