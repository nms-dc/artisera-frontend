import { apiSlice } from '@/store/apiSlice';
import { endpoints } from '@/core/api/endpoints';
import type { MasterKind, MasterOption, MasterRecord, Paginated } from '@/lib/types';

export type MasterListParams = { kind: MasterKind; q?: string; status?: string; categoryId?: string; page?: number; pageSize?: number };

export const mastersApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    getMasterList: b.query<Paginated<MasterRecord>, MasterListParams>({
      query: ({ kind, ...params }) => ({ url: endpoints.masters.list(kind), params }),
      providesTags: (_r, _e, { kind }) => [{ type: 'Master', id: kind }],
    }),
    getMasterOptions: b.query<MasterOption[], { kind: MasterKind; categoryId?: string }>({
      query: ({ kind, categoryId }) => ({ url: endpoints.masters.options(kind), params: { categoryId } }),
      providesTags: (_r, _e, { kind }) => [{ type: 'Master', id: kind }],
    }),
    getMasterRecord: b.query<MasterRecord, { kind: MasterKind; id: string }>({
      query: ({ kind, id }) => ({ url: endpoints.masters.detail(kind, id) }),
      providesTags: (_r, _e, { kind }) => [{ type: 'Master', id: kind }],
    }),
    createMaster: b.mutation<MasterRecord, { kind: MasterKind; data: Record<string, unknown> }>({
      query: ({ kind, data }) => ({ url: endpoints.masters.list(kind), method: 'POST', data }),
      invalidatesTags: (_r, _e, { kind }) => [{ type: 'Master', id: kind }],
    }),
    updateMaster: b.mutation<MasterRecord, { kind: MasterKind; id: string; changes: Record<string, unknown> }>({
      query: ({ kind, id, changes }) => ({ url: endpoints.masters.detail(kind, id), method: 'PATCH', data: changes }),
      invalidatesTags: (_r, _e, { kind }) => [
        { type: 'Master', id: kind },
        { type: 'Inquiry', id: 'LIST' },
      ],
    }),
  }),
});
export const { useGetMasterListQuery, useGetMasterOptionsQuery, useGetMasterRecordQuery, useCreateMasterMutation, useUpdateMasterMutation } = mastersApi;

export const useCategoryOptions = () => useGetMasterOptionsQuery({ kind: 'categories' }).data ?? [];
export const useSubcategoryOptions = (categoryId?: string) => useGetMasterOptionsQuery({ kind: 'subcategories', categoryId }).data ?? [];
export const useArtistOptions = () => useGetMasterOptionsQuery({ kind: 'artists' }).data ?? [];
