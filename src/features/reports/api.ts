import { apiSlice } from '@/store/apiSlice';
import { endpoints } from '@/core/api/endpoints';
import type { Inquiry, InquirySummaryReport, Paginated, ReportFilters } from '@/lib/types';

export type DetailReportParams = ReportFilters & { q?: string; page?: number; pageSize?: number };

export const reportsApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    getInquirySummary: b.query<InquirySummaryReport, ReportFilters>({
      query: (params) => ({ url: endpoints.reports.inquirySummary, params: params as Record<string, unknown> }),
      providesTags: [{ type: 'Report', id: 'ALL' }],
    }),
    getInquiryDetailReport: b.query<Paginated<Inquiry>, DetailReportParams>({
      query: (params) => ({ url: endpoints.reports.inquiryDetail, params: params as Record<string, unknown> }),
      providesTags: [{ type: 'Report', id: 'ALL' }],
    }),
  }),
});
export const { useGetInquirySummaryQuery, useGetInquiryDetailReportQuery } = reportsApi;
