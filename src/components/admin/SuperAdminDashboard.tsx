import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Wrench,
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { saasApi } from '../../api/client.ts';

interface ShopItem {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  phone: string;
  email?: string;
  gstin?: string;
  city: string;
  state: string;
  status: 'ACTIVE' | 'FROZEN' | 'EXPIRED';
  subscriptionStatus: string;
  trialEndsAt?: string;
  currentPeriodEndsAt?: string;
  isComplimentary?: boolean;
  maxSeats: number;
  activeUsersCount: number;
  totalJobsCount: number;
  subscriptionPlan: string;
  subscriptionEndsAt: string;
  createdAt: string;
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
  billing_interval: string;
  trial_days: number;
  max_seats: number;
  features: string[];
}

type AdminTab = 'SHOPS' | 'PAYMENTS' | 'SETTINGS' | 'PLANS' | 'AUDIT_LOGS';

export const SuperAdminDashboard: React.FC = () => {
  const { logout, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('SHOPS');

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
    totalUsers: 0,
  });

  // Shops State
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [shopSearch, setShopSearch] = useState('');
  const [shopStatusFilter, setShopStatusFilter] = useState<'ALL' | 'ACTIVE' | 'FROZEN' | 'EXPIRED'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Payment Verification Queue State
  const [payments, setPayments] = useState<PaymentClaimItem[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [selectedClaimForApproval, setSelectedClaimForApproval] = useState<PaymentClaimItem | null>(null);
  const [selectedClaimForRejection, setSelectedClaimForRejection] = useState<PaymentClaimItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<Record<string, string>>({
    upi_id: 'ktech@upi',
    payee_name: 'K-Connect Cloud SaaS Technologies',
    annual_fee_inr: '14999',
    trial_days: '14',
    support_phone: '+91 98765 43210',
    support_email: 'support@kconnect.in',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Plans State
  const [plans, setPlans] = useState<PlanItem[]>([]);

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

  const loadData = async () => {
    try {
      const [metricsRes, shopsRes] = await Promise.all([
        saasApi.admin.getMetrics(),
        saasApi.admin.listShops(),
      ]);

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
      if (shopsRes.success && shopsRes.data) {
        setShops(shopsRes.data);
      }
    } catch (err) {
      console.error('Failed to load super-admin overview:', err);
    }
  };

  const loadPayments = async () => {
    try {
      const res = await saasApi.admin.listPayments({ status: paymentFilter });
      if (res.success && res.data) {
        setPayments(res.data);
      }
    } catch (err) {
      console.error('Failed to load payment claims:', err);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await saasApi.admin.getSettings();
      if (res.success && res.data) {
        const map: Record<string, string> = {};
        for (const item of res.data) {
          map[item.key] = item.value;
        }
        setSettings((prev) => ({ ...prev, ...map }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await saasApi.admin.getAuditLogs({ limit: 60 });
      if (res.success && res.data) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const loadPlans = async () => {
    try {
      const res = await saasApi.admin.listPlans();
      if (res.success && res.data) {
        setPlans(res.data);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'PAYMENTS') loadPayments();
    if (activeTab === 'SETTINGS') loadSettings();
    if (activeTab === 'AUDIT_LOGS') loadAuditLogs();
    if (activeTab === 'PLANS') loadPlans();
  }, [activeTab, paymentFilter]);

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
        await loadData();
      } else {
        setFormError(res.error || 'Failed to create shop');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error');
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
        await loadData();
      }
    } catch (err) {
      alert('Failed to update shop status.');
    }
  };

  const handleExtendSubscription = async (shopId: string, days: number) => {
    try {
      const res = await saasApi.admin.updateShopStatus(shopId, { extendDays: days });
      if (res.success) {
        await loadData();
      }
    } catch (err) {
      alert('Failed to extend subscription.');
    }
  };

  // Payment Verification Handlers
  const handleApprovePayment = async () => {
    if (!selectedClaimForApproval) return;
    setIsProcessingPayment(true);
    try {
      const res = await saasApi.admin.approvePayment(selectedClaimForApproval.id);
      if (res.success) {
        setSelectedClaimForApproval(null);
        await Promise.all([loadPayments(), loadData()]);
      } else {
        alert(res.error || 'Approval failed.');
      }
    } catch (err: any) {
      alert(err.message || 'Approval network error.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedClaimForRejection) return;
    if (!rejectionReason.trim()) {
      alert('A mandatory rejection reason is required.');
      return;
    }
    setIsProcessingPayment(true);
    try {
      const res = await saasApi.admin.rejectPayment(selectedClaimForRejection.id, {
        reason: rejectionReason.trim(),
      });
      if (res.success) {
        setSelectedClaimForRejection(null);
        setRejectionReason('');
        await Promise.all([loadPayments(), loadData()]);
      } else {
        alert(res.error || 'Rejection failed.');
      }
    } catch (err: any) {
      alert(err.message || 'Rejection network error.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Settings Save Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsNotice(null);
    try {
      const payload = Object.entries(settings).map(([key, value]) => ({ key, value }));
      const res = await saasApi.admin.updateSettings(payload);
      if (res.success) {
        setSettingsNotice('Platform settings updated successfully.');
        setTimeout(() => setSettingsNotice(null), 4000);
      } else {
        alert(res.error || 'Failed to update settings');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const filteredShops = shops.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(shopSearch.toLowerCase()) ||
      s.slug.toLowerCase().includes(shopSearch.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(shopSearch.toLowerCase()) ||
      s.phone.includes(shopSearch);
    const matchesStatus = shopStatusFilter === 'ALL' ? true : s.status === shopStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#171717', color: '#ececec', padding: '24px 32px' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                PLATFORM OWNER
              </span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#8e8ea0', marginTop: '3px' }}>
              Vendor Control Center • Signed in as {currentUser?.username || 'Super Admin'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
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
            {metrics.trialingShops} in 14-day trial • {metrics.frozenShops} frozen
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
          style={{
            backgroundColor: '#262626',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#b4b4b4', fontSize: '12px' }}>
            <span>Verified Annual Collections</span>
            <IndianRupee size={18} color="#10a37f" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: '#10a37f' }}>
            ₹{metrics.totalVerifiedRevenueInr.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11.5px', color: '#8e8ea0', marginTop: '4px' }}>
            {metrics.approvedPaymentClaims} verified annual subscriptions
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#262626',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#b4b4b4', fontSize: '12px' }}>
            <span>Platform Activity</span>
            <Wrench size={18} color="#c084fc" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: '#ececec' }}>
            {metrics.totalJobs} <span style={{ fontSize: '13.5px', color: '#8e8ea0', fontWeight: 500 }}>jobs</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#8e8ea0', marginTop: '4px' }}>
            Across {metrics.totalUsers} registered technician & owner accounts
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
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
            padding: '8px 18px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: activeTab === 'SHOPS' ? '#10a37f' : 'transparent',
            color: activeTab === 'SHOPS' ? '#fff' : '#b4b4b4',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Building2 size={16} /> Tenant Shops ({shops.length})
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
          <SettingsIcon size={16} /> Platform & UPI Settings
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                placeholder="Search shop, owner, phone..."
                value={shopSearch}
                onChange={(e) => setShopSearch(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '12px', width: '100%' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#171717', color: '#8e8ea0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ padding: '12px 18px' }}>Shop Name & URL Slug</th>
                  <th style={{ padding: '12px 18px' }}>Owner & Contact</th>
                  <th style={{ padding: '12px 18px' }}>City</th>
                  <th style={{ padding: '12px 18px' }}>Seats & Jobs</th>
                  <th style={{ padding: '12px 18px' }}>Subscription / Trial Status</th>
                  <th style={{ padding: '12px 18px' }}>Shop Status</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShops.map((shop) => {
                  const isFrozen = shop.status === 'FROZEN';
                  const daysRemaining = Math.round(
                    (new Date(shop.subscriptionEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                  );

                  return (
                    <tr
                      key={shop.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        backgroundColor: isFrozen ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{shop.name}</div>
                        <div style={{ fontSize: '11px', color: '#10a37f', fontFamily: 'monospace', marginTop: '2px' }}>
                          slug: /{shop.slug}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div>{shop.ownerName}</div>
                        <div style={{ fontSize: '11px', color: '#8e8ea0', marginTop: '2px' }}>{shop.phone}</div>
                      </td>

                      <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>{shop.city}</td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#2f2f2f', fontSize: '11px' }}>
                            {shop.activeUsersCount} / {shop.maxSeats} Seats
                          </span>
                          <span style={{ fontSize: '11px', color: '#8e8ea0' }}>{shop.totalJobsCount} jobs</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: daysRemaining < 7 ? '#f59e0b' : '#10a37f' }}>
                          {shop.subscriptionStatus === 'TRIALING'
                            ? `Trial: ${daysRemaining > 0 ? `${daysRemaining}d left` : 'Expired'}`
                            : daysRemaining > 0
                            ? `Active: ${daysRemaining}d left`
                            : 'Expired'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#8e8ea0' }}>
                          Ends {new Date(shop.subscriptionEndsAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: isFrozen ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 163, 127, 0.15)',
                            color: isFrozen ? '#ef4444' : '#10a37f',
                            border: `1px solid ${isFrozen ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 163, 127, 0.3)'}`,
                          }}
                        >
                          {shop.status}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => handleExtendSubscription(shop.id, 14)}
                            title="Extend 14 Days"
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
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {isFrozen ? <Unlock size={12} /> : <Lock size={12} />}
                            {isFrozen ? 'Unfreeze' : 'Freeze'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
                Customer GPay Claims Verification Queue
              </div>
              <div style={{ fontSize: '12px', color: '#8e8ea0', marginTop: '2px' }}>
                Verify UPI UTR in your GPay / Bank statement before approving. 1-click approval activates 365 days of annual licence.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
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
          </div>

          {payments.length === 0 ? (
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
                    <th style={{ padding: '12px 18px' }}>Customer Notes</th>
                    <th style={{ padding: '12px 18px' }}>Submitted Date</th>
                    <th style={{ padding: '12px 18px' }}>Status</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((claim) => (
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

                      <td style={{ padding: '14px 18px', color: '#cbd5e1', maxWidth: '200px' }}>
                        {claim.customerNotes || '—'}
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
              Platform Commercial & Payment Settings
            </h2>
            <p style={{ fontSize: '13px', color: '#8e8ea0', margin: 0 }}>
              These values configure the customer GPay checkout page and subscription parameters platform-wide.
            </p>
          </div>

          {settingsNotice && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(16, 163, 127, 0.15)', border: '1px solid rgba(16, 163, 127, 0.3)', color: '#10a37f', fontSize: '12.5px', marginBottom: '20px' }}>
              {settingsNotice}
            </div>
          )}

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#b4b4b4', display: 'block', marginBottom: '6px' }}>
                GPay / UPI ID (Receiving Merchant VPA) *
              </label>
              <input
                type="text"
                required
                value={settings.upi_id || ''}
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
                value={settings.payee_name || ''}
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
                  value={settings.annual_fee_inr || ''}
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
                  value={settings.trial_days || '14'}
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
                  value={settings.support_phone || ''}
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
                  value={settings.support_email || ''}
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
        </div>
      )}

      {/* TAB 4: PLANS */}
      {activeTab === 'PLANS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {plans.map((plan) => (
            <div key={plan.id} style={{ backgroundColor: '#212121', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '16px', padding: '24px' }}>
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
          ))}
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'AUDIT_LOGS' && (
        <div style={{ backgroundColor: '#212121', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>Super-Admin Administrative Audit Trail</div>
            <div style={{ fontSize: '12px', color: '#8e8ea0', marginTop: '2px' }}>
              Immutable record of sensitive platform actions, approvals, shop suspensions and trial extensions.
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
                {auditLogs.map((log) => (
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
                ))}
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
    </div>
  );
};
