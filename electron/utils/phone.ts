/**
 * Normalizes a phone number into a canonical 10-digit format for Indian phone numbers,
 * or clean digit string for search and duplicate detection.
 *
 * Examples:
 * "+91 98430 11223" -> "9843011223"
 * "09843011223"     -> "9843011223"
 * "98430-11223"     -> "9843011223"
 * "9843011223"      -> "9843011223"
 */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  
  // Extract only digits
  const digits = raw.replace(/\D/g, '');
  
  // If 12 digits starting with 91 (e.g. 919843011223)
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  
  // If 11 digits starting with 0 (e.g. 09843011223)
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  
  // If 10 digits, standard Indian mobile number
  if (digits.length === 10) {
    return digits;
  }
  
  return digits;
}

/**
 * Formats a phone number for clean UI display without altering original database records.
 */
export function formatPhoneDisplay(raw: string | null | undefined): string {
  if (!raw) return '';
  const canonical = normalizePhone(raw);
  if (canonical.length === 10) {
    return `+91 ${canonical.slice(0, 5)} ${canonical.slice(5)}`;
  }
  return raw;
}
