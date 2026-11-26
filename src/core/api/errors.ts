export type ApiError = {
  status?: number;
  message: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
};

export function errorMessage(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return undefined;
}

export function toApiError(status: number | undefined, data: unknown, fallback: string): ApiError {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const body = data as Record<string, unknown>;
    if (typeof body.detail === 'string') return { status, message: body.detail, code: typeof body.code === 'string' ? body.code : undefined };
    const fieldErrors: Record<string, string[]> = {};
    Object.entries(body).forEach(([k, v]) => {
      if (Array.isArray(v)) fieldErrors[k] = v.map(String);
      else if (typeof v === 'string') fieldErrors[k] = [v];
    });
    const first = Object.entries(fieldErrors)[0];
    if (first) return { status, message: first[1][0].endsWith('.') ? first[1][0] : `${first[0]}: ${first[1][0]}`, fieldErrors };
  }
  if (Array.isArray(data) && data.length) return { status, message: String(data[0]) };
  if (status === 403) return { status, message: 'You do not have permission to do this.' };
  if (status === 404) return { status, message: 'Not found.' };
  if (status && status >= 500) return { status, message: 'Server error. Please try again.' };
  return { status, message: fallback };
}
