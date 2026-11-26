import { axiosClient } from './client';
import { cleanParams } from './axiosBaseQuery';

export async function downloadFile(url: string, params: Record<string, unknown>, filename: string) {
  let blob: Blob;
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    const { mockDispatch } = await import('@/mocks/server');
    const csv = await mockDispatch({ url, method: 'GET', params: cleanParams(params) });
    blob = new Blob([csv as string], { type: 'text/csv' });
  } else {
    const res = await axiosClient.get(url, { params: cleanParams(params), responseType: 'blob' });
    blob = res.data;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
