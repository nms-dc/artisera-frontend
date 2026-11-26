import type { FormikErrors } from 'formik';
import type { ApiError } from '@/core/api/errors';

export function handleSubmitError<V>(e: unknown, setErrors?: (errors: FormikErrors<V>) => void): string {
  const err = e as ApiError | undefined;
  if (err?.fieldErrors && setErrors) {
    setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v[0]])) as FormikErrors<V>);
  }
  return err?.message ?? 'Something went wrong. Please try again.';
}
