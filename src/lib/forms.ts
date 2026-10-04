/** Small helpers shared by the Submit and Advertise endpoints. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function str(form: FormData, name: string, max: number): string {
  return String(form.get(name) ?? '').trim().slice(0, max);
}

export function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}
