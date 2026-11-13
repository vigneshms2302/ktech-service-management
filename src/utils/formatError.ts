/**
 * K-Connect Human-Friendly Error Sanitizer
 * Transforms technical, infrastructure, serverless, database, and network error messages
 * into polite, clean, human-understandable instructions for non-developer shop owners and technicians.
 */

export function formatUserFriendlyError(rawError: unknown, status?: number): string {
  if (!rawError) {
    if (status === 401) return 'Incorrect username, password, or shop identifier. Please check and try again.';
    if (status === 403) return 'Access restricted. Please contact your shop administrator.';
    if (status === 404) return 'The requested resource was not found.';
    if (status === 429) return 'Too many attempts. For security, please wait a few moments before trying again.';
    if (status && status >= 500) return 'Cloud server is momentarily unavailable. Please check your connection or try again shortly.';
    return 'An unexpected issue occurred. Please try again.';
  }

  const str =
    typeof rawError === 'string'
      ? rawError
      : (rawError as any)?.message || String(rawError);

  const lower = str.toLowerCase();

  // 1. Vercel Serverless / Lambda / Cloudflare / Nginx / Proxy infrastructure crashes
  if (
    lower.includes('function_invocation_failed') ||
    lower.includes('a server error has occurred') ||
    lower.includes('internal_server_error') ||
    lower.includes('500 internal') ||
    lower.includes('bom1::') ||
    lower.includes('iad1::') ||
    lower.includes('sfo1::') ||
    lower.includes('cdg1::') ||
    lower.includes('hnd1::') ||
    lower.includes('<!doctype') ||
    lower.includes('<html') ||
    (status && status >= 500 && status <= 504)
  ) {
    return 'Cloud server is momentarily unavailable. Please check your connection or try again in a few moments.';
  }

  // 2. Database configuration or cloud connection errors
  if (
    lower.includes('database_not_configured') ||
    lower.includes('sqlite_error') ||
    lower.includes('drizzle') ||
    lower.includes('libsql') ||
    lower.includes('turso') ||
    lower.includes('busy_timeout')
  ) {
    return 'Cloud database is currently initializing. Please try again in a few moments.';
  }

  // 3. Network and offline connectivity issues
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('err_connection_refused') ||
    lower.includes('network communication error')
  ) {
    return 'Unable to reach the server. Please check your internet connection.';
  }

  // 4. Rate limiting (429)
  if (status === 429 || lower.includes('too many authentication') || lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Too many sign-in attempts. For security, please wait a few minutes before trying again.';
  }

  // 5. Authentication & Login
  if (lower.includes('invalid super-admin credentials')) {
    return 'Invalid Super-Admin username or password.';
  }
  if (lower.includes('shop not found') || lower.includes('shop identifier')) {
    return 'Shop not found. Please verify your Shop Identifier (Slug).';
  }
  if (lower.includes('invalid username or inactive') || lower.includes('inactive user')) {
    return 'Incorrect username, or this staff account has been deactivated.';
  }
  if (lower.includes('invalid password')) {
    return 'Incorrect password. Please verify your password and try again.';
  }
  if (lower.includes('invalid pin')) {
    return 'Incorrect 4-digit PIN. Please try again.';
  }
  if (lower.includes('frozen')) {
    return 'Your shop account is currently suspended. Please contact vendor support.';
  }
  if (lower.includes('expired')) {
    return 'Your free trial has ended. Please upgrade your subscription plan.';
  }

  // 6. Validation cleanups
  if (lower.includes('invalid email address') || lower.includes('email: invalid')) {
    return 'Please enter a valid email address.';
  }
  if (lower.includes('handle already taken') || lower.includes('slug: handle already taken')) {
    return 'This Shop URL Handle is already registered. Please choose a different handle.';
  }
  if (lower.includes('mobile number already registered')) {
    return 'This mobile number is already registered to another shop account.';
  }
  if (lower.includes('email is already registered')) {
    return 'This email address is already registered to another account.';
  }

  // 7. Strip raw technical prefixes
  const cleaned = str
    .replace(/^Server error \(\d+\):\s*/i, '')
    .replace(/^HTTP error \(\d+\):\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim();

  // If after cleaning it's still cryptic or HTML markup, fall back to safe friendly message
  if (cleaned.length > 200 || cleaned.startsWith('<') || cleaned.includes('FUNCTION_INVOCATION_FAILED')) {
    return 'Cloud server is momentarily unavailable. Please try again in a few moments.';
  }

  return cleaned;
}

