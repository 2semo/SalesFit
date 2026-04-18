import { supabase } from '../lib/supabase';
import type { Consultation, ConsultationStatus, ReviewReport, StoredConsultation } from '../types';

class StorageService {
  async saveConsultation(consultation: Consultation): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error('StorageService: saveConsultation - no authenticated user');
        return;
      }

      const report = consultation.report;
      const endedAt = consultation.endedAt ?? Date.now();
      const overallScore = report
        ? Math.round(
            (report.customerNeedsScore + report.productExplanationScore + report.closingTimingScore) / 3,
          )
        : 0;
      const durationMs = endedAt - consultation.startedAt;

      const { error: consultationError } = await supabase.from('consultations').upsert({
        id: consultation.id,
        user_id: user.id,
        started_at: new Date(consultation.startedAt).toISOString(),
        ended_at: new Date(endedAt).toISOString(),
        status: consultation.status,
        duration_ms: durationMs,
        overall_score: overallScore,
      });

      if (consultationError) {
        console.error(
          'StorageService: saveConsultation - consultations upsert error',
          consultationError,
        );
        return;
      }

      if (report) {
        await supabase.from('consultation_reports').delete().eq('consultation_id', consultation.id);

        const { error: reportError } = await supabase.from('consultation_reports').insert({
          consultation_id: consultation.id,
          user_id: user.id,
          customer_needs_score: report.customerNeedsScore,
          customer_needs_analysis: report.customerNeedsAnalysis,
          recommended_scripts: report.recommendedScripts,
          product_explanation_score: report.productExplanationScore,
          product_explanation_feedback: report.productExplanationFeedback,
          closing_timing_score: report.closingTimingScore,
          closing_timing_feedback: report.closingTimingFeedback,
          improvement_points: report.improvementPoints,
          suggestions: report.suggestions,
          generated_at: new Date(report.generatedAt).toISOString(),
          total_duration_ms: report.totalDurationMs,
        });

        if (reportError) {
          console.error('StorageService: saveConsultation - reports insert error', reportError);
        }
      }
    } catch (error) {
      console.error('StorageService: saveConsultation error', error);
    }
  }

  async getConsultations(): Promise<StoredConsultation[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

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
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('StorageService: getConsultations error', error);
        return [];
      }

      return (data ?? []).map((row) => {
        const reports = row.consultation_reports as Array<{ customer_needs_analysis: string }> | null;
        const firstReport = Array.isArray(reports) ? reports[0] : null;
        return {
          id: row.id as string,
          startedAt: new Date(row.started_at as string).getTime(),
          endedAt: row.ended_at ? new Date(row.ended_at as string).getTime() : 0,
          durationMs: (row.duration_ms ?? 0) as number,
          overallScore: (row.overall_score ?? 0) as number,
          reportSummary: (firstReport?.customer_needs_analysis ?? '') as string,
          hasReport: firstReport != null,
        };
      });
    } catch (error) {
      console.error('StorageService: getConsultations error', error);
      return [];
    }
  }

  async getConsultationById(id: string): Promise<Consultation | null> {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select(
          `
          id,
          started_at,
          ended_at,
          status,
          consultation_reports (
            customer_needs_score,
            customer_needs_analysis,
            recommended_scripts,
            product_explanation_score,
            product_explanation_feedback,
            closing_timing_score,
            closing_timing_feedback,
            improvement_points,
            suggestions,
            generated_at,
            total_duration_ms
          )
        `,
        )
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      const reports = data.consultation_reports as Array<Record<string, unknown>> | null;
      const reportRow = Array.isArray(reports) ? reports[0] : null;

      const reviewReport: ReviewReport | undefined = reportRow
        ? {
            consultationId: id,
            customerNeedsScore: reportRow.customer_needs_score as number,
            customerNeedsAnalysis: reportRow.customer_needs_analysis as string,
            recommendedScripts: reportRow.recommended_scripts as string[],
            productExplanationScore: reportRow.product_explanation_score as number,
            productExplanationFeedback: reportRow.product_explanation_feedback as string,
            closingTimingScore: reportRow.closing_timing_score as number,
            closingTimingFeedback: reportRow.closing_timing_feedback as string,
            improvementPoints: reportRow.improvement_points as string[],
            suggestions: reportRow.suggestions as string[],
            generatedAt: new Date(reportRow.generated_at as string).getTime(),
            totalDurationMs: reportRow.total_duration_ms as number,
          }
        : undefined;

      return {
        id: data.id as string,
        startedAt: new Date(data.started_at as string).getTime(),
        endedAt: data.ended_at ? new Date(data.ended_at as string).getTime() : undefined,
        status: data.status as ConsultationStatus,
        transcript: [],
        coachingMessages: [],
        report: reviewReport,
      };
    } catch (error) {
      console.error('StorageService: getConsultationById error', error);
      return null;
    }
  }

  async deleteConsultation(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('consultations').delete().eq('id', id);

      if (error) {
        console.error('StorageService: deleteConsultation error', error);
      }
    } catch (error) {
      console.error('StorageService: deleteConsultation error', error);
    }
  }
}

export const storageService = new StorageService();
