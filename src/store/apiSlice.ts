import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/core/api/axiosBaseQuery';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Inquiry', 'InquiryCounts', 'Activity', 'Customer', 'Master', 'Dashboard', 'Report', 'Notification', 'User', 'Role', 'Sale', 'Order', 'Shipment', 'Certificate'],
  endpoints: () => ({}),
});
