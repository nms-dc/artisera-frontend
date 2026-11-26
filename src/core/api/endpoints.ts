const account = '/v1/account';
const common = '/v1/common';
const crm = '/v1/crm';
const gallery = '/v1/gallery';

export const endpoints = {
  auth: {
    login: `${account}/auth/login/`,
    logout: `${account}/auth/logout/`,
    me: `${account}/auth/me/`,
    refresh: `${account}/auth/refresh/`,
    changePassword: `${account}/auth/change-password/`,
  },
  users: { list: `${account}/users/`, options: `${account}/users/options/`, detail: (id: string) => `${account}/users/${id}/` },
  roles: { list: `${account}/roles/`, options: `${account}/roles/options/`, detail: (id: string) => `${account}/roles/${id}/` },
  masters: {
    list: (kind: string) => `${common}/${kind}/`,
    options: (kind: string) => `${common}/${kind}/options/`,
    detail: (kind: string, id: string) => `${common}/${kind}/${id}/`,
  },
  inquiries: {
    list: `${crm}/inquiries/`,
    counts: `${crm}/inquiries/counts/`,
    detail: (id: string) => `${crm}/inquiries/${id}/`,
    activities: (id: string) => `${crm}/inquiries/${id}/activities/`,
    bulk: `${crm}/inquiries/bulk/`,
    assign: (id: string) => `${crm}/inquiries/${id}/assign/`,
    touchbase: (id: string) => `${crm}/inquiries/${id}/touchbase/`,
    interactions: (id: string) => `${crm}/inquiries/${id}/interactions/`,
    snooze: (id: string) => `${crm}/inquiries/${id}/snooze/`,
    status: (id: string) => `${crm}/inquiries/${id}/status/`,
    won: (id: string) => `${crm}/inquiries/${id}/won/`,
  },
  customers: {
    list: `${crm}/customers/`,
    locations: `${crm}/customers/locations/`,
    detail: (id: string) => `${crm}/customers/${id}/`,
    activities: (id: string) => `${crm}/customers/${id}/activities/`,
    sales: (id: string) => `${crm}/customers/${id}/sales/`,
  },
  notifications: { list: `${crm}/notifications/`, read: (id: string) => `${crm}/notifications/${id}/read/`, readAll: `${crm}/notifications/read-all/` },
  dashboard: { admin: `${crm}/dashboard/admin/`, rm: `${crm}/dashboard/rm/`, gallery: `${gallery}/dashboard/` },
  reports: {
    inquirySummary: `${crm}/reports/inquiry-summary/`,
    inquiryDetail: `${crm}/reports/inquiry-detail/`,
    inquiryDetailExport: `${crm}/reports/inquiry-detail/export/`,
  },
  sales: {
    list: `${gallery}/sales/`,
    export: `${gallery}/sales/export/`,
    detail: (id: string) => `${gallery}/sales/${id}/`,
    product: (id: string, productId: string) => `${gallery}/sales/${id}/products/${productId}/`,
    orders: (id: string) => `${gallery}/sales/${id}/orders/`,
    emailOverride: (id: string) => `${gallery}/sales/${id}/email-override/`,
    emailReceived: (id: string) => `${gallery}/sales/${id}/email-received/`,
    emailSent: (id: string) => `${gallery}/sales/${id}/email-sent/`,
  },
  orders: {
    list: `${gallery}/orders/`,
    export: `${gallery}/orders/export/`,
    detail: (id: string) => `${gallery}/orders/${id}/`,
    activities: (id: string) => `${gallery}/orders/${id}/activities/`,
    media: (id: string) => `${gallery}/orders/${id}/media/`,
    mediaItem: (id: string, mediaId: string) => `${gallery}/orders/${id}/media/${mediaId}/`,
    dispatch: (id: string) => `${gallery}/orders/${id}/dispatch/`,
    received: (id: string) => `${gallery}/orders/${id}/received/`,
    certificateSent: (id: string) => `${gallery}/orders/${id}/certificate-sent/`,
  },
  galleryCustomers: `${gallery}/customers/`,
  shipments: { list: `${gallery}/shipments/`, export: `${gallery}/shipments/export/`, status: (id: string) => `${gallery}/shipments/${id}/status/` },
  certificates: { list: `${gallery}/certificates/`, export: `${gallery}/certificates/export/` },
} as const;
