import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Building2,
  Plus,
  Search,
  LogOut,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Clock,
  IndianRupee,
  Settings as SettingsIcon,
  FileText,
  CreditCard,
  RefreshCw,
  KeyRound,
  Trash2,
  Bell,
  Database,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  X,
  AlertTriangle,
  Users,
  BarChart3,
  Download,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { saasApi } from '../../api/client.ts';
import { ShopItem, PlatformAnalyticsData, downloadCsv, formatDateSafe } from './adminTypes.ts';
import { ShopLoginsTab } from './ShopLoginsTab.tsx';
import { CustomersDirectoryTab, CustomerDossierModal } from './CustomersDirectoryTab.tsx';
import { AnalyticsTab } from './AnalyticsTab.tsx';
import { ShopInspectorModal } from './ShopInspectorModal.tsx';

interface ShopUserAccount {
  id: string;
  username: string;
  fullName: string;
  roleId: string;
  roleName: string;
  phone: string;
  pinCode?: string;
  isActive: boolean;
  createdAt: string;
}

interface ResetCredentialResult {
  shopId: string;
  shopName: string;
  shopSlug: string;
  userId: string;
  username: string;
  fullName: string;
  phone?: string;
  temporaryPassword: string;
  pinCode: string;
}

interface PaymentClaimItem {
  id: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  ownerName: string;
  shopPhone: string;
  planName: string;
  amountInr: number;
  upiTransactionId: string;
  evidenceFilePath?: string | null;
  customerNotes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface AuditLogItem {
  id: string;
  adminName: string;
  adminUsername: string;
  action: string;
  targetEntityType: string;
  targetEntityId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

interface PlanItem {
  id: string;
  code: string;
  name: string;
  description: string;
  price_inr: number;
  billing_interval?: string;
  billing_cycle?: string;
  trial_days: number;
  max_seats: number;
  features: string[];
}

interface VendorNotificationItem {
  id: string;
  channel: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface HealthTelemetry {
  provider: string;
  latencyMs: number;
  status: string;
  environment: string;
}

type AdminTab = 'SHOPS' | 'LOGINS' | 'CUSTOMERS' | 'ANALYTICS' | 'PAYMENTS' | 'SETTINGS' | 'PLANS' | 'AUDIT_LOGS';

const EDITABLE_SETTING_KEYS = [
  'upi_id',
  'payee_name',
  'annual_fee_inr',
  'trial_days',
  'support_phone',
  'support_email',
] as const;

export const SuperAdminDashboard: React.FC = () => {
  const { logout, currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('SHOPS');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [health, setHealth] = useState<HealthTelemetry | null>(null);

  // Metrics
  const [metrics, setMetrics] = useState({
    totalShops: 0,
    activeShops: 0,
    frozenShops: 0,
    expiredShops: 0,
    trialingShops: 0,
    activeSubscriptions: 0,
    pendingPaymentClaims: 0,
    approvedPaymentClaims: 0,
    totalVerifiedRevenueInr: 0,
    totalJobs: 0,
    activeJobs: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalCustomers: 0,
    totalDevices: 0,
    totalShopGmvInr: 0,
    totalShopCollectedInr: 0,
    unreadNotifications: 0,
    databaseProvider: '',
    generatedAt: '',
  });

  // Control Center Deep-Inspectors & Live Analytics
  const [analytics, setAnalytics] = useState<PlatformAnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [inspectedShopId, setInspectedShopId] = useState<string | null>(null);
  const [inspectedCustomerId, setInspectedCustomerId] = useState<string | null>(null);

  // Super-Admin Own Credentials Change Form
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [adminFullName, setAdminFullName] = useState(currentUser?.fullName || '');
  const [isUpdatingAdminPassword, setIsUpdatingAdminPassword] = useState(false);

  // Shops State
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [shopSearch, setShopSearch] = useState('');
  const [shopStatusFilter, setShopStatusFilter] = useState<'ALL' | 'ACTIVE' | 'FROZEN' | 'EXPIRED'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Credentials Recovery Modal State
  const [credentialsModalShop, setCredentialsModalShop] = useState<ShopItem | null>(null);
  const [shopUsers, setShopUsers] = useState<ShopUserAccount[]>([]);
  const [isLoadingShopUsers, setIsLoadingShopUsers] = useState(false);
  const [selectedResetUserId, setSelectedResetUserId] = useState<string>('');
  const [customResetPassword, setCustomResetPassword] = useState('');
  const [customResetPin, setCustomResetPin] = useState('');
  const [isResettingCredentials, setIsResettingCredentials] = useState(false);
  const [resetResult, setResetResult] = useState<ResetCredentialResult | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Delete Shop Modal State
  const [shopToDelete, setShopToDelete] = useState<ShopItem | null>(null);
  const [isDeletingShop, setIsDeletingShop] = useState(false);

  // Payment Verification Queue State
  const [payments, setPayments] = useState<PaymentClaimItem[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [selectedClaimForApproval, setSelectedClaimForApproval] = useState<PaymentClaimItem | null>(null);
  const [selectedClaimForRejection, setSelectedClaimForRejection] = useState<PaymentClaimItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Settings State (no mock defaults — populated strictly from live database)
  const [settings, setSettings] = useState<Record<string, string>>({
    upi_id: '',
    payee_name: '',
    annual_fee_inr: '',
    trial_days: '',
    support_phone: '',
    support_email: '',
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Plans State
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [planNameInput, setPlanNameInput] = useState('');
  const [planPriceInput, setPlanPriceInput] = useState('');
  const [planSeatsInput, setPlanSeatsInput] = useState('');
  const [planFeaturesInput, setPlanFeaturesInput] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Notifications & Inquiries Drawer State
  const [notifications, setNotifications] = useState<VendorNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  // Form states for provisioning shop
  const [newShopName, setNewShopName] = useState('');
  const [newShopSlug, setNewShopSlug] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('Coimbatore');
  const [newMaxSeats, setNewMaxSeats] = useState('5');
  const [newPlan] = useState('PRO_ANNUAL');
  const [newOwnerPassword, setNewOwnerPassword] = useState('admin123');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [metricsRes, shopsRes, notifRes, healthRes] = await Promise.allSettled([
        saasApi.admin.getMetrics(),
        saasApi.admin.listShops(),
        saasApi.admin.listNotifications(),
        saasApi.system.getHealth(),
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value?.success && metricsRes.value.data) {
        setMetrics(metricsRes.value.data);
      }
      if (shopsRes.status === 'fulfilled' && shopsRes.value?.success && shopsRes.value.data) {
        setShops(shopsRes.value.data);
      }
      if (notifRes.status === 'fulfilled' && notifRes.value?.success) {
        setNotifications(notifRes.value.data || []);
        setUnreadCount(Number(notifRes.value.unreadCount || 0));
      }
      if (healthRes.status === 'fulfilled' && healthRes.value?.dependencies?.database) {
        setHealth({
          provider: healthRes.value.dependencies.database.provider || 'LOCAL_SQLITE',
          latencyMs: Number(healthRes.value.dependencies.database.latencyMs || 0),
          status: healthRes.value.dependencies.database.status || 'UP',
          environment: healthRes.value.environment || 'development',
        });
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load super-admin overview:', err);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      const res = await saasApi.admin.listPayments({
        status: paymentFilter,
        search: paymentSearch.trim() || undefined,
      });
      if (res.success && res.data) {
        setPayments(res.data);
      }
    } catch (err) {
      console.error('Failed to load payment claims:', err);
    }
  }, [paymentFilter, paymentSearch]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await saasApi.admin.getSettings();
      if (res.success && Array.isArray(res.data)) {
        const rawMap: Record<string, string> = {};
        for (const item of res.data) {
          rawMap[item.key] = String(item.value ?? '');
        }
        setSettings({
          upi_id: rawMap['payment.upi_id'] ?? rawMap.upi_id ?? '',
          payee_name: rawMap['payment.payee_name'] ?? rawMap.payee_name ?? '',
          annual_fee_inr: rawMap['payment.annual_price_inr'] ?? rawMap.annual_fee_inr ?? '',
          trial_days: rawMap['trial.duration_days'] ?? rawMap.trial_days ?? '',
          support_phone: rawMap['support.phone'] ?? rawMap.support_phone ?? '',
          support_email: rawMap['support.email'] ?? rawMap.support_email ?? '',
        });
        setSettingsLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await saasApi.admin.getAuditLogs({ limit: 60 });
      if (res.success && res.data) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  }, []);

  const loadPlans = useCallback(async () => {
    try {
      const res = await saasApi.admin.listPlans();
      if (res.success && res.data) {
        setPlans(res.data);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const res = await saasApi.admin.getAnalytics();
      if (res.success && res.data) {
        setAnalytics(res.data);
      } else {
        showError(res.error || 'Could not load live K-Connect analytics.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to load live analytics.');
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [showError]);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
      if (activeTab === 'ANALYTICS') await loadAnalytics();
      if (activeTab === 'PAYMENTS') await loadPayments();
      if (activeTab === 'SETTINGS') await loadSettings();
      if (activeTab === 'AUDIT_LOGS') await loadAuditLogs();
      if (activeTab === 'PLANS') await loadPlans();
      showSuccess('Live K-Connect metrics synced from database.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    loadSettings();
  }, [loadData, loadSettings]);

  useEffect(() => {
    if (activeTab === 'ANALYTICS') loadAnalytics();
    if (activeTab === 'PAYMENTS') loadPayments();
    if (activeTab === 'SETTINGS') loadSettings();
    if (activeTab === 'AUDIT_LOGS') loadAuditLogs();
    if (activeTab === 'PLANS') loadPlans();
  }, [activeTab, loadAnalytics, loadPayments, loadSettings, loadAuditLogs, loadPlans]);

  const handleSlugify = (name: string) => {
    setNewShopName(name);
    setNewShopSlug(name.toLowerCase().replace(/[^a-z0-9]/g, ''));
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await saasApi.admin.provisionShop({
        name: newShopName,
        slug: newShopSlug,
        ownerName: newOwnerName,
        phone: newPhone,
        city: newCity,
        maxSeats: Number(newMaxSeats),
        subscriptionPlan: newPlan,
        subscriptionMonths: 12,
        ownerUsername: 'admin',
        ownerPassword: newOwnerPassword,
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        setNewShopName('');
        setNewShopSlug('');
        setNewOwnerName('');
        setNewPhone('');
        setNewOwnerPassword('admin123');
        showSuccess(`Shop "${newShopName}" provisioned and activated.`);
        await loadData();
      } else {
        setFormError(res.error || 'Failed to create shop');
      }
    } catch (err: unknown) {
      setFormError((err as Error).message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFreeze = async (shop: ShopItem) => {
    const nextStatus = shop.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    const confirmMsg =
      nextStatus === 'FROZEN'
        ? `Freeze "${shop.name}"? Staff will be blocked from logging in immediately.`
        : `Reactivate "${shop.name}"? Staff will regain full access immediately.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await saasApi.admin.updateShopStatus(shop.id, { status: nextStatus });
      if (res.success) {
        showSuccess(nextStatus === 'FROZEN' ? `"${shop.name}" frozen.` : `"${shop.name}" reactivated.`);
        await loadData();
      } else {
        showError(res.error || 'Failed to update shop status.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to update shop status.');
    }
  };

  const handleExtendSubscription = async (shop: { id: string; name: string }, days: number) => {
    try {
      const res = await saasApi.admin.extendTrial(shop.id, {
        additionalDays: days,
        reason: `Super Admin extended access by +${days} days`,
      });
      if (res.success) {
        showSuccess(`Extended "${shop.name}" access by +${days} days.`);
        await loadData();
      } else {
        showError(res.error || 'Failed to extend access.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to extend subscription.');
    }
  };

  const openCredentialsModal = async (shop: ShopItem) => {
    setCredentialsModalShop(shop);
    setShopUsers([]);
    setSelectedResetUserId('');
    setCustomResetPassword('');
    setCustomResetPin('');
    setResetResult(null);
    setCopiedCreds(false);
    setIsLoadingShopUsers(true);
    try {
      const res = await saasApi.admin.listShopUsers(shop.id);
      if (res.success && res.data?.users) {
        setShopUsers(res.data.users);
        if (res.data.users.length > 0) {
          setSelectedResetUserId(res.data.users[0].id);
        }
      } else {
        showError(res.error || 'Failed to load shop user accounts.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to fetch shop accounts.');
    } finally {
      setIsLoadingShopUsers(false);
    }
  };

  const handleResetCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialsModalShop) return;
    setIsResettingCredentials(true);
    setCopiedCreds(false);
    try {
      const res = await saasApi.admin.resetShopCredentials(credentialsModalShop.id, {
        userId: selectedResetUserId || undefined,
        newPassword: customResetPassword.trim() || undefined,
        newPin: customResetPin.trim() || undefined,
      });
      if (res.success && res.data) {
        setResetResult(res.data);
        setCustomResetPassword('');
        setCustomResetPin('');
        showSuccess(`Temporary credentials generated for @${res.data.username}.`);
        const refreshUsers = await saasApi.admin.listShopUsers(credentialsModalShop.id);
        if (refreshUsers.success && refreshUsers.data?.users) {
          setShopUsers(refreshUsers.data.users);
        }
      } else {
        showError(res.error || 'Failed to reset credentials.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Credential reset error.');
    } finally {
      setIsResettingCredentials(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!resetResult) return;
    const portalUrl = `${window.location.origin}/shop/${resetResult.shopSlug}`;
    const text = [
      `K-Connect Login Credentials (${resetResult.shopName})`,
      `Portal URL: ${portalUrl}`,
      `Username: ${resetResult.username}`,
      `Temporary Password: ${resetResult.temporaryPassword}`,
      `Quick Staff PIN: ${resetResult.pinCode}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCreds(true);
      showSuccess('Credentials copied to clipboard for WhatsApp/SMS sharing.');
    } catch {
      showError('Clipboard permission denied. Please copy manually.');
    }
  };

  const handleDeleteShopConfirm = async () => {
    if (!shopToDelete) return;
    setIsDeletingShop(true);
    try {
      const res = await saasApi.admin.deleteShop(shopToDelete.id);
      if (res.success) {
        showSuccess(res.message || `Deleted "${shopToDelete.name}".`);
        setShopToDelete(null);
        await loadData();
      } else {
        showError(res.error || 'Failed to delete shop.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Delete request failed.');
    } finally {
      setIsDeletingShop(false);
    }
  };

  const openEditPlanModal = (plan: PlanItem) => {
    setEditingPlan(plan);
    setPlanNameInput(plan.name);
    setPlanPriceInput(String(plan.price_inr));
    setPlanSeatsInput(String(plan.max_seats));
    setPlanFeaturesInput((plan.features || []).join('\n'));
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setIsSavingPlan(true);
    try {
      const features = planFeaturesInput
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const res = await saasApi.admin.updatePlan(editingPlan.id, {
        name: planNameInput.trim(),
        priceInr: Number(planPriceInput),
        maxSeats: Number(planSeatsInput),
        features,
      });
      if (res.success) {
        showSuccess(`Plan "${planNameInput.trim()}" updated.`);
        setEditingPlan(null);
        await loadPlans();
      } else {
        showError(res.error || 'Failed to update plan.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Network error updating plan.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      const res = await saasApi.admin.markNotificationRead(notifId);
      if (res.success) {
        const refreshed = await saasApi.admin.listNotifications();
        if (refreshed.success) {
          setNotifications(refreshed.data || []);
          setUnreadCount(Number(refreshed.unreadCount || 0));
        }
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to update notification.');
    }
  };

  // Payment Verification Handlers
  const handleApprovePayment = async () => {
    if (!selectedClaimForApproval) return;
    setIsProcessingPayment(true);
    try {
      const res = await saasApi.admin.approvePayment(selectedClaimForApproval.id);
      if (res.success) {
        showSuccess(`Approved ₹${selectedClaimForApproval.amountInr} for ${selectedClaimForApproval.shopName}.`);
        setSelectedClaimForApproval(null);
        await Promise.all([loadPayments(), loadData()]);
      } else {
        showError(res.error || 'Approval failed.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Approval network error.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedClaimForRejection) return;
    if (!rejectionReason.trim()) {
      showError('A mandatory rejection reason is required.');
      return;
    }
    setIsProcessingPayment(true);
    try {
      const res = await saasApi.admin.rejectPayment(selectedClaimForRejection.id, {
        reason: rejectionReason.trim(),
      });
      if (res.success) {
        showSuccess(`Rejected claim from ${selectedClaimForRejection.shopName}.`);
        setSelectedClaimForRejection(null);
        setRejectionReason('');
        await Promise.all([loadPayments(), loadData()]);
      } else {
        showError(res.error || 'Rejection failed.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Rejection network error.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Settings Save Handler — strictly submits clean editable keys (never stale canonical duplicates)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsNotice(null);
    try {
      const payload = EDITABLE_SETTING_KEYS.map((key) => ({
        key,
        value: settings[key] ?? '',
      }));
      const res = await saasApi.admin.updateSettings(payload);
      if (res.success) {
        setSettingsNotice('Live commercial & UPI settings saved to database.');
        showSuccess('Commercial & UPI settings saved.');
        await loadSettings();
        setTimeout(() => setSettingsNotice(null), 4000);
      } else {
        showError(res.error || 'Failed to update settings');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Network error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdminPassword) {
      showError('Please enter your current Super-Admin password.');
      return;
    }
    if (newAdminPassword.trim().length < 6) {
      showError('New Super-Admin password must be at least 6 characters.');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      showError('New password and confirmation do not match.');
      return;
    }
    setIsUpdatingAdminPassword(true);
    try {
      const res = await saasApi.admin.updateAdminPassword({
        currentPassword: currentAdminPassword,
        newPassword: newAdminPassword.trim(),
        fullName: adminFullName.trim() || undefined,
      });
      if (res.success) {
        showSuccess('Super-Admin credentials updated safely.');
        setCurrentAdminPassword('');
        setNewAdminPassword('');
        setConfirmAdminPassword('');
      } else {
        showError(res.error || 'Could not update Super-Admin password.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to update Super-Admin password.');
    } finally {
      setIsUpdatingAdminPassword(false);
    }
  };

  const filteredShops = shops.filter((s) => {
    const q = shopSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q) ||
      (s.ownerUsername || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q);
    const matchesStatus = shopStatusFilter === 'ALL' ? true : s.status === shopStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const dbProvider = health?.provider || metrics.databaseProvider || 'LOCAL_SQLITE';
  const isCloudDb = dbProvider === 'TURSO_LIBSQL_CLOUD';

  const filteredPayments = payments.filter((claim) => {
    const q = paymentSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      claim.shopName.toLowerCase().includes(q) ||
      claim.ownerName.toLowerCase().includes(q) ||
      claim.upiTransactionId.toLowerCase().includes(q) ||
      claim.shopPhone.toLowerCase().includes(q) ||
      (claim.customerNotes || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#171717', color: '#ececec', padding: '24px 32px' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              backgroundColor: '#10a37f',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(16, 163, 127, 0.35)',
            }}
          >
            <ShieldCheck size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '21px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px', color: '#f3f3f3' }}>
                K-Connect Super-Admin
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  backgroundColor: 'rgba(16, 163, 127, 0.2)',
                  color: '#10a37f',
                  borderRadius: '9999px',
                  border: '1px solid rgba(16, 163, 127, 0.3)',
                }}
              >
                SUPER ADMIN OWNER
              </span>
              <span
                title={`Database Provider: ${dbProvider}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  backgroundColor: isCloudDb ? 'rgba(16, 163, 127, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                  color: isCloudDb ? '#34d399' : '#fbbf24',
                  border: `1px solid ${isCloudDb ? 'rgba(16, 163, 127, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                }}
              >
                <Database size={12} />
                {isCloudDb ? 'Turso Cloud Live' : 'Local Dev SQLite'}
                {health?.latencyMs ? ` • ${health.latencyMs}ms` : ''}
              </span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#8e8ea0', marginTop: '4px' }}>
              Vendor Control Center • Signed in as {currentUser?.username || 'superadmin'}
              {lastSyncedAt ? ` • Last synced ${lastSyncedAt}` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            title="Sync Live Data from Database"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              backgroundColor: '#262626',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '9999px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: isRefreshing ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : undefined }} />
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </button>

          <button
            type="button"
            onClick={() => setIsAlertsModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              backgroundColor: unreadCount > 0 ? 'rgba(245, 158, 11, 0.14)' : '#262626',
              color: unreadCount > 0 ? '#fbbf24' : '#e2e8f0',
              border: `1px solid ${unreadCount > 0 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.14)'}`,
              borderRadius: '9999px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Bell size={14} />
            Alerts
            {unreadCount > 0 && (
              <span
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#000',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '9999px',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              backgroundColor: '#10a37f',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 163, 127, 0.3)',
            }}
          >
            <Plus size={16} /> Provision New Shop
          </button>

          <button
            type="button"
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              backgroundColor: '#262626',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>

      {/* Environment Notice when viewing Local SQLite */}
      {!isCloudDb && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.28)',
            borderRadius: '12px',
            padding: '10px 16px',
            marginBottom: '20px',
            fontSize: '12.5px',
            color: '#fcd34d',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} />
            <span>
              <strong>Local Dev SQLite Active:</strong> Showing your local workspace database (`./data/ktech-saas.sqlite`). Live production customers on Vercel are stored in Turso Cloud.
            </span>
          </div>
          <a
            href="https://ktech-service-management.vercel.app/admin"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: '#34d399',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '12px',
            }}
          >
            Open Live Production Admin <ExternalLink size={13} />
          </a>
        </div>
      )}

      {/* KPI Cards Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '26px',
        }}
      >
        <div
          onClick={() => setActiveTab('SHOPS')}
          style={{
            backgroundColor: '#262626',
            border: activeTab === 'SHOPS' ? '1px solid #10a37f' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#b4b4b4', fontSize: '12px' }}>
            <span>Active Tenant Shops</span>
            <Building2 size={18} color="#10a37f" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: '#ececec' }}>
            {metrics.activeShops}{' '}
            <span style={{ fontSize: '13.5px', color: '#8e8ea0', fontWeight: 500 }}>/ {metrics.totalShops} total</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#8e8ea0', marginTop: '4px' }}>
            {metrics.trialingShops} in trial • {metrics.frozenShops} frozen • {metrics.expiredShops} expired
          </div>
        </div>

        <div
          onClick={() => {
            setActiveTab('PAYMENTS');
            setPaymentFilter('PENDING');
          }}
          style={{
            backgroundColor: '#262626',
            border: metrics.pendingPaymentClaims > 0 ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '18px 20px',
            cursor: 'pointer',
            boxShadow: metrics.pendingPaymentClaims > 0 ? '0 0 20px rgba(245, 158, 11, 0.15)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#b4b4b4', fontSize: '12px' }}>
            <span>Pending GPay Verifications</span>
            <CreditCard size={18} color={metrics.pendingPaymentClaims > 0 ? '#f59e0b' : '#10a37f'} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: metrics.pendingPaymentClaims > 0 ? '#f59e0b' : '#ececec' }}>
            {metrics.pendingPaymentClaims} claims
          </div>
          <div style={{ fontSize: '11.5px', color: metrics.pendingPaymentClaims > 0 ? '#fbbf24' : '#8e8ea0', marginTop: '4px' }}>
            {metrics.pendingPaymentClaims > 0 ? 'Action required in queue' : 'All claims verified'}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('ANALYTICS')}
          style={{
            backgroundColor: '#262626',
            border: activeTab === 'ANALYTICS' ? '1px solid #10a37f' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '18px 20px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#b4b4b4', fontSize: '12px' }}>
            <span>Collections &amp; Workshop GMV</span>
            <IndianRupee size={18} color="#10a37f" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: '#10a37f' }}>
            ₹{metrics.totalVerifiedRevenueInr.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11.5px', color: '#8e8ea0', marginTop: '4px' }}>
            {metrics.approvedPaymentClaims} paid • GMV ₹{metrics.totalShopGmvInr.toLocaleString('en-IN')}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('CUSTOMERS')}
          style={{
            backgroundColor: '#262626',
            border: activeTab === 'CUSTOMERS' ? '1px solid #10a37f' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '18px 20px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#b4b4b4', fontSize: '12px' }}>
            <span>End Customers &amp; Logins</span>
            <Users size={18} color="#c084fc" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: '#ececec' }}>
            {metrics.totalCustomers}{' '}
            <span style={{ fontSize: '13.5px', color: '#8e8ea0', fontWeight: 500 }}>customers</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#8e8ea0', marginTop: '4px' }}>
            {metrics.activeUsers}/{metrics.totalUsers} logins • {metrics.activeJobs}/{metrics.totalJobs} active jobs
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '12px',
        }}
      >
        <button
          onClick={() => setActiveTab('SHOPS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: activeTab === 'SHOPS' ? '#10a37f' : 'transparent',
            color: activeTab === 'SHOPS' ? '#fff' : '#b4b4b4',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Building2 size={15} /> Tenant Shops ({shops.length})
        </button>

        <button
          onClick={() => setActiveTab('LOGINS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: activeTab === 'LOGINS' ? '#10a37f' : 'transparent',
            color: activeTab === 'LOGINS' ? '#fff' : '#b4b4b4',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <KeyRound size={15} /> Shop Logins &amp; Passwords ({metrics.totalUsers})
        </button>

        <button
          onClick={() => setActiveTab('CUSTOMERS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: activeTab === 'CUSTOMERS' ? '#10a37f' : 'transparent',
            color: activeTab === 'CUSTOMERS' ? '#fff' : '#b4b4b4',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Users size={15} /> Customers ({metrics.totalCustomers})
        </button>

        <button
          onClick={() => setActiveTab('ANALYTICS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: activeTab === 'ANALYTICS' ? '#10a37f' : 'transparent',
            color: activeTab === 'ANALYTICS' ? '#fff' : '#b4b4b4',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <BarChart3 size={15} /> Analytics &amp; Insights
        </button>

        <button
          onClick={() => setActiveTab('PAYMENTS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: activeTab === 'PAYMENTS' ? '#10a37f' : 'transparent',
            color: activeTab === 'PAYMENTS' ? '#fff' : '#b4b4b4',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <CreditCard size={16} /> GPay Verification Queue
          {metrics.pendingPaymentClaims > 0 && (
            <span
              style={{
                backgroundColor: '#f59e0b',
                color: '#000',
                fontSize: '11px',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '10px',
              }}
            >
              {metrics.pendingPaymentClaims}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('SETTINGS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: activeTab === 'SETTINGS' ? '#10a37f' : 'transparent',
            color: activeTab === 'SETTINGS' ? '#fff' : '#b4b4b4',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <SettingsIcon size={16} /> Commercial & UPI Settings
        </button>

        <button
          onClick={() => setActiveTab('PLANS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: activeTab === 'PLANS' ? '#10a37f' : 'transparent',
            color: activeTab === 'PLANS' ? '#fff' : '#b4b4b4',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <FileText size={16} /> Plans & Licences
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_LOGS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: activeTab === 'AUDIT_LOGS' ? '#10a37f' : 'transparent',
            color: activeTab === 'AUDIT_LOGS' ? '#fff' : '#b4b4b4',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Clock size={16} /> Audit Logs
        </button>
      </div>

      {/* TAB 1: SHOPS DIRECTORY */}
      {activeTab === 'SHOPS' && (
        <div style={{ backgroundColor: '#212121', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>Tenant Repair Shops ({filteredShops.length})</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['ALL', 'ACTIVE', 'FROZEN', 'EXPIRED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setShopStatusFilter(st)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: shopStatusFilter === st ? '#10a37f' : '#2f2f2f',
                      color: shopStatusFilter === st ? '#fff' : '#a3a3a3',
                      cursor: 'pointer',
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#171717',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  maxWidth: '300px',
                  width: '100%',
                }}
              >
                <Search size={15} color="#8e8ea0" />
                <input
                  type="text"
                  placeholder="Search shop, username, owner, phone..."
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '12px', width: '100%' }}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `kconnect-shops-${new Date().toISOString().slice(0, 10)}.csv`,
                    ['Shop Name', 'Slug', 'Owner', 'Username', 'Phone', 'City', 'Plan', 'Status', 'Seats', 'Customers', 'Jobs', 'Ends At'],
                    filteredShops.map((s) => [
                      s.name,
                      s.slug,
                      s.ownerName,
                      s.ownerUsername || 'admin',
                      s.phone,
                      s.city,
                      s.subscriptionPlan,
                      s.status,
                      `${s.activeUsersCount}/${s.maxSeats}`,
                      s.totalCustomersCount ?? 0,
                      s.totalJobsCount,
                      formatDateSafe(s.subscriptionEndsAt),
                    ])
                  )
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  backgroundColor: '#262626',
                  color: '#ececec',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Download size={13} /> Export CSV
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#171717', color: '#8e8ea0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '12px 18px' }}>Shop Name & URL Portal</th>
                  <th style={{ padding: '12px 18px' }}>Owner & Login Username</th>
                  <th style={{ padding: '12px 18px' }}>City</th>
                  <th style={{ padding: '12px 18px' }}>Usage & Seats</th>
                  <th style={{ padding: '12px 18px' }}>Subscription / Trial Status</th>
                  <th style={{ padding: '12px 18px' }}>Shop Status</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShops.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '44px 20px', textAlign: 'center', color: '#8e8ea0' }}>
                      No tenant shops matched the active search/filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredShops.map((shop) => {
                    const isFrozen = shop.status === 'FROZEN';
                    const isExpired = shop.status === 'EXPIRED';
                    const endTs = shop.subscriptionEndsAt ? new Date(shop.subscriptionEndsAt).getTime() : NaN;
                    const daysRemaining = Number.isNaN(endTs) ? 0 : Math.ceil((endTs - Date.now()) / (24 * 60 * 60 * 1000));

                    return (
                      <tr
                        key={shop.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                          backgroundColor: isFrozen ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <button
                            type="button"
                            onClick={() => setInspectedShopId(shop.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              fontWeight: 700,
                              color: '#f8fafc',
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontSize: '13.5px',
                            }}
                          >
                            {shop.name}
                          </button>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                            <a
                              href={`/shop/${shop.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '11px',
                                color: '#10a37f',
                                fontFamily: 'monospace',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              /shop/{shop.slug} <ExternalLink size={10} />
                            </a>
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600 }}>{shop.ownerName}</div>
                          <div style={{ fontSize: '11px', color: '#8e8ea0', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>@{shop.ownerUsername || 'admin'}</span>
                            <span>•</span>
                            <span>{shop.phone}</span>
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>{shop.city || '—'}</td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#2f2f2f', fontSize: '11px' }}>
                              {shop.activeUsersCount} / {shop.maxSeats} Seats
                            </span>
                            <span style={{ fontSize: '11px', color: '#8e8ea0' }}>
                              {shop.totalJobsCount} jobs • {shop.totalCustomersCount ?? 0} customers
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: isExpired || daysRemaining <= 0 ? '#ef4444' : daysRemaining < 7 ? '#f59e0b' : '#10a37f',
                              }}
                            >
                              {isFrozen
                                ? 'Suspended'
                                : shop.subscriptionStatus === 'TRIALING'
                                ? `Trial: ${daysRemaining > 0 ? `${daysRemaining}d left` : 'Expired'}`
                                : daysRemaining > 0
                                ? `Active: ${daysRemaining}d left`
                                : 'Expired'}
                            </span>
                            {shop.isComplimentary && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(56, 189, 248, 0.14)',
                                  color: '#38bdf8',
                                  fontWeight: 700,
                                }}
                              >
                                COMP
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#8e8ea0' }}>
                            Ends {formatDateSafe(shop.subscriptionEndsAt)}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: isFrozen
                                ? 'rgba(239, 68, 68, 0.15)'
                                : isExpired
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(16, 163, 127, 0.15)',
                              color: isFrozen ? '#ef4444' : isExpired ? '#f59e0b' : '#10a37f',
                              border: `1px solid ${
                                isFrozen
                                  ? 'rgba(239, 68, 68, 0.3)'
                                  : isExpired
                                  ? 'rgba(245, 158, 11, 0.3)'
                                  : 'rgba(16, 163, 127, 0.3)'
                              }`,
                            }}
                          >
                            {shop.status}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setInspectedShopId(shop.id)}
                              title="Open Full 360° Shop Dossier, Logins, Customers & Actions"
                              style={{
                                padding: '5px 10px',
                                backgroundColor: 'rgba(16, 163, 127, 0.14)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 163, 127, 0.35)',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Eye size={12} /> Inspect
                            </button>

                            <button
                              type="button"
                              onClick={() => openCredentialsModal(shop)}
                              title="View Accounts & Reset Forgotten Password"
                              style={{
                                padding: '5px 9px',
                                backgroundColor: '#2f2f2f',
                                color: '#e2e8f0',
                                border: '1px solid rgba(255, 255, 255, 0.16)',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <KeyRound size={12} /> Credentials
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExtendSubscription(shop, 14)}
                              title="Extend Trial / Access by 14 Days"
                              style={{
                                padding: '5px 9px',
                                backgroundColor: '#2f2f2f',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              +14d
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleFreeze(shop)}
                              style={{
                                padding: '5px 12px',
                                backgroundColor: isFrozen ? '#10a37f' : '#ef4444',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {isFrozen ? <Unlock size={12} /> : <Lock size={12} />}
                              {isFrozen ? 'Unfreeze' : 'Freeze'}
                            </button>

                            {shop.id !== 'shop_ktech' && (
                              <button
                                type="button"
                                onClick={() => setShopToDelete(shop)}
                                title="Delete Tenant Shop"
                                style={{
                                  padding: '5px 8px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                  color: '#f87171',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1B: GLOBAL SHOP LOGINS & PASSWORDS VAULT */}
      {activeTab === 'LOGINS' && (
        <ShopLoginsTab
          shops={shops}
          onInspectShop={(shopId) => setInspectedShopId(shopId)}
          onRefreshParent={loadData}
        />
      )}

      {/* TAB 1C: GLOBAL SHOP CUSTOMERS & 360° DOSSIERS */}
      {activeTab === 'CUSTOMERS' && (
        <CustomersDirectoryTab
          shops={shops}
          onInspectShop={(shopId) => setInspectedShopId(shopId)}
          onSelectCustomer={(customerId) => setInspectedCustomerId(customerId)}
        />
      )}

      {/* TAB 1D: FULL LIVE PLATFORM ANALYTICS */}
      {activeTab === 'ANALYTICS' && (
        <AnalyticsTab
          analytics={analytics}
          isLoading={isLoadingAnalytics}
          onRefresh={loadAnalytics}
          onInspectShop={(shopId) => setInspectedShopId(shopId)}
          onQuickExtendDays={handleExtendSubscription}
        />
      )}

      {/* TAB 2: MANUAL GPAY VERIFICATION QUEUE */}
      {activeTab === 'PAYMENTS' && (
        <div style={{ backgroundColor: '#212121', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                Customer GPay Claims Verification Queue ({filteredPayments.length})
              </div>
              <div style={{ fontSize: '12px', color: '#8e8ea0', marginTop: '2px' }}>
                Verify UPI UTR in your GPay / Bank statement before approving. 1-click approval activates 365 days of annual licence.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#171717',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '5px 10px',
                }}
              >
                <Search size={14} color="#8e8ea0" />
                <input
                  type="text"
                  placeholder="Search shop or UTR..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '12px', width: '160px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setPaymentFilter(filter)}
                    style={{
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: paymentFilter === filter ? '#10a37f' : '#2f2f2f',
                      color: paymentFilter === filter ? '#fff' : '#b4b4b4',
                      cursor: 'pointer',
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `kconnect-payment-claims-${new Date().toISOString().slice(0, 10)}.csv`,
                    ['Claim ID', 'Shop Name', 'Owner', 'Phone', 'Plan', 'Amount (INR)', 'UPI UTR', 'Status', 'Submitted At'],
                    filteredPayments.map((p) => [
                      p.id,
                      p.shopName,
                      p.ownerName,
                      p.shopPhone,
                      p.planName,
                      p.amountInr,
                      p.upiTransactionId,
                      p.status,
                      formatDateSafe(p.createdAt),
                    ])
                  )
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  backgroundColor: '#262626',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#ececec',
                  cursor: 'pointer',
                }}
              >
                <Download size={13} /> Export CSV
              </button>
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#8e8ea0' }}>
              <CreditCard size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontSize: '15px', fontWeight: 600 }}>No claims found in {paymentFilter} state.</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                When customers submit GPay transaction references, they appear here.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#171717', color: '#8e8ea0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '12px 18px' }}>Shop & Owner</th>
                    <th style={{ padding: '12px 18px' }}>Plan & Amount</th>
                    <th style={{ padding: '12px 18px' }}>UPI Transaction ID (UTR)</th>
                    <th style={{ padding: '12px 18px' }}>Customer Notes & Receipt</th>
                    <th style={{ padding: '12px 18px' }}>Submitted Date</th>
                    <th style={{ padding: '12px 18px' }}>Status</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((claim) => (
                    <tr key={claim.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{claim.shopName}</div>
                        <div style={{ fontSize: '11px', color: '#8e8ea0' }}>
                          {claim.ownerName} • {claim.shopPhone}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#10a37f' }}>₹{claim.amountInr.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '11px', color: '#8e8ea0' }}>{claim.planName}</div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#38bdf8',
                            backgroundColor: 'rgba(56, 189, 248, 0.1)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            display: 'inline-block',
                          }}
                        >
                          {claim.upiTransactionId}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', color: '#cbd5e1', maxWidth: '220px' }}>
                        <div>{claim.customerNotes || '—'}</div>
                        {claim.evidenceFilePath && (
                          <a
                            href={claim.evidenceFilePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '4px',
                              fontSize: '11px',
                              color: '#34d399',
                              textDecoration: 'none',
                            }}
                          >
                            View Receipt <ExternalLink size={11} />
                          </a>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', color: '#8e8ea0', fontSize: '12px' }}>
                        {new Date(claim.createdAt).toLocaleString()}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor:
                              claim.status === 'APPROVED'
                                ? 'rgba(16, 163, 127, 0.15)'
                                : claim.status === 'PENDING'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color:
                              claim.status === 'APPROVED'
                                ? '#10a37f'
                                : claim.status === 'PENDING'
                                ? '#f59e0b'
                                : '#ef4444',
                            border: `1px solid ${
                              claim.status === 'APPROVED'
                                ? 'rgba(16, 163, 127, 0.3)'
                                : claim.status === 'PENDING'
                                ? 'rgba(245, 158, 11, 0.3)'
                                : 'rgba(239, 68, 68, 0.3)'
                            }`,
                          }}
                        >
                          {claim.status}
                        </span>
                        {claim.rejectionReason && (
                          <div style={{ fontSize: '10.5px', color: '#ef4444', marginTop: '4px' }}>
                            {claim.rejectionReason}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        {claim.status === 'PENDING' ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              onClick={() => setSelectedClaimForApproval(claim)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#10a37f',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Approve
                            </button>

                            <button
                              onClick={() => setSelectedClaimForRejection(claim)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#8e8ea0' }}>
                            Reviewed {claim.reviewedAt ? new Date(claim.reviewedAt).toLocaleDateString() : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PLATFORM & UPI SETTINGS */}
      {activeTab === 'SETTINGS' && (
        <div style={{ maxWidth: '720px', backgroundColor: '#212121', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '28px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>
              Commercial & Payment Settings
            </h2>
            <p style={{ fontSize: '13px', color: '#8e8ea0', margin: 0 }}>
              Live configuration persisted in database for customer GPay checkout, trial days, and vendor support channels.
            </p>
          </div>

          {settingsNotice && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(16, 163, 127, 0.15)', border: '1px solid rgba(16, 163, 127, 0.3)', color: '#10a37f', fontSize: '12.5px', marginBottom: '20px' }}>
              {settingsNotice}
            </div>
          )}

          {!settingsLoaded ? (
            <div style={{ padding: '24px 0', color: '#8e8ea0', fontSize: '13px' }}>
              Loading live K-Connect configuration...
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                  GPay / UPI ID (Receiving Merchant VPA) *
                </label>
                <input
                  type="text"
                  required
                  value={settings.upi_id}
                  onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#38bdf8', fontSize: '13.5px', fontFamily: 'monospace' }}
                />
                <span style={{ fontSize: '11px', color: '#8e8ea0', marginTop: '4px', display: 'block' }}>
                  Used in dynamic QR code generation during annual subscription checkout.
                </span>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                  Payee / Merchant Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={settings.payee_name}
                  onChange={(e) => setSettings({ ...settings, payee_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#ececec', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                    Annual Subscription Fee (₹ INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={settings.annual_fee_inr}
                    onChange={(e) => setSettings({ ...settings, annual_fee_inr: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#10a37f', fontSize: '14px', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                    Trial Period Duration (Days) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="60"
                    value={settings.trial_days}
                    onChange={(e) => setSettings({ ...settings, trial_days: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#ececec', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                    Official Support Phone
                  </label>
                  <input
                    type="text"
                    value={settings.support_phone}
                    onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#ececec', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                    Official Support Email
                  </label>
                  <input
                    type="email"
                    value={settings.support_email}
                    onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#ececec', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#10a37f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 163, 127, 0.3)',
                  }}
                >
                  {isSavingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}

          {/* Super-Admin Account Security Section */}
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <KeyRound size={17} color="#10a37f" />
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#fff' }}>
                Super-Admin Password &amp; Profile Security
              </h3>
            </div>
            <p style={{ fontSize: '12.5px', color: '#8e8ea0', margin: '0 0 16px' }}>
              Signed in as <strong>@{currentUser?.username || 'superadmin'}</strong>. Change your Super-Admin owner password directly here.
            </p>

            <form onSubmit={handleChangeAdminPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '5px' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    placeholder="K-Connect Vendor Owner"
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#ececec', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '5px' }}>
                    Current Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={currentAdminPassword}
                    onChange={(e) => setCurrentAdminPassword(e.target.value)}
                    placeholder="Enter current password"
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#ececec', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '5px' }}>
                    New Password (min 6 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="New strong password"
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#ececec', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '5px' }}>
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmAdminPassword}
                    onChange={(e) => setConfirmAdminPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#ececec', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={isUpdatingAdminPassword}
                  style={{
                    padding: '9px 20px',
                    backgroundColor: '#262626',
                    color: '#34d399',
                    border: '1px solid rgba(16, 163, 127, 0.4)',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {isUpdatingAdminPassword ? 'Updating...' : 'Update Super-Admin Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: PLANS */}
      {activeTab === 'PLANS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {plans.map((plan) => (
            <div key={plan.id} style={{ backgroundColor: '#212121', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#10a37f', letterSpacing: '0.5px' }}>
                    {plan.code}
                  </span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#2f2f2f', color: '#38bdf8' }}>
                    {plan.max_seats} Workstation Seats
                  </span>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>{plan.name}</h3>
                <p style={{ fontSize: '13px', color: '#8e8ea0', margin: '0 0 16px' }}>{plan.description}</p>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#10a37f', marginBottom: '16px' }}>
                  ₹{plan.price_inr.toLocaleString('en-IN')}{' '}
                  <span style={{ fontSize: '13px', color: '#8e8ea0', fontWeight: 500 }}>/ year</span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#b4b4b4', marginBottom: '8px' }}>Included Features:</div>
                <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '12.5px', color: '#d4d4d4', lineHeight: 1.8 }}>
                  {plan.features.map((feat, idx) => (
                    <li key={idx}>{feat}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => openEditPlanModal(plan)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    backgroundColor: '#2f2f2f',
                    color: '#e2e8f0',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Edit3 size={13} /> Edit Plan Pricing & Features
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'AUDIT_LOGS' && (
        <div style={{ backgroundColor: '#212121', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>Super-Admin Administrative Audit Trail</div>
            <div style={{ fontSize: '12px', color: '#8e8ea0', marginTop: '2px' }}>
              Immutable record of sensitive system actions, credential resets, approvals, shop suspensions and trial extensions.
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#171717', color: '#8e8ea0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '12px 18px' }}>Timestamp</th>
                  <th style={{ padding: '12px 18px' }}>Administrator</th>
                  <th style={{ padding: '12px 18px' }}>Action</th>
                  <th style={{ padding: '12px 18px' }}>Target Entity</th>
                  <th style={{ padding: '12px 18px' }}>Audit Details</th>
                  <th style={{ padding: '12px 18px' }}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px 18px', textAlign: 'center', color: '#8e8ea0' }}>
                      No administrative audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <td style={{ padding: '12px 18px', color: '#8e8ea0', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 600 }}>{log.adminName}</td>
                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#2f2f2f',
                            color: '#38bdf8',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', color: '#cbd5e1' }}>
                        {log.targetEntityType} ({log.targetEntityId})
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>
                        {JSON.stringify(log.details)}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#8e8ea0' }}>{log.ipAddress}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APPROVE PAYMENT CONFIRMATION MODAL */}
      {selectedClaimForApproval && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 60 }}>
          <div style={{ backgroundColor: '#212121', border: '1px solid rgba(16, 163, 127, 0.4)', borderRadius: '20px', maxWidth: '480px', width: '100%', padding: '28px', boxShadow: '0 30px 80px rgba(0,0,0,0.8)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(16, 163, 127, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10a37f', marginBottom: '16px' }}>
              <CheckCircle size={28} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>
              Confirm Payment Verification
            </h3>
            <p style={{ fontSize: '13px', color: '#8e8ea0', lineHeight: 1.6, margin: '0 0 20px' }}>
              You are manually verifying receipt of <strong>₹{selectedClaimForApproval.amountInr}</strong> from{' '}
              <strong>{selectedClaimForApproval.shopName}</strong> with UPI UTR{' '}
              <strong style={{ color: '#38bdf8' }}>{selectedClaimForApproval.upiTransactionId}</strong>.
            </p>

            <div style={{ backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '14px', fontSize: '12px', color: '#cbd5e1', marginBottom: '20px', lineHeight: 1.6 }}>
              ✓ Extends / activates annual licence for 365 days<br />
              ✓ Immediately unfreezes shop if currently expired<br />
              ✓ Writes immutable admin audit trail record<br />
              ✓ Sends confirmation notification to shop workspace
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedClaimForApproval(null)}
                style={{ padding: '8px 16px', backgroundColor: '#2f2f2f', border: 'none', color: '#fff', borderRadius: '9999px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleApprovePayment}
                style={{ padding: '8px 20px', backgroundColor: '#10a37f', border: 'none', color: '#fff', borderRadius: '9999px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                {isProcessingPayment ? 'Activating...' : 'Approve & Activate 365 Days'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT PAYMENT MODAL */}
      {selectedClaimForRejection && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 60 }}>
          <div style={{ backgroundColor: '#212121', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '20px', maxWidth: '480px', width: '100%', padding: '28px', boxShadow: '0 30px 80px rgba(0,0,0,0.8)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '16px' }}>
              <XCircle size={28} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>
              Reject Payment Claim
            </h3>
            <p style={{ fontSize: '13px', color: '#8e8ea0', lineHeight: 1.6, margin: '0 0 16px' }}>
              Rejecting claim from <strong>{selectedClaimForRejection.shopName}</strong> (UTR:{' '}
              {selectedClaimForRejection.upiTransactionId}). Please enter a clear reason for the customer.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                Rejection Reason *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. UTR number not found in our GPay statement, or incorrect amount received."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedClaimForRejection(null);
                  setRejectionReason('');
                }}
                style={{ padding: '8px 16px', backgroundColor: '#2f2f2f', border: 'none', color: '#fff', borderRadius: '9999px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleRejectPayment}
                style={{ padding: '8px 20px', backgroundColor: '#ef4444', border: 'none', color: '#fff', borderRadius: '9999px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                {isProcessingPayment ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROVISION SHOP MODAL */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}>
          <div style={{ backgroundColor: '#212121', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '20px', maxWidth: '520px', width: '100%', padding: '28px', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.85)' }}>
            <h2 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 4px', color: '#f3f3f3', letterSpacing: '-0.3px' }}>
              Provision New Repair Shop
            </h2>
            <p style={{ fontSize: '13px', color: '#8e8ea0', margin: '0 0 20px' }}>
              Sets up a brand new isolated database workspace and owner credentials in 30 seconds.
            </p>

            {formError && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '12px', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateShop} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                  Shop Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City Laptop Care"
                  value={newShopName}
                  onChange={(e) => handleSlugify(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', color: '#ececec', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                    Shop Slug (URL identifier) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="citylaptop"
                    value={newShopSlug}
                    onChange={(e) => setNewShopSlug(e.target.value.toLowerCase())}
                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', color: '#10a37f', fontSize: '13px', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                    Owner Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ramesh Kumar"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', color: '#ececec', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                    Owner Phone (WhatsApp) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', color: '#ececec', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', color: '#ececec', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                    Allowed Max Seats (PCs/Phones)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newMaxSeats}
                    onChange={(e) => setNewMaxSeats(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', color: '#ececec', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                    Initial Owner Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOwnerPassword}
                    onChange={(e) => setNewOwnerPassword(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', color: '#ececec', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#2f2f2f', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#ececec', borderRadius: '9999px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '8px 20px', backgroundColor: '#10a37f', border: 'none', color: '#fff', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 163, 127, 0.3)' }}
                >
                  {isSubmitting ? 'Provisioning...' : 'Create & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREDENTIALS & PASSWORD RECOVERY MODAL */}
      {credentialsModalShop && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 65 }}>
          <div style={{ backgroundColor: '#212121', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '20px', maxWidth: '620px', width: '100%', padding: '26px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.85)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={18} color="#10a37f" /> Shop Login Credentials — {credentialsModalShop.name}
                </h2>
                <div style={{ fontSize: '12px', color: '#8e8ea0' }}>
                  Shop Portal:{' '}
                  <a
                    href={`/shop/${credentialsModalShop.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#38bdf8', fontFamily: 'monospace', textDecoration: 'none' }}
                  >
                    {window.location.origin}/shop/{credentialsModalShop.slug}
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCredentialsModalShop(null)}
                style={{ background: '#2f2f2f', border: 'none', color: '#cbd5e1', width: '30px', height: '30px', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {isLoadingShopUsers ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#8e8ea0', fontSize: '13px' }}>
                Loading live user accounts for {credentialsModalShop.name}...
              </div>
            ) : (
              <>
                <div style={{ backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.09)', borderRadius: '12px', overflow: 'hidden', marginBottom: '18px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ color: '#8e8ea0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <th style={{ padding: '10px 12px' }}>User & Role</th>
                        <th style={{ padding: '10px 12px' }}>Login Username</th>
                        <th style={{ padding: '10px 12px' }}>Phone</th>
                        <th style={{ padding: '10px 12px' }}>Quick PIN</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Select</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shopUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#8e8ea0' }}>
                            No staff or owner user accounts found for this shop.
                          </td>
                        </tr>
                      ) : (
                        shopUsers.map((u) => {
                          const isSelected = selectedResetUserId === u.id;
                          return (
                            <tr
                              key={u.id}
                              onClick={() => setSelectedResetUserId(u.id)}
                              style={{
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                backgroundColor: isSelected ? 'rgba(16, 163, 127, 0.12)' : 'transparent',
                              }}
                            >
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 700, color: '#f8fafc' }}>{u.fullName}</div>
                                <div style={{ fontSize: '10.5px', color: u.roleId === 'ROLE_OWNER' ? '#10a37f' : '#8e8ea0' }}>
                                  {u.roleName}
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>
                                {u.username}
                              </td>
                              <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>{u.phone || '—'}</td>
                              <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#fbbf24' }}>
                                {u.pinCode || '—'}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                <input
                                  type="radio"
                                  name="resetUser"
                                  checked={isSelected}
                                  onChange={() => setSelectedResetUserId(u.id)}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <form onSubmit={handleResetCredentials} style={{ backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.09)', borderRadius: '12px', padding: '16px', marginBottom: resetResult ? '16px' : '0' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                    Issue New Temporary Password & Quick PIN
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#8e8ea0', marginBottom: '12px' }}>
                    Passwords are stored using salted SHA-256 hashes and cannot be decrypted in plain text. Generate a temporary password below to share with the shop owner.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#b4b4b4', display: 'block', marginBottom: '4px' }}>
                        Custom Password (leave blank to auto-generate)
                      </label>
                      <input
                        type="text"
                        placeholder="Auto-generate 10-char password"
                        value={customResetPassword}
                        onChange={(e) => setCustomResetPassword(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', backgroundColor: '#212121', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '8px', color: '#fff', fontSize: '12.5px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#b4b4b4', display: 'block', marginBottom: '4px' }}>
                        New Quick PIN (optional 4–6 digits)
                      </label>
                      <input
                        type="text"
                        placeholder="Keep existing PIN"
                        value={customResetPin}
                        onChange={(e) => setCustomResetPin(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', backgroundColor: '#212121', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '8px', color: '#fff', fontSize: '12.5px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={isResettingCredentials || shopUsers.length === 0}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#10a37f',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '9999px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {isResettingCredentials ? 'Generating...' : 'Reset Selected User Password'}
                    </button>
                  </div>
                </form>

                {resetResult && (
                  <div style={{ backgroundColor: 'rgba(16, 163, 127, 0.12)', border: '1px solid rgba(16, 163, 127, 0.35)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#34d399' }}>
                        New Login Credentials Ready to Share
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCredentials}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          backgroundColor: '#10a37f',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {copiedCreds ? <Check size={13} /> : <Copy size={13} />}
                        {copiedCreds ? 'Copied' : 'Copy Credentials'}
                      </button>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0', lineHeight: 1.7 }}>
                      <div>Portal: {window.location.origin}/shop/{resetResult.shopSlug}</div>
                      <div>Username: {resetResult.username}</div>
                      <div>Temporary Password: {resetResult.temporaryPassword}</div>
                      <div>Quick PIN: {resetResult.pinCode}</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* DELETE SHOP CONFIRMATION MODAL */}
      {shopToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 70 }}>
          <div style={{ backgroundColor: '#212121', border: '1px solid rgba(239, 68, 68, 0.45)', borderRadius: '20px', maxWidth: '460px', width: '100%', padding: '26px', boxShadow: '0 30px 80px rgba(0,0,0,0.85)' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '14px' }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>
              Delete Tenant Shop Permanently?
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 18px' }}>
              You are about to permanently remove <strong style={{ color: '#fff' }}>{shopToDelete.name}</strong> (
              <code>/{shopToDelete.slug}</code>), including all its jobs, customers, invoices, users, and subscription records. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShopToDelete(null)}
                style={{ padding: '8px 16px', backgroundColor: '#2f2f2f', border: 'none', color: '#fff', borderRadius: '9999px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingShop}
                onClick={handleDeleteShopConfirm}
                style={{ padding: '8px 18px', backgroundColor: '#ef4444', border: 'none', color: '#fff', borderRadius: '9999px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                {isDeletingShop ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PLAN MODAL */}
      {editingPlan && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 65 }}>
          <div style={{ backgroundColor: '#212121', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '20px', maxWidth: '500px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>
                Edit Subscription Plan ({editingPlan.code})
              </h3>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                style={{ background: '#2f2f2f', border: 'none', color: '#cbd5e1', width: '28px', height: '28px', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '5px' }}>
                  Plan Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={planNameInput}
                  onChange={(e) => setPlanNameInput(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#fff', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '5px' }}>
                    Annual Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={planPriceInput}
                    onChange={(e) => setPlanPriceInput(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#10a37f', fontSize: '13.5px', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '5px' }}>
                    Max Workstation Seats *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="200"
                    value={planSeatsInput}
                    onChange={(e) => setPlanSeatsInput(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#fff', fontSize: '13.5px' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '5px' }}>
                  Included Features (one per line)
                </label>
                <textarea
                  rows={5}
                  value={planFeaturesInput}
                  onChange={(e) => setPlanFeaturesInput(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', backgroundColor: '#171717', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: '#e2e8f0', fontSize: '12.5px', lineHeight: 1.5 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  style={{ padding: '8px 16px', backgroundColor: '#2f2f2f', border: 'none', color: '#fff', borderRadius: '9999px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  style={{ padding: '8px 18px', backgroundColor: '#10a37f', border: 'none', color: '#fff', borderRadius: '9999px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSavingPlan ? 'Saving...' : 'Save Plan Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VENDOR ALERTS & INQUIRIES MODAL */}
      {isAlertsModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 65 }}>
          <div style={{ backgroundColor: '#212121', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '20px', maxWidth: '600px', width: '100%', padding: '26px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', color: '#fff' }}>
                  Vendor Alerts & Sales Inquiries
                </h3>
                <div style={{ fontSize: '12px', color: '#8e8ea0' }}>
                  Live inquiries submitted from the public landing page and billing alerts.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleMarkNotificationRead('mark-all-read')}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#2f2f2f',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#34d399',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Mark All Read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAlertsModalOpen(false)}
                  style={{ background: '#2f2f2f', border: 'none', color: '#cbd5e1', width: '30px', height: '30px', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8e8ea0', fontSize: '13px' }}>
                No vendor alerts or public inquiries right now.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      backgroundColor: n.isRead ? '#171717' : 'rgba(245, 158, 11, 0.08)',
                      border: `1px solid ${n.isRead ? 'rgba(255, 255, 255, 0.08)' : 'rgba(245, 158, 11, 0.3)'}`,
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{n.title}</span>
                        {!n.isRead && (
                          <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#f59e0b', color: '#000', padding: '1px 6px', borderRadius: '9999px' }}>
                            NEW
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.5 }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8e8ea0', marginTop: '6px' }}>
                        {new Date(n.createdAt).toLocaleString()} • {n.channel}
                      </div>
                    </div>

                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkNotificationRead(n.id)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: '#2f2f2f',
                          border: 'none',
                          color: '#e2e8f0',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ShopInspectorModal
        shopId={inspectedShopId}
        onClose={() => setInspectedShopId(null)}
        onShopUpdated={() => {
          loadData();
          if (activeTab === 'ANALYTICS') loadAnalytics();
        }}
        onSelectCustomer={(customerId) => setInspectedCustomerId(customerId)}
      />

      <CustomerDossierModal
        customerId={inspectedCustomerId}
        onClose={() => setInspectedCustomerId(null)}
        onInspectShop={(shopId) => setInspectedShopId(shopId)}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
