export function canonicalUuid(value: string): string {
  if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)) throw new TypeError('A canonical UUID is required');
  return value.toLowerCase();
}
export function uuidFields<T extends object>(body: T): T {
  const output = { ...body } as Record<string, unknown>;
  for (const key of ['source_id', 'project_id', 'edition_id', 'job_id', 'template_id', 'folder_id', 'upload_session_id', 'idempotency_key']) {
    if (typeof output[key] === 'string') output[key] = canonicalUuid(output[key] as string);
  }
  return output as T;
}
export function scopeQuery(scope: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(scope)) if (value !== undefined && value !== null) params.set(key, String(value));
  return params.toString();
}

export function callerScope<T extends { project_kind?: string; project_id?: string | null }>(body: T): T {
  return body.project_kind === 'dubbing' ? uuidFields(body) : body;
}
