export interface ShopItem {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerUsername?: string;
  phone: string;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  city: string;
  state: string;
  pincode?: string | null;
  status: 'ACTIVE' | 'FROZEN' | 'EXPIRED';
  subscriptionStatus: string;
  trialEndsAt?: string | null;
  currentPeriodEndsAt?: string | null;
  isComplimentary?: boolean;
  maxSeats: number;
  activeUsersCount: number;
  totalUsersCount?: number;
  totalJobsCount: number;
  totalCustomersCount?: number;
  totalDevicesCount?: number;
  workshopGmvInr?: number;
  lastActivityAt?: string;
  subscriptionPlan: string;
  subscriptionEndsAt: string;
  createdAt: string;
}

export interface ShopUserAccount {
  id: string;
  shopId: string;
  shopName?: string;
  shopSlug?: string;
  shopStatus?: 'ACTIVE' | 'FROZEN' | 'EXPIRED';
  username: string;
  fullName: string;
  roleId: string;
  roleName: string;
  phone?: string | null;
  pinCode?: string | null;
  isActive: boolean;
  hasRecoverablePassword?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface RevealedCredentialPayload {
  userId: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  username: string;
  fullName: string;
  phone?: string | null;
  password: string;
  pinCode?: string | null;
}

export interface ShopDossier extends ShopItem {
  upiId?: string | null;
  logoUrl?: string | null;
  complimentaryReason?: string | null;
  openJobsCount: number;
  deliveredJobsCount: number;
  totalInvoicesCount: number;
  collectedInr: number;
  users: ShopUserAccount[];
  recentCustomers: Array<{
    id: string;
    customerCode: string;
    fullName: string;
    primaryPhone: string;
    secondaryPhone?: string | null;
    email?: string | null;
    gstin?: string | null;
    customerType: string;
    devicesCount: number;
    jobsCount: number;
    totalInvoicedInr: number;
    totalPaidInr: number;
    createdAt: string;
  }>;
  recentJobs: Array<{
    id: string;
    jobNumber: string;
    serviceCategory: string;
    currentStatus: string;
    priority: string;
    reportedIssue: string;
    estimatedCost: number;
    advanceDeposit: number;
    customerName: string;
    customerPhone: string;
    deviceLabel: string;
    createdAt: string;
  }>;
  paymentClaims: Array<{
    id: string;
    amountInr: number;
    upiTransactionId: string;
    status: string;
    customerNotes?: string | null;
    rejectionReason?: string | null;
    createdAt: string;
    reviewedAt?: string | null;
  }>;
}

export interface GlobalCustomerItem {
  id: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  shopStatus: string;
  customerCode: string;
  fullName: string;
  primaryPhone: string;
  secondaryPhone?: string | null;
  email?: string | null;
  gstin?: string | null;
  customerType: string;
  notes?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  devicesCount: number;
  jobsCount: number;
  totalInvoicedInr: number;
  totalPaidInr: number;
  lastVisitAt?: string | null;
  createdAt: string;
}

export interface CustomerDossier {
  customer: {
    id: string;
    shopId: string;
    shopName: string;
    shopSlug: string;
    shopPhone?: string | null;
    customerCode: string;
    fullName: string;
    primaryPhone: string;
    secondaryPhone?: string | null;
    email?: string | null;
    gstin?: string | null;
    customerType: string;
    notes?: string | null;
    createdAt: string;
  };
  addresses: Array<{
    id: string;
    addressLine1: string;
    addressLine2?: string | null;
    landmark?: string | null;
    city: string;
    state: string;
    pincode?: string | null;
    isDefault: boolean;
  }>;
  devices: Array<{
    id: string;
    equipmentType: string;
    brand: string;
    modelName: string;
    serialNumber?: string | null;
    colorFinish?: string | null;
    specsSummary?: string | null;
    hasPasscode: boolean;
    jobsCount: number;
    createdAt: string;
  }>;
  jobs: Array<{
    id: string;
    jobNumber: string;
    serviceCategory: string;
    currentStatus: string;
    priority: string;
    reportedIssue: string;
    estimatedCost: number;
    advanceDeposit: number;
    deviceLabel: string;
    createdAt: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    invoiceType: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    paymentStatus: string;
    createdAt: string;
  }>;
  financialSummary: {
    totalInvoicedInr: number;
    totalPaidInr: number;
    balanceDueInr: number;
  };
}

export interface PlatformAnalyticsData {
  overview: {
    totalShops: number;
    activeShops: number;
    trialingShops: number;
    activeSubscriptions: number;
    frozenShops: number;
    expiredShops: number;
    totalUsers: number;
    activeUsers: number;
    totalCustomers: number;
    totalDevices: number;
    totalJobs: number;
    activeJobs: number;
    deliveredJobs: number;
    totalSaasRevenueInr: number;
    pendingSaasClaimsInr: number;
    pendingPaymentClaims: number;
    approvedPaymentClaims: number;
    totalShopGmvInr: number;
    totalShopCollectedInr: number;
    conversionRatePct: number;
    avgRevenuePerPayingShopInr: number;
  };
  signupsByWindow: {
    shopsLast7d: number;
    shopsLast30d: number;
    customersLast7d: number;
    customersLast30d: number;
    jobsLast7d: number;
    jobsLast30d: number;
  };
  jobsByStatus: Array<{ status: string; count: number }>;
  customersByType: Array<{ type: string; count: number }>;
  devicesByCategory: Array<{ category: string; count: number }>;
  shopsByCity: Array<{ city: string; shopsCount: number; customersCount: number; jobsCount: number }>;
  shopLeaderboard: Array<{
    shopId: string;
    name: string;
    slug: string;
    ownerName: string;
    phone: string;
    city: string;
    status: 'ACTIVE' | 'FROZEN' | 'EXPIRED';
    subscriptionStatus: string;
    isComplimentary: boolean;
    subscriptionEndsAt: string;
    daysRemaining: number;
    activeUsers: number;
    maxSeats: number;
    customersCount: number;
    devicesCount: number;
    jobsCount: number;
    invoicesCount: number;
    workshopGmvInr: number;
    collectedInr: number;
    saasPaidInr: number;
    lastActivityAt: string;
  }>;
  expiringSoon: Array<{
    shopId: string;
    name: string;
    slug: string;
    ownerName: string;
    phone: string;
    subscriptionStatus: string;
    subscriptionEndsAt: string;
    daysRemaining: number;
  }>;
  databaseSnapshot: {
    databaseProvider: string;
    generatedAt: string;
    counts: {
      shops: number;
      users: number;
      customers: number;
      devices: number;
      jobs: number;
      invoices: number;
      paymentClaims: number;
      notifications: number;
      auditLogs: number;
    };
  };
}

export function formatDateSafe(iso?: string | null): string {
  if (!iso) return '—';
  const ts = new Date(iso).getTime();
  return Number.isNaN(ts) ? '—' : new Date(ts).toLocaleDateString();
}

export function formatDateTimeSafe(iso?: string | null): string {
  if (!iso) return '—';
  const ts = new Date(iso).getTime();
  return Number.isNaN(ts) ? '—' : new Date(ts).toLocaleString();
}

export function formatInr(amount?: number | null): string {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

export function computeDaysRemaining(iso?: string | null): number {
  if (!iso) return 0;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return 0;
  return Math.ceil((ts - Date.now()) / (24 * 60 * 60 * 1000));
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>): void {
  const escapeCell = (cell: string | number | boolean | null | undefined) => {
    const str = cell === null || cell === undefined ? '' : String(cell);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const csvLines = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const SHOP_ROLE_OPTIONS = [
  { id: 'ROLE_OWNER', label: 'Shop Owner' },
  { id: 'ROLE_RECEPTION', label: 'Front Desk / Reception' },
  { id: 'ROLE_TECHNICIAN', label: 'Technician' },
  { id: 'ROLE_ACCOUNTS', label: 'Accounts / Billing' },
] as const;

export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (!digits) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildCredentialShareMessage(params: {
  shopName: string;
  shopSlug: string;
  username: string;
  password: string;
  pinCode?: string | null;
}): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ktech-service-management.vercel.app';
  const lines = [
    `*K-Connect Workshop Login Credentials*`,
    `Shop: ${params.shopName}`,
    `Portal Link: ${origin}/shop/${params.shopSlug}`,
    `Shop Slug: ${params.shopSlug}`,
    `Username: ${params.username}`,
    `Password: ${params.password}`,
  ];
  if (params.pinCode) {
    lines.push(`Quick Bench PIN: ${params.pinCode}`);
  }
  lines.push(`Please keep these credentials safe.`);
  return lines.join('\n');
}

export interface PasswordResetRequestItem {
  id: string;
  accountType: 'SHOP_USER' | 'SUPER_ADMIN';
  userId: string;
  shopId?: string | null;
  shopName: string;
  shopSlug?: string | null;
  shopPhone?: string | null;
  username: string;
  fullName: string;
  roleId: string;
  phone?: string | null;
  requestedIdentifier?: string | null;
  otp: string;
  resetUrl: string;
  deliveryChannel: 'EMAIL' | 'SUPPORT_QUEUE' | string;
  status: 'PENDING' | 'USED' | 'CANCELLED' | string;
  attempts: number;
  expiresAt: string;
  createdAt: string;
}

export function buildResetShareMessage(params: {
  shopName?: string;
  username: string;
  otp: string;
  resetUrl: string;
  expiresInMinutes?: number;
}): string {
  const lines = [
    `*K-Connect Password Reset Verification*`,
    params.shopName ? `Shop: ${params.shopName}` : null,
    `Username: @${params.username}`,
    `6-Digit Code: ${params.otp}`,
    params.resetUrl ? `Reset Link: ${params.resetUrl}` : null,
    `Valid for ${params.expiresInMinutes || 15} minutes.`,
  ].filter(Boolean);
  return lines.join('\n');
}
