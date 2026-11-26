import { apiSlice } from '@/store/apiSlice';
import { endpoints } from '@/core/api/endpoints';
import type { Activity, Inquiry, InquiryCounts, InquiryInput, InquiryListParams, Method, MoveTo, Paginated, Priority, SaleInput, BulkAction, BulkResult } from '@/lib/types';

const touched = (id?: string) => [
  ...(id
    ? [
        { type: 'Inquiry' as const, id },
        { type: 'Activity' as const, id },
      ]
    : []),
  { type: 'Inquiry' as const, id: 'LIST' },
  { type: 'InquiryCounts' as const, id: 'ALL' },
  { type: 'Dashboard' as const, id: 'ALL' },
  { type: 'Report' as const, id: 'ALL' },
  { type: 'Notification' as const, id: 'ALL' },
  { type: 'Customer' as const, id: 'LIST' },
  { type: 'Sale' as const, id: 'LIST' },
];

export const inquiriesApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    getInquiries: b.query<Paginated<Inquiry>, InquiryListParams>({
      query: (params) => ({ url: endpoints.inquiries.list, params: params as Record<string, unknown> }),
      providesTags: (r) => [{ type: 'Inquiry', id: 'LIST' }, ...(r?.results ?? []).map((i) => ({ type: 'Inquiry' as const, id: i.id }))],
    }),
    getInquiryCounts: b.query<InquiryCounts, { rmId?: string } | void>({
      query: (params) => ({ url: endpoints.inquiries.counts, params: params ?? undefined }),
      providesTags: [{ type: 'InquiryCounts', id: 'ALL' }],
    }),
    getInquiry: b.query<Inquiry, string>({ query: (id) => ({ url: endpoints.inquiries.detail(id) }), providesTags: (_r, _e, id) => [{ type: 'Inquiry', id }] }),
    getActivities: b.query<Activity[], string>({ query: (id) => ({ url: endpoints.inquiries.activities(id) }), providesTags: (_r, _e, id) => [{ type: 'Activity', id }] }),

    createInquiry: b.mutation<Inquiry, InquiryInput>({ query: (data) => ({ url: endpoints.inquiries.list, method: 'POST', data }), invalidatesTags: () => touched() }),
    updateInquiry: b.mutation<Inquiry, { id: string; changes: Partial<InquiryInput> }>({
      query: ({ id, changes }) => ({ url: endpoints.inquiries.detail(id), method: 'PATCH', data: changes }),
      invalidatesTags: (_r, _e, { id }) => touched(id),
    }),
    assignInquiry: b.mutation<Inquiry, { id: string; rmId: string; priority: Priority }>({
      query: ({ id, ...data }) => ({ url: endpoints.inquiries.assign(id), method: 'POST', data }),
      invalidatesTags: (_r, _e, { id }) => touched(id),
    }),
    bulkInquiryAction: b.mutation<BulkResult, BulkAction>({
      query: (data) => ({ url: endpoints.inquiries.bulk, method: 'POST', data }),
      invalidatesTags: touched(),
    }),
    recordTouchbase: b.mutation<Inquiry, { id: string; method: Method; at?: string; notes?: string }>({
      query: ({ id, ...data }) => ({ url: endpoints.inquiries.touchbase(id), method: 'POST', data }),
      invalidatesTags: (_r, _e, { id }) => touched(id),
    }),
    recordInteraction: b.mutation<Inquiry, { id: string; method: Method; at?: string; nextFollowUp?: string; notes?: string; remark?: string; moveTo?: MoveTo; closedOn?: string }>(
      {
        query: ({ id, ...data }) => ({ url: endpoints.inquiries.interactions(id), method: 'POST', data }),
        invalidatesTags: (_r, _e, { id }) => touched(id),
      },
    ),
    snoozeInquiry: b.mutation<Inquiry, { id: string; nextFollowUp: string }>({
      query: ({ id, ...data }) => ({ url: endpoints.inquiries.snooze(id), method: 'POST', data }),
      invalidatesTags: (_r, _e, { id }) => touched(id),
    }),
    changeStatus: b.mutation<Inquiry, { id: string; status: MoveTo | 'Active Conversations'; remark?: string; nextFollowUp?: string }>({
      query: ({ id, ...data }) => ({ url: endpoints.inquiries.status(id), method: 'POST', data }),
      invalidatesTags: (_r, _e, { id }) => touched(id),
    }),
    markWon: b.mutation<Inquiry, { id: string; sale: SaleInput }>({
      query: ({ id, sale }) => ({ url: endpoints.inquiries.won(id), method: 'POST', data: sale }),
      invalidatesTags: (_r, _e, { id }) => [...touched(id), { type: 'Sale', id: 'LIST' }, { type: 'Order', id: 'LIST' }, { type: 'Dashboard', id: 'ALL' }],
    }),
  }),
});

export const {
  useGetInquiriesQuery,
  useGetInquiryCountsQuery,
  useGetInquiryQuery,
  useGetActivitiesQuery,
  useCreateInquiryMutation,
  useUpdateInquiryMutation,
  useAssignInquiryMutation,
  useBulkInquiryActionMutation,
  useRecordTouchbaseMutation,
  useRecordInteractionMutation,
  useSnoozeInquiryMutation,
  useChangeStatusMutation,
  useMarkWonMutation,
} = inquiriesApi;
