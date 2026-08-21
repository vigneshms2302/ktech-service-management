export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return digits;
}

export function formatPhoneDisplay(raw: string | null | undefined): string {
  if (!raw) return '';
  const canonical = normalizePhone(raw);
  if (canonical.length === 10) {
    return `+91 ${canonical.slice(0, 5)} ${canonical.slice(5)}`;
  }
  return raw;
}
