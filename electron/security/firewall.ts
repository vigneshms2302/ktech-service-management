import { session } from 'electron';
import { logger } from '../utils/logger.ts';

export interface FirewallRule {
  domain: string;
  purpose: string;
  allowSubdomains: boolean;
}

// Strictly whitelisted outbound domain rules
const DEFAULT_WHITELIST: FirewallRule[] = [
  // Localhost & internal IPC loopback
  { domain: 'localhost', purpose: 'Local Development & Loopback', allowSubdomains: true },
  { domain: '127.0.0.1', purpose: 'Local Loopback IP', allowSubdomains: false },
  
  // WhatsApp Cloud API & Web Hooks
  { domain: 'graph.facebook.com', purpose: 'Meta WhatsApp Cloud API', allowSubdomains: false },
  { domain: 'api.whatsapp.com', purpose: 'WhatsApp Official API Gateway', allowSubdomains: false },
  { domain: 'web.whatsapp.com', purpose: 'WhatsApp Web Integration', allowSubdomains: false },
  { domain: 'wa.me', purpose: 'WhatsApp Direct Links', allowSubdomains: false },

  // Software Updates & Releases
  { domain: 'github.com', purpose: 'Release Repository', allowSubdomains: false },
  { domain: 'api.github.com', purpose: 'GitHub Releases API for Auto-Updates', allowSubdomains: false },
  { domain: 'objects.githubusercontent.com', purpose: 'GitHub Release Asset CDN', allowSubdomains: true },

  // Fonts & Icons (Google Fonts CDN)
  { domain: 'fonts.googleapis.com', purpose: 'Typography Stylesheets', allowSubdomains: false },
  { domain: 'fonts.gstatic.com', purpose: 'Typography Web Fonts', allowSubdomains: true },
];

let customAllowedDomains: string[] = [];
let isFirewallActive = false;

/**
 * Checks whether a given URL is permitted by the in-app firewall rules.
 */
export function isUrlAllowed(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();

    // Allow internal electron / dev-server schemas
    if (parsed.protocol === 'devtools:' || parsed.protocol === 'file:' || parsed.protocol === 'data:' || parsed.protocol === 'blob:') {
      return true;
    }

    // Check custom dynamic domains
    if (customAllowedDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
      return true;
    }

    // Check default whitelist
    for (const rule of DEFAULT_WHITELIST) {
      if (rule.allowSubdomains) {
        if (hostname === rule.domain || hostname.endsWith(`.${rule.domain}`)) {
          return true;
        }
      } else {
        if (hostname === rule.domain) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Adds dynamic custom allowed domains at runtime.
 */
export function addAllowedDomain(domain: string): void {
  const clean = domain.trim().toLowerCase();
  if (clean && !customAllowedDomains.includes(clean)) {
    customAllowedDomains.push(clean);
    logger.info('Firewall', `Added dynamic allowed domain to in-app firewall: ${clean}`);
  }
}

/**
 * Returns the current active list of whitelist rules.
 */
export function getFirewallRules(): { defaultRules: FirewallRule[]; customDomains: string[]; isActive: boolean } {
  return {
    defaultRules: DEFAULT_WHITELIST,
    customDomains: [...customAllowedDomains],
    isActive: isFirewallActive,
  };
}

/**
 * Initializes the in-app network firewall on the default Electron session.
 */
export function initializeInAppFirewall(): void {
  if (isFirewallActive) return;

  try {
    const defaultSession = session.defaultSession;
    if (!defaultSession) {
      logger.warn('Firewall', 'Electron defaultSession not ready yet; firewall setup deferred.');
      return;
    }

    // Intercept all outgoing network requests
    defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const { url } = details;

      if (isUrlAllowed(url)) {
        callback({ cancel: false });
      } else {
        logger.warn('Firewall', `[BLOCKED_OUTBOUND_REQUEST] Blocked unauthorized network request to: ${url}`);
        callback({ cancel: true });
      }
    });

    // Enforce Secure Headers and CSP
    defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };

      // Ensure X-Frame-Options and X-Content-Type-Options
      responseHeaders['x-content-type-options'] = ['nosniff'];
      responseHeaders['x-frame-options'] = ['DENY'];
      responseHeaders['x-xss-protection'] = ['1; mode=block'];

      callback({ responseHeaders });
    });

    isFirewallActive = true;
    logger.info('Firewall', 'In-App Network Guard & Request Whitelist Firewall initialized successfully.');
  } catch (err) {
    logger.error('Firewall', 'Failed to initialize in-app firewall', err);
  }
}
