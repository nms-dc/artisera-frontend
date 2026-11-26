/** The fields of `values` that differ from `initial`, so a PATCH carries only what the user actually changed. */
export function changedFields<T extends Record<string, unknown>>(values: T, initial: T): Partial<T> {
  const changes: Partial<T> = {};
  (Object.keys(values) as (keyof T)[]).forEach((key) => {
    if (values[key] !== initial[key]) changes[key] = values[key];
  });
  return changes;
}
