import { apiSlice } from '@/store/apiSlice';
import { endpoints } from '@/core/api/endpoints';
import type { NotificationsResponse } from '@/lib/types';

export const notificationsApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    getNotifications: b.query<NotificationsResponse, void>({ query: () => ({ url: endpoints.notifications.list }), providesTags: [{ type: 'Notification', id: 'ALL' }] }),
    markRead: b.mutation<void, string>({ query: (id) => ({ url: endpoints.notifications.read(id), method: 'POST' }), invalidatesTags: [{ type: 'Notification', id: 'ALL' }] }),
    markAllRead: b.mutation<void, void>({ query: () => ({ url: endpoints.notifications.readAll, method: 'POST' }), invalidatesTags: [{ type: 'Notification', id: 'ALL' }] }),
  }),
});
export const { useGetNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation } = notificationsApi;
