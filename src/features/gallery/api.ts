import { apiSlice } from '@/store/apiSlice';
import { endpoints } from '@/core/api/endpoints';
import type {
  CertificateRow,
  DateRangeParams,
  DispatchInput,
  GalleryDashboard,
  GalleryListParams,
  LogEntry,
  MediaKind,
  OrderDetail,
  OrderListParams,
  OrderMedia,
  OrderProductsPatch,
  OrderRow,
  Paginated,
  SaleDetail,
  SaleListParams,
  SaleProduct,
  SaleProductPatch,
  Sale,
  ShipmentListParams,
  ShipmentRow,
  ShipmentStatus,
} from '@/lib/types';

const GALLERY_TAGS = ['Sale', 'Order', 'Shipment', 'Certificate', 'Dashboard', 'Notification', 'Inquiry'] as const;
// Bare tag types invalidate every id of that type, so detail pages and the dashboard (tag id 'ALL') refetch too.
const invalidateAll = () => [...GALLERY_TAGS];
const query = (params: object) => params as Record<string, unknown>;

export const galleryApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    getGalleryDashboard: b.query<GalleryDashboard, DateRangeParams>({
      query: (params) => ({ url: endpoints.dashboard.gallery, params: query(params) }),
      providesTags: [{ type: 'Dashboard', id: 'ALL' }],
    }),
    getGalleryCustomers: b.query<{ id: string; name: string }[], void>({ query: () => ({ url: endpoints.galleryCustomers }), providesTags: [{ type: 'Sale', id: 'LIST' }] }),

    getSales: b.query<Paginated<Sale>, SaleListParams>({ query: (params) => ({ url: endpoints.sales.list, params: query(params) }), providesTags: [{ type: 'Sale', id: 'LIST' }] }),
    getSale: b.query<SaleDetail, string>({ query: (id) => ({ url: endpoints.sales.detail(id) }), providesTags: (_r, _e, id) => [{ type: 'Sale', id }] }),
    updateSaleProduct: b.mutation<SaleProduct, { saleId: string; productId: string; changes: SaleProductPatch }>({
      query: ({ saleId, productId, changes }) => ({ url: endpoints.sales.product(saleId, productId), method: 'PATCH', data: changes }),
      invalidatesTags: (_r, _e, { saleId }) => [
        { type: 'Sale', id: saleId },
        { type: 'Sale', id: 'LIST' },
        { type: 'Dashboard', id: 'ALL' },
      ],
    }),
    overrideSaleEmail: b.mutation<{ id: string; emailConfirmed: boolean }, string>({
      query: (id) => ({ url: endpoints.sales.emailOverride(id), method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Sale', id }, ...invalidateAll()],
    }),
    markSaleEmailReceived: b.mutation<{ id: string; emailConfirmed: boolean }, string>({
      query: (id) => ({ url: endpoints.sales.emailReceived(id), method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Sale', id }, ...invalidateAll()],
    }),
    markSaleEmailSent: b.mutation<{ id: string }, string>({
      query: (id) => ({ url: endpoints.sales.emailSent(id), method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Sale', id }, 'Inquiry', ...invalidateAll()],
    }),
    createOrders: b.mutation<OrderDetail[], { saleId: string; groups: string[][] }>({
      query: ({ saleId, groups }) => ({ url: endpoints.sales.orders(saleId), method: 'POST', data: { groups } }),
      invalidatesTags: (_r, _e, { saleId }) => [{ type: 'Sale', id: saleId }, ...invalidateAll()],
    }),

    getOrders: b.query<Paginated<OrderRow>, OrderListParams>({
      query: (params) => ({ url: endpoints.orders.list, params: query(params) }),
      providesTags: [{ type: 'Order', id: 'LIST' }],
    }),
    getOrder: b.query<OrderDetail, string>({ query: (id) => ({ url: endpoints.orders.detail(id) }), providesTags: (_r, _e, id) => [{ type: 'Order', id }] }),
    getOrderActivities: b.query<LogEntry[], string>({
      query: (id) => ({ url: endpoints.orders.activities(id) }),
      providesTags: (_r, _e, id) => [{ type: 'Order', id: `log-${id}` }],
    }),
    saveOrderProducts: b.mutation<OrderDetail, { id: string; changes: OrderProductsPatch }>({
      query: ({ id, changes }) => ({ url: endpoints.orders.detail(id), method: 'PATCH', data: changes }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Order', id }, { type: 'Order', id: `log-${id}` }, ...invalidateAll()],
    }),
    uploadOrderMedia: b.mutation<OrderMedia, { id: string; file: File; kind: MediaKind }>({
      query: ({ id, file, kind }) => {
        const data = new FormData();
        data.append('file', file);
        data.append('kind', kind);
        return { url: endpoints.orders.media(id), method: 'POST', data };
      },
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Order', id },
        { type: 'Order', id: `log-${id}` },
      ],
    }),
    deleteOrderMedia: b.mutation<Record<string, never>, { id: string; mediaId: string }>({
      query: ({ id, mediaId }) => ({ url: endpoints.orders.mediaItem(id, mediaId), method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Order', id }],
    }),
    saveDispatch: b.mutation<OrderDetail, { id: string; changes: Partial<DispatchInput> }>({
      query: ({ id, changes }) => ({ url: endpoints.orders.dispatch(id), method: 'PATCH', data: changes }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Order', id }, { type: 'Order', id: `log-${id}` }, ...invalidateAll()],
    }),
    setOrderReceived: b.mutation<OrderDetail, { id: string; received: boolean; date?: string }>({
      query: ({ id, ...data }) => ({ url: endpoints.orders.received(id), method: 'POST', data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Order', id }, { type: 'Order', id: `log-${id}` }, ...invalidateAll()],
    }),
    setCertificateSent: b.mutation<OrderDetail, { id: string; sent: boolean; date?: string }>({
      query: ({ id, ...data }) => ({ url: endpoints.orders.certificateSent(id), method: 'POST', data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Order', id }, { type: 'Order', id: `log-${id}` }, ...invalidateAll()],
    }),

    getShipments: b.query<Paginated<ShipmentRow>, ShipmentListParams>({
      query: (params) => ({ url: endpoints.shipments.list, params: query(params) }),
      providesTags: [{ type: 'Shipment', id: 'LIST' }],
    }),
    updateShipmentStatus: b.mutation<ShipmentRow, { id: string; status: ShipmentStatus }>({
      query: ({ id, status }) => ({ url: endpoints.shipments.status(id), method: 'PATCH', data: { status } }),
      invalidatesTags: () => invalidateAll(),
    }),
    getCertificates: b.query<Paginated<CertificateRow>, GalleryListParams>({
      query: (params) => ({ url: endpoints.certificates.list, params: query(params) }),
      providesTags: [{ type: 'Certificate', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetGalleryDashboardQuery,
  useGetGalleryCustomersQuery,
  useGetSalesQuery,
  useGetSaleQuery,
  useUpdateSaleProductMutation,
  useCreateOrdersMutation,
  useOverrideSaleEmailMutation,
  useMarkSaleEmailReceivedMutation,
  useMarkSaleEmailSentMutation,
  useGetOrdersQuery,
  useGetOrderQuery,
  useGetOrderActivitiesQuery,
  useSaveOrderProductsMutation,
  useUploadOrderMediaMutation,
  useDeleteOrderMediaMutation,
  useSaveDispatchMutation,
  useSetOrderReceivedMutation,
  useSetCertificateSentMutation,
  useGetShipmentsQuery,
  useUpdateShipmentStatusMutation,
  useGetCertificatesQuery,
} = galleryApi;
