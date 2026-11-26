import { apiSlice } from '@/store/apiSlice';
import { endpoints } from '@/core/api/endpoints';
import type { AdminDashboard, DashboardRange, RmDashboard } from '@/lib/types';

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    getAdminDashboard: b.query<AdminDashboard, { range: DashboardRange }>({
      query: (params) => ({ url: endpoints.dashboard.admin, params }),
      providesTags: [{ type: 'Dashboard', id: 'ALL' }],
    }),
    getRmDashboard: b.query<RmDashboard, { range: DashboardRange; rmId?: string }>({
      query: (params) => ({ url: endpoints.dashboard.rm, params }),
      providesTags: [{ type: 'Dashboard', id: 'ALL' }],
    }),
  }),
});
export const { useGetAdminDashboardQuery, useGetRmDashboardQuery } = dashboardApi;
