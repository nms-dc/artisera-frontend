import { apiSlice } from '@/store/apiSlice';
import { endpoints } from '@/core/api/endpoints';
import type { Paginated, UserInput, UserRecord, UserSummary } from '@/lib/types';

export type UserListParams = { q?: string; role?: string; status?: string; page?: number; pageSize?: number };

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    getUserOptions: b.query<UserSummary[], { role?: string } | void>({
      query: (p) => ({ url: endpoints.users.options, params: p ?? undefined }),
      providesTags: [{ type: 'User', id: 'OPTIONS' }],
    }),
    getUserList: b.query<Paginated<UserRecord>, UserListParams>({
      query: (params) => ({ url: endpoints.users.list, params }),
      providesTags: [{ type: 'User', id: 'LIST' }],
    }),
    getUser: b.query<UserRecord, string>({
      query: (id) => ({ url: endpoints.users.detail(id) }),
      providesTags: (_r, _e, id) => [{ type: 'User', id }],
    }),
    createUser: b.mutation<UserRecord, UserInput>({
      query: (data) => ({ url: endpoints.users.list, method: 'POST', data }),
      invalidatesTags: [
        { type: 'User', id: 'LIST' },
        { type: 'User', id: 'OPTIONS' },
        { type: 'Role', id: 'LIST' },
      ],
    }),
    updateUser: b.mutation<UserRecord, { id: string; changes: UserInput }>({
      query: ({ id, changes }) => ({ url: endpoints.users.detail(id), method: 'PATCH', data: changes }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        { type: 'User', id: 'OPTIONS' },
        { type: 'Role', id: 'LIST' },
      ],
    }),
  }),
});

export const { useGetUserOptionsQuery, useGetUserListQuery, useGetUserQuery, useCreateUserMutation, useUpdateUserMutation } = usersApi;

export const useRms = () => useGetUserOptionsQuery({ role: 'RM' }).data ?? [];
