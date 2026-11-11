import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  ExternalLink,
  Clock,
  Lock,
  Unlock,
  KeyRound,
  Users,
  Wrench,
  CreditCard,
  Save,
  Gift,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  MessageCircle,
  UserCheck,
  UserX,
  ShieldAlert,
} from 'lucide-react';
import { saasApi, getAuthToken, setAuthToken, setShopSlug } from '../../api/client.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { AdminDialog } from './AdminDialog.tsx';
import {
  ShopDossier,
  ShopUserAccount,
  RevealedCredentialPayload,
  SHOP_ROLE_OPTIONS,
  buildCredentialShareMessage,
  buildWhatsAppUrl,
  computeDaysRemaining,
  formatDateSafe,
  formatInr,
} from './adminTypes.ts';

interface ShopInspectorModalProps {
  shopId: string | null;
  onClose: () => void;
  onShopUpdated: () => void;
  onSelectCustomer: (customerId: string) => void;
}

type InspectorSubTab = 'OVERVIEW' | 'LOGINS' | 'CUSTOMERS' | 'JOBS' | 'BILLING';

/**
 * 360-degree Shop Inspector Modal allowing non-developer Super-Admins to inspect
 * every shop record (profile, logins + password reveal/creation/reset, customers,
 * repair jobs, UPI claims) and execute all lifecycle actions without touching the DB.
 */
export const ShopInspectorModal: React.FC<ShopInspectorModalProps> = ({
  shopId,
  onClose,
  onShopUpdated,
  onSelectCustomer,
}) => {
  const { showSuccess, showError } = useToast();

  const [dossier, setDossier] = useState<ShopDossier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subTab, setSubTab] = useState<InspectorSubTab>('OVERVIEW');

  // Edit profile form
  const [editName, setEditName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [editMaxSeats, setEditMaxSeats] = useState('5');
  const [editPlan, setEditPlan] = useState('PRO_ANNUAL');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Complimentary grant state
  const [compMonths, setCompMonths] = useState('3');
  const [compReason, setCompReason] = useState('VIP Partner Support Grant');
  const [isGrantingComp, setIsGrantingComp] = useState(false);

  // Logins tab state
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, RevealedCredentialPayload>>({});
  const [loadingRevealId, setLoadingRevealId] = useState<string | null>(null);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRoleId, setNewRoleId] = useState('ROLE_TECHNICIAN');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPin, setNewPin] = useState('1234');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Inline password reset form for a user
  const [resetUserTarget, setResetUserTarget] = useState<ShopUserAccount | null>(null);
  const [resetPassInput, setResetPassInput] = useState('');
  const [resetPinInput, setResetPinInput] = useState('');
  const [isResettingUser, setIsResettingUser] = useState(false);

  const loadDossier = useCallback(async () => {
    if (!shopId) {
      setDossier(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await saasApi.admin.getShopDetail(shopId);
      if (res.success && res.data) {
        const d: ShopDossier = res.data;
        setDossier(d);
        setEditName(d.name || '');
        setEditOwnerName(d.ownerName || '');
        setEditPhone(d.phone || '');
        setEditEmail(d.email || '');
        setEditGstin(d.gstin || '');
        setEditAddress(d.address || '');
        setEditCity(d.city || '');
        setEditState(d.state || '');
        setEditPincode(d.pincode || '');
        setEditMaxSeats(String(d.maxSeats || 5));
        setEditPlan(d.subscriptionPlan || 'PRO_ANNUAL');
      } else {
        showError(res.error || 'Could not load shop dossier.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to load shop dossier.');
    } finally {
      setIsLoading(false);
    }
  }, [shopId, showError]);

  useEffect(() => {
    setSubTab('OVERVIEW');
    setRevealedPasswords({});
    setResetUserTarget(null);
    setShowAddUser(false);
    loadDossier();
  }, [loadDossier]);

  const daysRemaining = dossier ? computeDaysRemaining(dossier.subscriptionEndsAt) : 0;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossier) return;
    setIsSavingProfile(true);
    try {
      const res = await saasApi.admin.updateShop(dossier.id, {
        name: editName.trim(),
        ownerName: editOwnerName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || null,
        gstin: editGstin.trim() || null,
        address: editAddress.trim(),
        city: editCity.trim(),
        state: editState.trim(),
        pincode: editPincode.trim() || null,
        maxSeats: Number(editMaxSeats) || 5,
        subscriptionPlan: editPlan.trim(),
      });
      if (res.success) {
        showSuccess('Shop profile & seat limits saved.');
        await loadDossier();
        onShopUpdated();
      } else {
        showError(res.error || 'Could not update shop.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to save shop profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleExtendDays = async (days: number) => {
    if (!dossier) return;
    try {
      const res = await saasApi.admin.extendTrial(dossier.id, {
        additionalDays: days,
        reason: `Super-Admin +${days} days grant from Shop Inspector`,
      });
      if (res.success) {
        showSuccess(`Extended ${dossier.name} by +${days} days.`);
        await loadDossier();
        onShopUpdated();
      } else {
        showError(res.error || 'Could not extend days.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to extend subscription.');
    }
  };

  const handleToggleFreeze = async () => {
    if (!dossier) return;
    const nextStatus = dossier.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN';
    try {
      const res = await saasApi.admin.updateShopStatus(dossier.id, { status: nextStatus });
      if (res.success) {
        showSuccess(`${dossier.name} status updated to ${nextStatus}.`);
        await loadDossier();
        onShopUpdated();
      } else {
        showError(res.error || 'Failed to change shop status.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Could not toggle shop status.');
    }
  };

  const handleGrantComplimentary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossier) return;
    setIsGrantingComp(true);
    try {
      const res = await saasApi.admin.grantComplimentary(dossier.id, {
        months: Math.max(1, Number(compMonths) || 1),
        reason: compReason.trim() || 'Super-Admin Complimentary Grant',
      });
      if (res.success) {
        showSuccess(`Granted ${compMonths} complimentary month(s) to ${dossier.name}.`);
        await loadDossier();
        onShopUpdated();
      } else {
        showError(res.error || 'Could not grant complimentary access.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to grant complimentary access.');
    } finally {
      setIsGrantingComp(false);
    }
  };

  const handleSupportLogin = async (targetUserId?: string) => {
    if (!dossier) return;
    try {
      const currentAdminToken = getAuthToken();
      const res = await saasApi.admin.impersonateShop(dossier.id, targetUserId);
      if (res.success && res.data?.token) {
        if (currentAdminToken) {
          localStorage.setItem('kconnect_superadmin_return_token', currentAdminToken);
        }
        setAuthToken(res.data.token);
        if (res.data.shop?.slug) {
          setShopSlug(res.data.shop.slug);
        }
        window.location.href = '/app';
      } else {
        showError(res.error || 'Could not open support workspace.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Support login failed.');
    }
  };

  const handleRevealPassword = async (user: ShopUserAccount) => {
    if (revealedPasswords[user.id]) {
      setRevealedPasswords((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
      return;
    }
    setLoadingRevealId(user.id);
    try {
      const res = await saasApi.admin.revealUserPassword(user.id);
      if (res.success && res.data) {
        setRevealedPasswords((prev) => ({ ...prev, [user.id]: res.data }));
      } else {
        showError(res.error || 'Legacy hash — click Reset to set a recoverable password.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Could not reveal password.');
    } finally {
      setLoadingRevealId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossier) return;
    setIsCreatingUser(true);
    try {
      const res = await saasApi.admin.createShopUser(dossier.id, {
        username: newUsername.trim().toLowerCase(),
        fullName: newFullName.trim(),
        roleId: newRoleId,
        phone: newPhone.trim() || undefined,
        password: newPassword.trim(),
        pinCode: newPin.trim() || undefined,
      });
      if (res.success && res.data) {
        const created: ShopUserAccount = res.data;
        setRevealedPasswords((prev) => ({
          ...prev,
          [created.id]: {
            userId: created.id,
            shopId: dossier.id,
            shopName: dossier.name,
            shopSlug: dossier.slug,
            username: created.username,
            fullName: created.fullName,
            phone: created.phone,
            password: newPassword.trim(),
            pinCode: created.pinCode,
          },
        }));
        showSuccess(`Added @${created.username} to ${dossier.name}.`);
        setShowAddUser(false);
        setNewUsername('');
        setNewFullName('');
        setNewPhone('');
        setNewPassword('');
        setNewPin('1234');
        await loadDossier();
        onShopUpdated();
      } else {
        showError(res.error || 'Could not create user login.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to add user.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleResetUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossier || !resetUserTarget) return;
    setIsResettingUser(true);
    try {
      const res = await saasApi.admin.resetShopCredentials(dossier.id, {
        userId: resetUserTarget.id,
        newPassword: resetPassInput.trim() || undefined,
        newPin: resetPinInput.trim() || undefined,
      });
      if (res.success && res.data) {
        const cred = res.data;
        setRevealedPasswords((prev) => ({
          ...prev,
          [resetUserTarget.id]: {
            userId: cred.userId,
            shopId: cred.shopId,
            shopName: cred.shopName,
            shopSlug: cred.shopSlug,
            username: cred.username,
            fullName: cred.fullName,
            phone: cred.phone,
            password: cred.temporaryPassword,
            pinCode: cred.pinCode,
          },
        }));
        showSuccess(`Reset credentials saved for @${cred.username}.`);
        setResetUserTarget(null);
        await loadDossier();
      } else {
        showError(res.error || 'Failed to reset credentials.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Could not reset password.');
    } finally {
      setIsResettingUser(false);
    }
  };

  const handleToggleUserStatus = async (user: ShopUserAccount) => {
    try {
      const res = await saasApi.admin.updateUserStatus(user.id, !user.isActive);
      if (res.success) {
        showSuccess(`@${user.username} is now ${!user.isActive ? 'ACTIVE' : 'DISABLED'}.`);
        await loadDossier();
        onShopUpdated();
      } else {
        showError(res.error || 'Could not update user status.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Status update failed.');
    }
  };

  return (
    <AdminDialog
      open={Boolean(shopId)}
      onClose={onClose}
      maxWidth={1040}
      title={
        <>
          <Building2 size={20} color="#10a37f" />
          <span>{dossier ? dossier.name : 'Loading Shop Dossier...'}</span>
          {dossier && (
            <>
              <span
                style={{
                  padding: '2px 9px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor:
                    dossier.status === 'ACTIVE'
                      ? 'rgba(16,163,127,0.18)'
                      : dossier.status === 'FROZEN'
                      ? 'rgba(239,68,68,0.18)'
                      : 'rgba(245,158,11,0.18)',
                  color:
                    dossier.status === 'ACTIVE' ? '#34d399' : dossier.status === 'FROZEN' ? '#f87171' : '#fbbf24',
                }}
              >
                {dossier.status}
              </span>
              <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>
                /shop/{dossier.slug} • {daysRemaining > 0 ? `${daysRemaining}d left` : 'Expired'}
              </span>
            </>
          )}
        </>
      }
      subtitle={
        dossier
          ? `Owner: ${dossier.ownerName} (${dossier.phone}) • Plan: ${dossier.subscriptionPlan} (${dossier.subscriptionStatus})`
          : undefined
      }
      headerExtra={
        dossier ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleSupportLogin()}
                disabled={dossier.status !== 'ACTIVE'}
                title={
                  dossier.status === 'ACTIVE'
                    ? 'Open this shop live workspace as Support Admin'
                    : 'Activate shop before launching Support Mode'
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '9px',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: dossier.status === 'ACTIVE' ? 'pointer' : 'not-allowed',
                  opacity: dossier.status === 'ACTIVE' ? 1 : 0.45,
                }}
              >
                <ExternalLink size={13} /> Open Shop Workspace
              </button>
              <button
                type="button"
                onClick={() => handleExtendDays(14)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 11px',
                  borderRadius: '9px',
                  backgroundColor: 'rgba(16,163,127,0.14)',
                  border: '1px solid rgba(16,163,127,0.35)',
                  color: '#34d399',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Clock size={12} /> +14d
              </button>
              <button
                type="button"
                onClick={() => handleExtendDays(30)}
                style={{
                  padding: '7px 11px',
                  borderRadius: '9px',
                  backgroundColor: 'rgba(16,163,127,0.14)',
                  border: '1px solid rgba(16,163,127,0.35)',
                  color: '#34d399',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                +30d
              </button>
              <button
                type="button"
                onClick={handleToggleFreeze}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 11px',
                  borderRadius: '9px',
                  backgroundColor: dossier.status === 'FROZEN' ? 'rgba(16,163,127,0.16)' : 'rgba(239,68,68,0.16)',
                  border: `1px solid ${dossier.status === 'FROZEN' ? 'rgba(16,163,127,0.35)' : 'rgba(239,68,68,0.35)'}`,
                  color: dossier.status === 'FROZEN' ? '#34d399' : '#f87171',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {dossier.status === 'FROZEN' ? <Unlock size={12} /> : <Lock size={12} />}
                {dossier.status === 'FROZEN' ? 'Activate' : 'Freeze'}
              </button>
              <a
                href={buildWhatsAppUrl(
                  dossier.phone,
                  `Hello ${dossier.ownerName}, reaching out from K-Connect Support regarding ${dossier.name}.`
                )}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 11px',
                  borderRadius: '9px',
                  backgroundColor: 'rgba(37,211,102,0.14)',
                  border: '1px solid rgba(37,211,102,0.3)',
                  color: '#4ade80',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
            </div>

            {/* Sub-Tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(
                [
                  { id: 'OVERVIEW', label: 'Overview & Edit Profile', icon: Building2 },
                  { id: 'LOGINS', label: `Logins (${dossier.users.length})`, icon: KeyRound },
                  { id: 'CUSTOMERS', label: `Customers (${dossier.totalCustomersCount ?? dossier.recentCustomers.length})`, icon: Users },
                  { id: 'JOBS', label: `Repair Jobs (${dossier.totalJobsCount})`, icon: Wrench },
                  { id: 'BILLING', label: `Subscription & Claims (${dossier.paymentClaims.length})`, icon: CreditCard },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = subTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSubTab(tab.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '9999px',
                      border: 'none',
                      backgroundColor: isActive ? '#10a37f' : '#262626',
                      color: isActive ? '#fff' : '#d1d5db',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={14} /> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : undefined
      }
    >

        {isLoading && !dossier ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#8e8ea0' }}>
            Loading complete shop dossier...
          </div>
        ) : dossier ? (
          <>
            {/* SUB-TAB 1: OVERVIEW & PROFILE EDIT */}
            {subTab === 'OVERVIEW' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                  {[
                    { label: 'Active Logins', val: `${dossier.activeUsersCount} / ${dossier.maxSeats} seats` },
                    { label: 'Customers', val: String(dossier.totalCustomersCount ?? 0) },
                    { label: 'Registered Devices', val: String(dossier.totalDevicesCount ?? 0) },
                    { label: 'Open / Total Jobs', val: `${dossier.openJobsCount} / ${dossier.totalJobsCount}` },
                    { label: 'Workshop GMV', val: formatInr(dossier.workshopGmvInr) },
                    { label: 'Collected Revenue', val: formatInr(dossier.collectedInr) },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        backgroundColor: '#121212',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#8e8ea0' }}>{stat.label}</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>{stat.val}</div>
                    </div>
                  ))}
                </div>

                {/* Edit Shop Profile Form */}
                <form
                  onSubmit={handleSaveProfile}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: '#141414',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>Edit Shop Profile, Seat Cap &amp; Plan</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', color: '#9ca3af', marginBottom: '3px' }}>Shop Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', color: '#9ca3af', marginBottom: '3px' }}>Owner Name</label>
                      <input
                        type="text"
                        value={editOwnerName}
                        onChange={(e) => setEditOwnerName(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', color: '#9ca3af', marginBottom: '3px' }}>Phone</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', color: '#9ca3af', marginBottom: '3px' }}>Email</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', color: '#9ca3af', marginBottom: '3px' }}>GSTIN</label>
                      <input
                        type="text"
                        value={editGstin}
                        onChange={(e) => setEditGstin(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', color: '#9ca3af', marginBottom: '3px' }}>Address</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', color: '#9ca3af', marginBottom: '3px' }}>City</label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', color: '#9ca3af', marginBottom: '3px' }}>State</label>
                      <input
                        type="text"
                        value={editState}
                        onChange={(e) => setEditState(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', color: '#9ca3af', marginBottom: '3px' }}>Pincode</label>
                      <input
                        type="text"
                        value={editPincode}
                        onChange={(e) => setEditPincode(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', color: '#9ca3af', marginBottom: '3px' }}>Max Seats</label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={editMaxSeats}
                        onChange={(e) => setEditMaxSeats(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', color: '#9ca3af', marginBottom: '3px' }}>Subscription Plan</label>
                      <input
                        type="text"
                        value={editPlan}
                        onChange={(e) => setEditPlan(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '9px',
                        backgroundColor: '#10a37f',
                        border: 'none',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Save size={14} /> {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>

                {/* Grant Complimentary Access */}
                <form
                  onSubmit={handleGrantComplimentary}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: '#141414',
                    border: '1px solid rgba(16,163,127,0.25)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    alignItems: 'flex-end',
                  }}
                >
                  <div style={{ flex: '0 0 130px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#9ca3af', marginBottom: '3px' }}>
                      Complimentary Months
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={compMonths}
                      onChange={(e) => setCompMonths(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px' }}
                    />
                  </div>
                  <div style={{ flex: '1 1 260px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', color: '#9ca3af', marginBottom: '3px' }}>
                      Reason / Internal Audit Note
                    </label>
                    <input
                      type="text"
                      value={compReason}
                      onChange={(e) => setCompReason(e.target.value)}
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isGrantingComp}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '9px',
                      backgroundColor: 'rgba(16,163,127,0.18)',
                      border: '1px solid rgba(16,163,127,0.4)',
                      color: '#34d399',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Gift size={14} /> {isGrantingComp ? 'Applying...' : 'Grant Free Access'}
                  </button>
                </form>
              </div>
            )}

            {/* SUB-TAB 2: SHOP LOGINS & PASSWORDS */}
            {subTab === 'LOGINS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                    Manage owner &amp; staff credentials for <strong>{dossier.name}</strong>.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddUser((prev) => !prev)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '9px',
                      backgroundColor: '#10a37f',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} /> {showAddUser ? 'Close Add User' : 'Add User to Shop'}
                  </button>
                </div>

                {showAddUser && (
                  <form
                    onSubmit={handleCreateUser}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      backgroundColor: '#141414',
                      border: '1px solid rgba(16,163,127,0.3)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: '10px',
                      alignItems: 'end',
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>Username *</label>
                      <input type="text" required value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="staff1" style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '12.5px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>Full Name *</label>
                      <input type="text" required value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="Staff Name" style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '12.5px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>Role</label>
                      <select value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '12.5px' }}>
                        {SHOP_ROLE_OPTIONS.map((r) => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>Phone</label>
                      <input type="text" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Optional" style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '12.5px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>Password *</label>
                      <input type="text" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 4 chars" style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '12.5px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>Quick PIN</label>
                      <input type="text" value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="4-6 digits" style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '12.5px' }} />
                    </div>
                    <button type="submit" disabled={isCreatingUser} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#10a37f', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '12.5px' }}>
                      {isCreatingUser ? 'Adding...' : 'Save Login'}
                    </button>
                  </form>
                )}

                {resetUserTarget && (
                  <form
                    onSubmit={handleResetUserSubmit}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      backgroundColor: '#141414',
                      border: '1px solid rgba(245,158,11,0.35)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      alignItems: 'end',
                    }}
                  >
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>
                        Reset Password for @{resetUserTarget.username}
                      </div>
                      <input
                        type="text"
                        value={resetPassInput}
                        onChange={(e) => setResetPassInput(e.target.value)}
                        placeholder="New password (leave blank to auto-generate)"
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '12.5px' }}
                      />
                    </div>
                    <div style={{ width: '150px' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>Quick PIN</label>
                      <input
                        type="text"
                        value={resetPinInput}
                        onChange={(e) => setResetPinInput(e.target.value)}
                        placeholder="4-6 digits"
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '12.5px' }}
                      />
                    </div>
                    <button type="submit" disabled={isResettingUser} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#f59e0b', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '12.5px' }}>
                      {isResettingUser ? 'Saving...' : 'Apply Reset'}
                    </button>
                    <button type="button" onClick={() => setResetUserTarget(null)} style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: '#262626', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: '12.5px' }}>
                      Cancel
                    </button>
                  </form>
                )}

                <div style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#141414', color: '#8e8ea0', fontSize: '11px' }}>
                        <th style={{ padding: '10px 12px' }}>User &amp; Role</th>
                        <th style={{ padding: '10px 12px' }}>Quick PIN</th>
                        <th style={{ padding: '10px 12px' }}>Password</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossier.users.map((u) => {
                        const revealed = revealedPasswords[u.id];
                        return (
                          <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: 700, color: '#fff' }}>@{u.username} • {u.fullName}</div>
                              <div style={{ fontSize: '11px', color: '#8e8ea0' }}>{u.roleName} {u.phone ? `• ${u.phone}` : ''}</div>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <code style={{ padding: '2px 7px', borderRadius: '5px', backgroundColor: '#121212', color: '#fbbf24' }}>
                                {u.pinCode || '—'}
                              </code>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {revealed ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <code style={{ padding: '3px 7px', borderRadius: '5px', backgroundColor: 'rgba(16,163,127,0.16)', color: '#6ee7b7', fontWeight: 700 }}>
                                    {revealed.password}
                                  </code>
                                  <button type="button" onClick={() => handleRevealPassword(u)} style={{ background: 'none', border: 'none', color: '#8e8ea0', cursor: 'pointer' }}>
                                    <EyeOff size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await navigator.clipboard.writeText(
                                        buildCredentialShareMessage({
                                          shopName: dossier.name,
                                          shopSlug: dossier.slug,
                                          username: u.username,
                                          password: revealed.password,
                                          pinCode: u.pinCode,
                                        })
                                      );
                                      setCopiedUserId(u.id);
                                      showSuccess(`Copied credentials for @${u.username}`);
                                      window.setTimeout(() => setCopiedUserId(null), 2000);
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer' }}
                                  >
                                    {copiedUserId === u.id ? <Check size={13} /> : <Copy size={13} />}
                                  </button>
                                  <a
                                    href={buildWhatsAppUrl(
                                      u.phone || dossier.phone,
                                      buildCredentialShareMessage({
                                        shopName: dossier.name,
                                        shopSlug: dossier.slug,
                                        username: u.username,
                                        password: revealed.password,
                                        pinCode: u.pinCode,
                                      })
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: '#4ade80' }}
                                  >
                                    <MessageCircle size={13} />
                                  </a>
                                </div>
                              ) : u.hasRecoverablePassword ? (
                                <button
                                  type="button"
                                  disabled={loadingRevealId === u.id}
                                  onClick={() => handleRevealPassword(u)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 9px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(16,163,127,0.14)',
                                    border: '1px solid rgba(16,163,127,0.3)',
                                    color: '#34d399',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Eye size={12} /> {loadingRevealId === u.id ? '...' : 'Show Password'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetUserTarget(u);
                                    setResetPassInput('');
                                    setResetPinInput(u.pinCode || '');
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 9px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(245,158,11,0.12)',
                                    border: '1px solid rgba(245,158,11,0.3)',
                                    color: '#fbbf24',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <ShieldAlert size={12} /> Legacy Hash • Reset
                                </button>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ color: u.isActive ? '#34d399' : '#f87171', fontWeight: 700, fontSize: '11.5px' }}>
                                {u.isActive ? 'ACTIVE' : 'DISABLED'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '5px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetUserTarget(u);
                                    setResetPassInput('');
                                    setResetPinInput(u.pinCode || '');
                                  }}
                                  style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#262626', border: 'none', color: '#ececec', fontSize: '11px', cursor: 'pointer' }}
                                >
                                  Reset
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(u)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: u.isActive ? 'rgba(239,68,68,0.14)' : 'rgba(16,163,127,0.14)',
                                    border: 'none',
                                    color: u.isActive ? '#f87171' : '#34d399',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  {u.isActive ? <UserX size={11} /> : <UserCheck size={11} />}
                                  {u.isActive ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                  type="button"
                                  disabled={!u.isActive || dossier.status !== 'ACTIVE'}
                                  onClick={() => handleSupportLogin(u.id)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(59,130,246,0.16)',
                                    border: 'none',
                                    color: '#93c5fd',
                                    fontSize: '11px',
                                    cursor: u.isActive && dossier.status === 'ACTIVE' ? 'pointer' : 'not-allowed',
                                    opacity: u.isActive && dossier.status === 'ACTIVE' ? 1 : 0.45,
                                  }}
                                >
                                  Open
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

            {/* SUB-TAB 3: SHOP CUSTOMERS */}
            {subTab === 'CUSTOMERS' && (
              <div style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#141414', color: '#8e8ea0', fontSize: '11px' }}>
                      <th style={{ padding: '10px 12px' }}>Customer &amp; Code</th>
                      <th style={{ padding: '10px 12px' }}>Contact</th>
                      <th style={{ padding: '10px 12px' }}>Type</th>
                      <th style={{ padding: '10px 12px' }}>Devices / Jobs</th>
                      <th style={{ padding: '10px 12px' }}>Billed / Paid</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Inspect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossier.recentCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#8e8ea0' }}>
                          No customers registered in this shop yet.
                        </td>
                      </tr>
                    ) : (
                      dossier.recentCustomers.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => onSelectCustomer(c.id)}
                          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                        >
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700, color: '#fff' }}>{c.fullName}</div>
                            <div style={{ fontSize: '11px', color: '#8e8ea0' }}>{c.customerCode}</div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div>{c.primaryPhone}</div>
                            {c.email && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{c.email}</div>}
                          </td>
                          <td style={{ padding: '10px 12px' }}>{c.customerType}</td>
                          <td style={{ padding: '10px 12px' }}>{c.devicesCount} devices • {c.jobsCount} jobs</td>
                          <td style={{ padding: '10px 12px' }}>
                            {formatInr(c.totalInvoicedInr)} <span style={{ color: '#34d399' }}>({formatInr(c.totalPaidInr)})</span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectCustomer(c.id);
                              }}
                              style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(16,163,127,0.16)', border: 'none', color: '#34d399', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              360° Dossier
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* SUB-TAB 4: REPAIR JOBS */}
            {subTab === 'JOBS' && (
              <div style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#141414', color: '#8e8ea0', fontSize: '11px' }}>
                      <th style={{ padding: '10px 12px' }}>Job #</th>
                      <th style={{ padding: '10px 12px' }}>Customer &amp; Device</th>
                      <th style={{ padding: '10px 12px' }}>Reported Issue</th>
                      <th style={{ padding: '10px 12px' }}>Status</th>
                      <th style={{ padding: '10px 12px' }}>Estimate / Deposit</th>
                      <th style={{ padding: '10px 12px' }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossier.recentJobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#8e8ea0' }}>
                          No repair jobs recorded in this shop yet.
                        </td>
                      </tr>
                    ) : (
                      dossier.recentJobs.map((j) => (
                        <tr key={j.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.jobNumber}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 600 }}>{j.customerName} ({j.customerPhone})</div>
                            <div style={{ fontSize: '11px', color: '#8e8ea0' }}>{j.deviceLabel}</div>
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: '240px', color: '#d1d5db' }}>{j.reportedIssue}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '2px 7px', borderRadius: '6px', backgroundColor: 'rgba(16,163,127,0.14)', color: '#34d399', fontSize: '11px', fontWeight: 600 }}>
                              {j.currentStatus}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {formatInr(j.estimatedCost)} <span style={{ color: '#8e8ea0', fontSize: '11px' }}>(adv: {formatInr(j.advanceDeposit)})</span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{formatDateSafe(j.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* SUB-TAB 5: SUBSCRIPTION & CLAIMS */}
            {subTab === 'BILLING' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '11px', color: '#8e8ea0' }}>Subscription Plan &amp; Status</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '3px' }}>
                      {dossier.subscriptionPlan} • {dossier.subscriptionStatus}
                    </div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '11px', color: '#8e8ea0' }}>Access Ends At</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '3px' }}>
                      {formatDateSafe(dossier.subscriptionEndsAt)} ({daysRemaining}d)
                    </div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '11px', color: '#8e8ea0' }}>Complimentary Grant</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '3px', color: dossier.isComplimentary ? '#34d399' : '#9ca3af' }}>
                      {dossier.isComplimentary ? dossier.complimentaryReason || 'Active Free Grant' : 'Standard Billing'}
                    </div>
                  </div>
                </div>

                <div style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#141414', color: '#8e8ea0', fontSize: '11px' }}>
                        <th style={{ padding: '10px 12px' }}>UTR / Reference</th>
                        <th style={{ padding: '10px 12px' }}>Amount</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                        <th style={{ padding: '10px 12px' }}>Notes / Reason</th>
                        <th style={{ padding: '10px 12px' }}>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossier.paymentClaims.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#8e8ea0' }}>
                            No UPI / subscription payment claims submitted by this shop yet.
                          </td>
                        </tr>
                      ) : (
                        dossier.paymentClaims.map((cl) => (
                          <tr key={cl.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700 }}>{cl.upiTransactionId}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700 }}>{formatInr(cl.amountInr)}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span
                                style={{
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor:
                                    cl.status === 'APPROVED'
                                      ? 'rgba(16,163,127,0.16)'
                                      : cl.status === 'REJECTED'
                                      ? 'rgba(239,68,68,0.16)'
                                      : 'rgba(245,158,11,0.16)',
                                  color: cl.status === 'APPROVED' ? '#34d399' : cl.status === 'REJECTED' ? '#f87171' : '#fbbf24',
                                }}
                              >
                                {cl.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#d1d5db' }}>{cl.rejectionReason || cl.customerNotes || '—'}</td>
                            <td style={{ padding: '10px 12px', color: '#9ca3af' }}>{formatDateSafe(cl.createdAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : null}
    </AdminDialog>
  );
};

