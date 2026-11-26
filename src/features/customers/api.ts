import { apiSlice } from '@/store/apiSlice';
import { endpoints } from '@/core/api/endpoints';
import type { Activity, Customer, CustomerInput, CustomerSale, Paginated } from '@/lib/types';

export type CustomerListParams = { q?: string; location?: string; rmId?: string; status?: string; customerType?: string; page?: number; pageSize?: number };

export const customersApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    getCustomers: b.query<Paginated<Customer>, CustomerListParams>({
      query: (params) => ({ url: endpoints.customers.list, params: params as Record<string, unknown> }),
      providesTags: [{ type: 'Customer', id: 'LIST' }],
    }),
    getCustomerLocations: b.query<string[], void>({ query: () => ({ url: endpoints.customers.locations }), providesTags: [{ type: 'Customer', id: 'LIST' }] }),
    getCustomer: b.query<Customer, string>({ query: (id) => ({ url: endpoints.customers.detail(id) }), providesTags: (_r, _e, id) => [{ type: 'Customer', id }] }),
    getCustomerActivities: b.query<Activity[], string>({ query: (id) => ({ url: endpoints.customers.activities(id) }), providesTags: [{ type: 'Activity', id: 'ALL' }] }),
    getCustomerSales: b.query<CustomerSale[], string>({ query: (id) => ({ url: endpoints.customers.sales(id) }), providesTags: [{ type: 'Sale', id: 'LIST' }] }),
    createCustomer: b.mutation<Customer, CustomerInput>({
      query: (data) => ({ url: endpoints.customers.list, method: 'POST', data }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
    }),
    updateCustomer: b.mutation<Customer, { id: string; changes: CustomerInput }>({
      query: ({ id, changes }) => ({ url: endpoints.customers.detail(id), method: 'PATCH', data: changes }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Customer', id },
        { type: 'Customer', id: 'LIST' },
        { type: 'Inquiry', id: 'LIST' },
      ],
    }),
  }),
});
export const {
  useGetCustomersQuery,
  useGetCustomerLocationsQuery,
  useGetCustomerQuery,
  useGetCustomerActivitiesQuery,
  useGetCustomerSalesQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} = customersApi;
