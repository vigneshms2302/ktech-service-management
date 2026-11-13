import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Plus,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  UserX,
  Download,
  MessageCircle,
  Building2,
} from 'lucide-react';
import { saasApi, setAuthToken, setShopSlug, getAuthToken } from '../../api/client.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { AdminDialog } from './AdminDialog.tsx';
import {
  ShopItem,
  ShopUserAccount,
  RevealedCredentialPayload,
  PasswordResetRequestItem,
  SHOP_ROLE_OPTIONS,
  buildCredentialShareMessage,
  buildResetShareMessage,
  buildWhatsAppUrl,
  downloadCsv,
  formatDateSafe,
} from './adminTypes.ts';

interface ShopLoginsTabProps {
  shops: ShopItem[];
  onInspectShop: (shopId: string) => void;
  onRefreshParent: () => void;
}

/**
 * Cross-tenant Shop Logins & Password Recovery Vault tab.
 * Lets the Super-Admin inspect every shop login, reveal encrypted passwords on audit,
 * share credentials via clipboard/WhatsApp, create new shop users, reset credentials,
 * toggle active state, and launch Support Mode impersonation.
 */
export const ShopLoginsTab: React.FC<ShopLoginsTabProps> = ({
  shops,
  onInspectShop,
  onRefreshParent,
}) => {
  const { showSuccess, showError } = useToast();

  const [logins, setLogins] = useState<ShopUserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [shopFilter, setShopFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, RevealedCredentialPayload>>({});
  const [loadingRevealId, setLoadingRevealId] = useState<string | null>(null);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add User Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newShopId, setNewShopId] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRoleId, setNewRoleId] = useState('ROLE_TECHNICIAN');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPinCode, setNewPinCode] = useState('1234');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Reset Password/PIN Modal state
  const [resetTarget, setResetTarget] = useState<ShopUserAccount | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetPinInput, setResetPinInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Live Password Reset Queue
  const [resetRequests, setResetRequests] = useState<PasswordResetRequestItem[]>([]);
  const [isDismissingId, setIsDismissingId] = useState<string | null>(null);

  const loadLogins = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loginsRes, requestsRes] = await Promise.all([
        saasApi.admin.listLogins({
          search: search.trim() || undefined,
          shopId: shopFilter !== 'ALL' ? shopFilter : undefined,
          roleId: roleFilter !== 'ALL' ? roleFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
        saasApi.admin.listPasswordResetRequests(),
      ]);

      if (loginsRes.success && Array.isArray(loginsRes.data)) {
        setLogins(loginsRes.data);
      } else {
        showError(loginsRes.error || 'Failed to load shop logins.');
      }

      if (requestsRes.success && Array.isArray(requestsRes.data)) {
        setResetRequests(requestsRes.data);
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Could not fetch shop logins.');
    } finally {
      setIsLoading(false);
    }
  }, [search, shopFilter, roleFilter, statusFilter, showError]);

  const handleDismissResetRequest = async (requestId: string) => {
    setIsDismissingId(requestId);
    try {
      const res = await saasApi.admin.dismissPasswordResetRequest(requestId);
      if (res.success) {
        showSuccess('Password reset request dismissed.');
        setResetRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        showError(res.error || 'Failed to dismiss reset request.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to dismiss request.');
    } finally {
      setIsDismissingId(null);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadLogins();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [loadLogins]);

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
        showError(res.error || 'Could not reveal password. Use Reset Password instead.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Password recovery unavailable for legacy hash. Click Reset.');
    } finally {
      setLoadingRevealId(null);
    }
  };

  const handleCopyCredentials = async (user: ShopUserAccount) => {
    const revealed = revealedPasswords[user.id];
    const message = buildCredentialShareMessage({
      shopName: user.shopName || 'K-Connect Shop',
      shopSlug: user.shopSlug || '',
      username: user.username,
      password: revealed?.password || '(Click Reset Password to issue a new password)',
      pinCode: user.pinCode,
    });
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(user.id);
      showSuccess(`Copied credentials for @${user.username}`);
      window.setTimeout(() => setCopiedId((prev) => (prev === user.id ? null : prev)), 2000);
    } catch {
      showError('Clipboard access denied by browser.');
    }
  };

  const handleToggleStatus = async (user: ShopUserAccount) => {
    const nextActive = !user.isActive;
    try {
      const res = await saasApi.admin.updateUserStatus(user.id, nextActive);
      if (res.success) {
        showSuccess(`@${user.username} marked ${nextActive ? 'ACTIVE' : 'DISABLED'}.`);
        loadLogins();
        onRefreshParent();
      } else {
        showError(res.error || 'Could not update user status.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to update user status.');
    }
  };

  const handleSupportLogin = async (user: ShopUserAccount) => {
    try {
      const currentAdminToken = getAuthToken();
      const res = await saasApi.admin.impersonateShop(user.shopId, user.id);
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
        showError(res.error || 'Could not start support login.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to open shop workspace.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetShop = newShopId || (shops[0]?.id ?? '');
    if (!targetShop) {
      showError('Select a shop first.');
      return;
    }
    setIsCreatingUser(true);
    try {
      const res = await saasApi.admin.createShopUser(targetShop, {
        username: newUsername.trim().toLowerCase(),
        fullName: newFullName.trim(),
        roleId: newRoleId,
        phone: newPhone.trim() || undefined,
        password: newPassword.trim(),
        pinCode: newPinCode.trim() || undefined,
      });
      if (res.success && res.data) {
        const created: ShopUserAccount = res.data;
        setRevealedPasswords((prev) => ({
          ...prev,
          [created.id]: {
            userId: created.id,
            shopId: created.shopId,
            shopName: created.shopName || '',
            shopSlug: created.shopSlug || '',
            username: created.username,
            fullName: created.fullName,
            phone: created.phone,
            password: newPassword.trim(),
            pinCode: created.pinCode,
          },
        }));
        showSuccess(res.message || `Created @${created.username}`);
        setIsAddModalOpen(false);
        setNewUsername('');
        setNewFullName('');
        setNewPhone('');
        setNewPassword('');
        setNewPinCode('1234');
        loadLogins();
        onRefreshParent();
      } else {
        showError(res.error || 'Could not create user.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to create login.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const openResetModal = (user: ShopUserAccount) => {
    setResetTarget(user);
    setResetPasswordInput('');
    setResetPinInput(user.pinCode || '');
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setIsResetting(true);
    try {
      const res = await saasApi.admin.resetShopCredentials(resetTarget.shopId, {
        userId: resetTarget.id,
        newPassword: resetPasswordInput.trim() || undefined,
        newPin: resetPinInput.trim() || undefined,
      });
      if (res.success && res.data) {
        const cred = res.data;
        setRevealedPasswords((prev) => ({
          ...prev,
          [resetTarget.id]: {
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
        showSuccess(`New password saved & recoverable for @${cred.username}.`);
        setResetTarget(null);
        loadLogins();
      } else {
        showError(res.error || 'Could not reset password.');
      }
    } catch (err: unknown) {
      showError((err as Error).message || 'Failed to reset credentials.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportCsv = () => {
    downloadCsv(
      `kconnect-shop-logins-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Shop Name', 'Shop Slug', 'Username', 'Full Name', 'Role', 'Phone', 'Quick PIN Set', 'Vault Status', 'Status', 'Created'],
      logins.map((u) => [
        u.shopName || '',
        u.shopSlug || '',
        u.username,
        u.fullName,
        u.roleName,
        u.phone || '',
        u.pinCode ? 'Yes' : 'No',
        u.hasRecoverablePassword ? 'Recoverable' : 'Legacy Hash',
        u.isActive ? 'ACTIVE' : 'DISABLED',
        formatDateSafe(u.createdAt),
      ])
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* LIVE PENDING PASSWORD RESET REQUESTS QUEUE */}
      {resetRequests.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(16, 163, 127, 0.05)',
            border: '1px solid rgba(16, 163, 127, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(16, 163, 127, 0.15)',
                  color: '#10a37f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <KeyRound size={18} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Pending Password Reset Requests</span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      backgroundColor: '#10a37f',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {resetRequests.length} active
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#8e8ea0' }}>
                  Users requesting password recovery. Copy the 6-digit code or share the direct reset link via WhatsApp.
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
            {resetRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  backgroundColor: '#191919',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ececec' }}>
                      {req.fullName} <span style={{ color: '#8e8ea0', fontWeight: 500 }}>@{req.username}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#10a37f', fontWeight: 600 }}>
                      {req.shopName} {req.shopSlug ? `(/${req.shopSlug})` : ''}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#b4b4b4',
                    }}
                  >
                    {req.roleId.replace('ROLE_', '')}
                  </span>
                </div>

                {/* 6-Digit Verification Code */}
                <div
                  style={{
                    backgroundColor: '#141414',
                    border: '1px solid rgba(16, 163, 127, 0.25)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '9.5px', textTransform: 'uppercase', color: '#8e8ea0', letterSpacing: '0.5px' }}>
                      6-Digit Code
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '2px', color: '#34d399' }}>
                      {req.otp || '••••••'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (req.otp) {
                        navigator.clipboard.writeText(req.otp);
                        showSuccess(`Copied code ${req.otp}`);
                      }
                    }}
                    style={{
                      padding: '5px 8px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#ececec',
                      borderRadius: '6px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Copy size={12} />
                    <span>Copy Code</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '2px' }}>
                  {req.resetUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(req.resetUrl);
                        showSuccess('Copied direct reset link to clipboard.');
                      }}
                      style={{
                        flex: '1 1 auto',
                        padding: '6px 10px',
                        backgroundColor: '#282828',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#ececec',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <Copy size={12} />
                      <span>Copy Reset Link</span>
                    </button>
                  )}

                  <a
                    href={buildWhatsAppUrl(
                      req.phone,
                      buildResetShareMessage({
                        shopName: req.shopName,
                        username: req.username,
                        otp: req.otp,
                        resetUrl: req.resetUrl,
                      })
                    )}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#25D366',
                      color: '#000',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    disabled={isDismissingId === req.id}
                    onClick={() => handleDismissResetRequest(req.id)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#8e8ea0',
                      borderRadius: '6px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action & Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#1e1e1e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 240px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8e8ea0' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username, full name, phone, or shop..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '10px',
                backgroundColor: '#141414',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#ececec',
                fontSize: '13px',
              }}
            />
          </div>

          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              backgroundColor: '#141414',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#ececec',
              fontSize: '13px',
              maxWidth: '210px',
            }}
          >
            <option value="ALL">All Shops ({shops.length})</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (/{s.slug})
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              backgroundColor: '#141414',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#ececec',
              fontSize: '13px',
            }}
          >
            <option value="ALL">All Roles</option>
            {SHOP_ROLE_OPTIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              backgroundColor: '#141414',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#ececec',
              fontSize: '13px',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="DISABLED">Disabled Only</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadLogins}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '10px',
              backgroundColor: '#262626',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#ececec',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '10px',
              backgroundColor: '#262626',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#ececec',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Export CSV
          </button>

          <button
            type="button"
            onClick={() => {
              setNewShopId(shopFilter !== 'ALL' ? shopFilter : shops[0]?.id || '');
              setIsAddModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '10px',
              backgroundColor: '#10a37f',
              border: 'none',
              color: '#fff',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Plus size={15} /> Add Shop Login
          </button>
        </div>
      </div>

      {/* Security Vault Banner */}
      <div
        style={{
          padding: '10px 14px',
          borderRadius: '10px',
          backgroundColor: 'rgba(16, 163, 127, 0.08)',
          border: '1px solid rgba(16, 163, 127, 0.24)',
          color: '#a7f3d0',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <KeyRound size={15} style={{ flexShrink: 0 }} />
        <span>
          <strong>Encrypted Credential Vault:</strong> Click <strong>Show Password</strong> on any recoverable login to decrypt &amp; audit-log it for owner recovery. Accounts created before this vault update show <em>Legacy Hash</em> until their next sign-in or one-click <strong>Reset</strong>.
        </span>
      </div>

      {/* Logins Table */}
      <div
        style={{
          backgroundColor: '#1e1e1e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#8e8ea0', fontSize: '11.5px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px' }}>Shop</th>
              <th style={{ padding: '12px 16px' }}>User &amp; Username</th>
              <th style={{ padding: '12px 16px' }}>Role</th>
              <th style={{ padding: '12px 16px' }}>Quick PIN</th>
              <th style={{ padding: '12px 16px' }}>Password Vault</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#8e8ea0' }}>
                  Loading live logins directory...
                </td>
              </tr>
            ) : logins.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#8e8ea0' }}>
                  No user logins match the selected filters.
                </td>
              </tr>
            ) : (
              logins.map((u) => {
                const revealed = revealedPasswords[u.id];
                const pinShown = Boolean(visiblePins[u.id]);
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        type="button"
                        onClick={() => onInspectShop(u.shopId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: '#ececec',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          textAlign: 'left',
                        }}
                      >
                        <Building2 size={13} color="#10a37f" />
                        {u.shopName || u.shopId}
                      </button>
                      <div style={{ fontSize: '11.5px', color: '#8e8ea0', marginTop: '2px' }}>
                        /shop/{u.shopSlug} •{' '}
                        <span
                          style={{
                            color:
                              u.shopStatus === 'ACTIVE' ? '#34d399' : u.shopStatus === 'FROZEN' ? '#f87171' : '#fbbf24',
                          }}
                        >
                          {u.shopStatus || 'ACTIVE'}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>@{u.username}</div>
                      <div style={{ fontSize: '12px', color: '#b4b4b4' }}>{u.fullName}</div>
                      {u.phone && <div style={{ fontSize: '11.5px', color: '#8e8ea0' }}>{u.phone}</div>}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: u.roleId === 'ROLE_OWNER' ? 'rgba(16,163,127,0.16)' : 'rgba(255,255,255,0.08)',
                          color: u.roleId === 'ROLE_OWNER' ? '#34d399' : '#d1d5db',
                        }}
                      >
                        {u.roleName}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      {u.pinCode ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <code
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#141414',
                              color: '#fbbf24',
                              fontWeight: 700,
                              fontSize: '12px',
                            }}
                          >
                            {pinShown ? u.pinCode : '••••'}
                          </code>
                          <button
                            type="button"
                            onClick={() => setVisiblePins((prev) => ({ ...prev, [u.id]: !prev[u.id] }))}
                            title={pinShown ? 'Hide PIN' : 'Show PIN'}
                            style={{ background: 'none', border: 'none', color: '#8e8ea0', cursor: 'pointer', padding: '2px' }}
                          >
                            {pinShown ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>Not set</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      {revealed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <code
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(16,163,127,0.15)',
                              border: '1px solid rgba(16,163,127,0.35)',
                              color: '#6ee7b7',
                              fontWeight: 700,
                              fontSize: '12.5px',
                            }}
                          >
                            {revealed.password}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleRevealPassword(u)}
                            title="Hide Password"
                            style={{ background: 'none', border: 'none', color: '#8e8ea0', cursor: 'pointer' }}
                          >
                            <EyeOff size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyCredentials(u)}
                            title="Copy Full Login Details"
                            style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer' }}
                          >
                            {copiedId === u.id ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                          <a
                            href={buildWhatsAppUrl(
                              u.phone,
                              buildCredentialShareMessage({
                                shopName: u.shopName || 'K-Connect Shop',
                                shopSlug: u.shopSlug || '',
                                username: u.username,
                                password: revealed.password,
                                pinCode: u.pinCode,
                              })
                            )}
                            target="_blank"
                            rel="noreferrer"
                            title="Send Credentials on WhatsApp"
                            style={{ color: '#25d366', display: 'inline-flex', alignItems: 'center' }}
                          >
                            <MessageCircle size={14} />
                          </a>
                        </div>
                      ) : u.hasRecoverablePassword ? (
                        <button
                          type="button"
                          onClick={() => handleRevealPassword(u)}
                          disabled={loadingRevealId === u.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 10px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(16,163,127,0.12)',
                            border: '1px solid rgba(16,163,127,0.3)',
                            color: '#34d399',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={13} />
                          {loadingRevealId === u.id ? 'Decrypting...' : 'Show Password'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openResetModal(u)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 10px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(245,158,11,0.12)',
                            border: '1px solid rgba(245,158,11,0.3)',
                            color: '#fbbf24',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <ShieldAlert size={13} /> Legacy Hash • Click Reset
                        </button>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: u.isActive ? 'rgba(16,163,127,0.15)' : 'rgba(239,68,68,0.15)',
                          color: u.isActive ? '#34d399' : '#f87171',
                        }}
                      >
                        {u.isActive ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => openResetModal(u)}
                          title="Reset Password & PIN"
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            backgroundColor: '#262626',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#ececec',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <KeyRound size={12} /> Reset
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          title={u.isActive ? 'Disable User Login' : 'Activate User Login'}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            backgroundColor: u.isActive ? 'rgba(239,68,68,0.12)' : 'rgba(16,163,127,0.12)',
                            border: `1px solid ${u.isActive ? 'rgba(239,68,68,0.3)' : 'rgba(16,163,127,0.3)'}`,
                            color: u.isActive ? '#f87171' : '#34d399',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {u.isActive ? <UserX size={12} /> : <UserCheck size={12} />}
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSupportLogin(u)}
                          disabled={!u.isActive || u.shopStatus !== 'ACTIVE'}
                          title="Open Shop Workspace as this user (Support Mode)"
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(59,130,246,0.14)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            color: '#93c5fd',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: u.isActive && u.shopStatus === 'ACTIVE' ? 'pointer' : 'not-allowed',
                            opacity: u.isActive && u.shopStatus === 'ACTIVE' ? 1 : 0.45,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <ExternalLink size={12} /> Open
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Login Modal */}
      <AdminDialog
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Shop Login"
        maxWidth={480}
      >

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Shop</label>
                <select
                  value={newShopId}
                  onChange={(e) => setNewShopId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: '#fff',
                  }}
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (/{s.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Username *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. tech_ravi"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      backgroundColor: '#121212',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: '#fff',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Role *</label>
                  <select
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      backgroundColor: '#121212',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: '#fff',
                    }}
                  >
                    {SHOP_ROLE_OPTIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Staff full name"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      backgroundColor: '#121212',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: '#fff',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Phone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      backgroundColor: '#121212',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: '#fff',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Password *</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 4 chars"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      backgroundColor: '#121212',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: '#fff',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Quick PIN (4-6 digits)</label>
                  <input
                    type="text"
                    value={newPinCode}
                    onChange={(e) => setNewPinCode(e.target.value)}
                    placeholder="e.g. 1234"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      backgroundColor: '#121212',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: '#fff',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#262626',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#ececec',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    backgroundColor: '#10a37f',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isCreatingUser ? 'Creating...' : 'Create Login'}
                </button>
              </div>
            </form>
      </AdminDialog>

      {/* Reset Password & PIN Modal */}
      <AdminDialog
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title={resetTarget ? `Reset Credentials • @${resetTarget.username}` : 'Reset Credentials'}
        subtitle={
          resetTarget ? (
            <>
              Shop: <strong>{resetTarget.shopName}</strong> (/shop/{resetTarget.shopSlug})
            </>
          ) : undefined
        }
        maxWidth={420}
      >
        {resetTarget && (
          <>
            <p style={{ fontSize: '12.5px', color: '#9ca3af', marginTop: 0, marginBottom: '14px' }}>
              Leave new password blank to auto-generate a strong temporary password stored safely in your recoverable vault.
            </p>
            <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                  New Password (optional — auto-generates if blank)
                </label>
                <input
                  type="text"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: '#fff',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                  Quick PIN (4-6 digits, optional)
                </label>
                <input
                  type="text"
                  value={resetPinInput}
                  onChange={(e) => setResetPinInput(e.target.value)}
                  placeholder="Keep existing or set 4-6 digits"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: '#fff',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#262626',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#ececec',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    backgroundColor: '#10a37f',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isResetting ? 'Saving...' : 'Issue New Password'}
                </button>
              </div>
            </form>
          </>
        )}
      </AdminDialog>
    </div>
  );
};

