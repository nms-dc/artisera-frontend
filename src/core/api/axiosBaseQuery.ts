import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { axiosClient } from './client';
import { toApiError, ApiError } from './errors';

export type RequestArgs = { url: string; method?: AxiosRequestConfig['method']; data?: unknown; params?: Record<string, unknown> };

export function cleanParams(p?: Record<string, unknown>) {
  if (!p) return undefined;
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

async function transport({ url, method = 'GET', data, params }: RequestArgs) {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    const { mockDispatch } = await import('@/mocks/server');
    return mockDispatch({ url, method, data, params: cleanParams(params) });
  }
  const res = await axiosClient({ url, method, data, params: cleanParams(params) });
  return res.data;
}

export const axiosBaseQuery = (): BaseQueryFn<RequestArgs, unknown, ApiError> => async (args) => {
  try {
    return { data: await transport(args) };
  } catch (e) {
    const err = e as AxiosError & { response?: { status: number; data: unknown } };
    return { error: toApiError(err.response?.status, err.response?.data, err.message || 'Request failed') };
  }
};
