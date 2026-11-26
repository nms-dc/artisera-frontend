import { apiSlice } from '@/store/apiSlice';
import { endpoints } from '@/core/api/endpoints';
import type { Paginated, RoleInput, RoleRecord, UserSummary } from '@/lib/types';

export type RoleListParams = { q?: string; status?: string; page?: number; pageSize?: number };

export const rolesApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    getRoleOptions: b.query<UserSummary[], void>({ query: () => ({ url: endpoints.roles.options }), providesTags: [{ type: 'Role', id: 'LIST' }] }),
    getRoleList: b.query<Paginated<RoleRecord>, RoleListParams>({ query: (params) => ({ url: endpoints.roles.list, params }), providesTags: [{ type: 'Role', id: 'LIST' }] }),
    getRole: b.query<RoleRecord, string>({ query: (id) => ({ url: endpoints.roles.detail(id) }), providesTags: (_r, _e, id) => [{ type: 'Role', id }] }),
    createRole: b.mutation<RoleRecord, RoleInput>({ query: (data) => ({ url: endpoints.roles.list, method: 'POST', data }), invalidatesTags: [{ type: 'Role', id: 'LIST' }] }),
    updateRole: b.mutation<RoleRecord, { id: string; changes: RoleInput }>({
      query: ({ id, changes }) => ({ url: endpoints.roles.detail(id), method: 'PATCH', data: changes }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Role', id },
        { type: 'Role', id: 'LIST' },
        { type: 'User', id: 'LIST' },
      ],
    }),
  }),
});

export const { useGetRoleOptionsQuery, useGetRoleListQuery, useGetRoleQuery, useCreateRoleMutation, useUpdateRoleMutation } = rolesApi;
