import { apiSlice } from '@/store/apiSlice';
import { endpoints } from '@/core/api/endpoints';
import type { User } from '@/lib/types';
import type { ChangePasswordValues } from '@/lib/schemas/changePasswordSchema';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    login: b.mutation<User, { email: string; password: string }>({
      queryFn: async (credentials, _api, _extra, baseQuery) => {
        const session = await baseQuery({ url: endpoints.auth.login, method: 'POST', data: credentials });
        if (session.error) return { error: session.error };
        const me = await baseQuery({ url: endpoints.auth.me });
        return me.error ? { error: me.error } : { data: me.data as User };
      },
    }),
    changePassword: b.mutation<{ detail?: string }, ChangePasswordValues>({
      query: (data) => ({ url: endpoints.auth.changePassword, method: 'POST', data }),
    }),
  }),
});
export const { useLoginMutation, useChangePasswordMutation } = authApi;
