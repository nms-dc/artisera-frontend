import axios, { AxiosError } from 'axios';
import { clearSession } from '@/core/auth/session';

export const axiosClient = axios.create({ baseURL: '/api', withCredentials: true, timeout: 20000 });

axiosClient.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    const isAuthCall = (error.config?.url ?? '').includes('/auth/');
    if (error.response?.status === 401 && !isAuthCall && typeof window !== 'undefined') {
      clearSession();
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
