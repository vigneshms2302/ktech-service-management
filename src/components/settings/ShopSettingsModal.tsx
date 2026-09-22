import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Save,
  CheckCircle2,
  X,
  Store,
  Users,
  UserPlus,
  RefreshCw,
  Sparkles,
  ArrowUpCircle,
  AlertCircle,
  Info,
  ShieldCheck,
  RotateCw,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import type { UpdateStatusPayload } from '../../types/index.ts';

interface ShopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StaffUser {
  id: string;
  username: string;
  fullName: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  pinCode?: string;
  phone?: string;
}

const ROLES = [
  { id: 'ROLE_OWNER', name: 'Shop Owner / Admin', desc: 'Full permissions, analytics & settings' },
  { id: 'ROLE_RECEPTION', name: 'Front Desk / Receptionist', desc: 'Customer CRM, Job Intake & Billing' },
  { id: 'ROLE_TECHNICIAN', name: 'Repair Technician', desc: 'Job diagnosis, repair plans & parts usage' },
  { id: 'ROLE_ACCOUNTS', name: 'Accounts & Billing', desc: 'Invoices, payments & GST records' },
];

export const ShopSettingsModal: React.FC<ShopSettingsModalProps> = ({ isOpen, onClose }) => {
  const { shopSettings, updateShopSettings } = useShop();
  const { refreshUsers } = useAuth();

  const [activeTab, setActiveTab] = useState<'shop' | 'staff' | 'backup' | 'updates'>('shop');

  // Shop details form state
  const [shopName, setShopName] = useState(shopSettings.shopName);
  const [tagline, setTagline] = useState(shopSettings.tagline);
  const [phone, setPhone] = useState(shopSettings.phone);
  const [address, setAddress] = useState(shopSettings.address);
  const [gstin, setGstin] = useState(shopSettings.gstin);
  const [upiId, setUpiId] = useState(shopSettings.upiId);
  const [isSaved, setIsSaved] = useState(false);

  // Staff / User Management state
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRoleId, setNewRoleId] = useState('ROLE_TECHNICIAN');
  const [newPassword, setNewPassword] = useState('');
  const [newPinCode, setNewPinCode] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  // Database health & backup state
  const [dbHealth, setDbHealth] = useState<{
    databaseStatus: string;
    databasePath: string;
    databaseSizeBytes: number;
    jobCount: number;
    customerCount: number;
  } | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<{ path: string; size: string } | null>(null);

  // Desktop Auto-Updater state
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusPayload>({
    status: 'IDLE',
    currentVersion: '1.0.0',
  });
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [updateActionError, setUpdateActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setShopName(shopSettings.shopName);
    setTagline(shopSettings.tagline);
    setPhone(shopSettings.phone);
    setAddress(shopSettings.address);
    setGstin(shopSettings.gstin);
    setUpiId(shopSettings.upiId);

    fetchStaffList();
    fetchHealth();
    fetchUpdaterStatus();

    // Subscribe to real-time updater events
    let unsubscribe: (() => void) | undefined;
    if (window.electronAPI?.updater?.onStatusChange) {
      unsubscribe = window.electronAPI.updater.onStatusChange((status) => {
        setUpdateStatus(status);
        if (status.status !== 'CHECKING') {
          setIsCheckingUpdate(false);
        }
        if (status.status === 'DOWNLOADED' || status.status === 'ERROR') {
          setIsDownloadingUpdate(false);
        }
      });
    }

    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleModalKeyDown);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('keydown', handleModalKeyDown);
    };
  }, [isOpen, shopSettings, onClose]);

  const fetchUpdaterStatus = async () => {
    try {
      if (window.electronAPI?.updater?.getStatus) {
        const res = await window.electronAPI.updater.getStatus();
        if (res.success && res.data) {
          setUpdateStatus(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to get updater status:', err);
    }
  };

  const fetchStaffList = async () => {
    setIsLoadingStaff(true);
    try {
      if (window.electronAPI?.auth?.listUsers) {
        const res = await window.electronAPI.auth.listUsers();
        if (res.success && res.data) {
          setStaffList(res.data as StaffUser[]);
        }
      }
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const fetchHealth = async () => {
    try {
      if (window.electronAPI?.system?.getHealth) {
        const res = await window.electronAPI.system.getHealth();
        if (res.success && res.data) {
          setDbHealth(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to get database health:', err);
    }
  };

  if (!isOpen) return null;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateShopSettings({
      shopName: shopName.trim(),
      tagline: tagline.trim(),
      phone: phone.trim(),
      address: address.trim(),
      gstin: gstin.trim(),
      upiId: upiId.trim(),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(null);

    if (!newFullName.trim() || !newUsername.trim()) {
      setUserError('Full Name and Username are required');
      return;
    }

    try {
      if (window.electronAPI?.auth?.createUser) {
        const res = await window.electronAPI.auth.createUser({
          username: newUsername.trim(),
          fullName: newFullName.trim(),
          roleId: newRoleId,
          password: newPassword.trim() || 'kconnect123',
          pinCode: newPinCode.trim() || '1234',
          phone: newPhone.trim() || undefined,
        });

        if (res.success) {
          setUserSuccess(`User account for ${newFullName} created successfully!`);
          setShowAddUserForm(false);
          setNewUsername('');
          setNewFullName('');
          setNewPassword('');
          setNewPinCode('');
          setNewPhone('');
          fetchStaffList();
          refreshUsers();
          setTimeout(() => setUserSuccess(null), 3000);
        } else {
          setUserError(res.error || 'Failed to create user');
        }
      }
    } catch (err: unknown) {
      setUserError((err as Error).message);
    }
  };

  const handleToggleUserStatus = async (user: StaffUser) => {
    try {
      if (window.electronAPI?.auth?.toggleUserStatus) {
        const res = await window.electronAPI.auth.toggleUserStatus({
          id: user.id,
          isActive: !user.isActive,
        });
        if (res.success) {
          fetchStaffList();
          refreshUsers();
        }
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setBackupResult(null);
    try {
      if (window.electronAPI?.system?.createBackup) {
        const res = await window.electronAPI.system.createBackup({ backupType: 'MANUAL' });
        if (res.success && res.data) {
          const sizeKb = (res.data.fileSizeBytes / 1024).toFixed(1);
          setBackupResult({ path: res.data.backupPath, size: `${sizeKb} KB` });
        } else {
          alert(res.error || 'Backup creation failed');
        }
      } else {
        alert('System Backup API unavailable');
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateActionError(null);
    try {
      if (window.electronAPI?.updater?.checkForUpdates) {
        const res = await window.electronAPI.updater.checkForUpdates();
        if (res.success && res.data) {
          setUpdateStatus(res.data);
        } else {
          setUpdateActionError(res.error || 'Failed to check for updates');
        }
      }
    } catch (err: unknown) {
      setUpdateActionError((err as Error).message);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    setIsDownloadingUpdate(true);
    setUpdateActionError(null);
    try {
      if (window.electronAPI?.updater?.downloadUpdate) {
        const res = await window.electronAPI.updater.downloadUpdate();
        if (!res.success) {
          setUpdateActionError(res.error || 'Failed to start downloading update');
          setIsDownloadingUpdate(false);
        }
      }
    } catch (err: unknown) {
      setUpdateActionError((err as Error).message);
      setIsDownloadingUpdate(false);
    }
  };

  const handleQuitAndInstall = async () => {
    try {
      if (window.electronAPI?.updater?.quitAndInstall) {
        await window.electronAPI.updater.quitAndInstall();
      }
    } catch (err: unknown) {
      alert('Failed to restart application: ' + (err as Error).message);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '12px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          maxWidth: '680px',
          width: 'min(680px, 96vw)',
          maxHeight: '92vh',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--brand-primary), #0284c7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '16px',
                flexShrink: 0,
              }}
            >
              K
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                K-Connect Shop Control Panel
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Configured Shop: <strong>{shopSettings.shopName}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px', borderRadius: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '8px 16px 0',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-surface)',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'thin',
          }}
        >
          <button
            onClick={() => setActiveTab('shop')}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderBottom: activeTab === 'shop' ? '2px solid var(--brand-primary)' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'shop' ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'shop' ? 700 : 500,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <Store size={14} />
            <span>Shop Profile & Branding</span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderBottom: activeTab === 'staff' ? '2px solid var(--brand-primary)' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'staff' ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'staff' ? 700 : 500,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <Users size={14} />
            <span>Staff & User Logins ({staffList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderBottom: activeTab === 'backup' ? '2px solid var(--brand-primary)' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'backup' ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'backup' ? 700 : 500,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <Database size={14} />
            <span>Database & Backups</span>
          </button>

          <button
            onClick={() => setActiveTab('updates')}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderBottom: activeTab === 'updates' ? '2px solid var(--brand-primary)' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'updates' ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'updates' ? 700 : 500,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            <RefreshCw size={14} />
            <span>App Updates</span>
            {(updateStatus.status === 'AVAILABLE' || updateStatus.status === 'DOWNLOADED') && (
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#38bdf8',
                  boxShadow: '0 0 8px #38bdf8',
                }}
              />
            )}
          </button>
        </div>

        {/* Tab Contents */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* TAB 1: SHOP DETAILS */}
          {activeTab === 'shop' && (
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '10px 12px', backgroundColor: 'rgba(2, 132, 199, 0.08)', borderRadius: '6px', border: '1px solid rgba(2, 132, 199, 0.2)', fontSize: '11px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                <strong>Client Shop Setup:</strong> Enter the business name and details of the shop using K-Connect. These details will be automatically branded across the Sidebar, Header, WhatsApp updates, Counter Admission Slips, and GST Invoices.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Shop / Business Name *</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. KTech Computers, Apex Laptop Lab"
                    required
                    style={{ width: '100%', marginTop: '4px', padding: '8px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '13px', fontWeight: 600, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Phone / WhatsApp Contact *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98400 12345"
                    required
                    style={{ width: '100%', marginTop: '4px', padding: '8px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Tagline / Specialization</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Chip-Level Laptop, Desktop & Mobile Repair Lab"
                  style={{ width: '100%', marginTop: '4px', padding: '8px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Shop Address (Printed on Invoices & Slips)</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 1st Floor, Gandhi Road, Main Market, Coimbatore - 641012"
                  style={{ width: '100%', marginTop: '4px', padding: '8px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Shop GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    style={{ width: '100%', marginTop: '4px', padding: '8px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', fontFamily: 'var(--font-mono)', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>UPI ID / VPA (For Counter QR Code)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. yourshop@upi"
                    style={{ width: '100%', marginTop: '4px', padding: '8px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', fontFamily: 'var(--font-mono)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                {isSaved && (
                  <span style={{ fontSize: '12px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={14} /> Shop Information Saved!
                  </span>
                )}
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px' }}
                >
                  <Save size={14} /> Save Shop Information
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: STAFF & USERS */}
          {activeTab === 'staff' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Shop Staff & User Logins
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Create technician and front-desk accounts with 4-digit PINs for fast switching.
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowAddUserForm(!showAddUserForm);
                    setUserError(null);
                    setUserSuccess(null);
                  }}
                  style={{ padding: '5px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <UserPlus size={13} />
                  <span>{showAddUserForm ? 'Cancel' : 'Add New Staff'}</span>
                </button>
              </div>

              {userSuccess && (
                <div style={{ padding: '8px 12px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-success)', borderRadius: '6px', fontSize: '12px' }}>
                  {userSuccess}
                </div>
              )}

              {userError && (
                <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: '6px', fontSize: '12px' }}>
                  {userError}
                </div>
              )}

              {/* Add User Sub-Form */}
              {showAddUserForm && (
                <form
                  onSubmit={handleCreateUser}
                  style={{
                    padding: '14px',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                    Create New Staff User
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)' }}>FULL NAME *</label>
                      <input
                        type="text"
                        className="input-field"
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)' }}>USERNAME *</label>
                      <input
                        type="text"
                        className="input-field"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                        placeholder="e.g. ramesh.tech"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)' }}>STAFF ROLE *</label>
                      <select
                        className="input-field"
                        value={newRoleId}
                        onChange={(e) => setNewRoleId(e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)' }}>4-DIGIT QUICK PIN (FOR FAST COUNTER SWITCH)</label>
                      <input
                        type="text"
                        maxLength={4}
                        className="input-field"
                        value={newPinCode}
                        onChange={(e) => setNewPinCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="e.g. 5678"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)' }}>PASSWORD (DEFAULT: kconnect123)</label>
                      <input
                        type="password"
                        className="input-field"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)' }}>PHONE NUMBER (OPTIONAL)</label>
                      <input
                        type="text"
                        className="input-field"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddUserForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save User Account
                    </button>
                  </div>
                </form>
              )}

              {/* Staff Table */}
              <div style={{ borderRadius: '6px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <table className="ktech-table">
                  <thead>
                    <tr>
                      <th>Staff Name</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>4-Digit PIN</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingStaff ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-dim)' }}>
                          Loading staff accounts...
                        </td>
                      </tr>
                    ) : staffList.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-dim)' }}>
                          No staff accounts found. Click "+ Add New Staff User" above to create one.
                        </td>
                      </tr>
                    ) : (
                      staffList.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.fullName}</strong>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{u.username}</td>
                          <td>
                            <span className="badge badge-info" style={{ fontSize: '10px' }}>
                              {u.roleName || u.roleId.replace('ROLE_', '')}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                            {u.pinCode ? `•••• (${u.pinCode})` : 'None'}
                          </td>
                          <td>
                            <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                              {u.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleToggleUserStatus(u)}
                              style={{ padding: '2px 8px', fontSize: '10px' }}
                            >
                              {u.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DATABASE & BACKUP */}
          {activeTab === 'backup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={15} color="var(--color-success)" /> Local Database & Backup Safety
                </div>

                {dbHealth && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '11px' }}>
                    <div style={{ padding: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--text-dim)' }}>Engine Status</div>
                      <div style={{ fontWeight: 700, color: 'var(--color-success)', marginTop: '2px' }}>{dbHealth.databaseStatus}</div>
                    </div>
                    <div style={{ padding: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--text-dim)' }}>Total Jobs</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{dbHealth.jobCount}</div>
                    </div>
                    <div style={{ padding: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--text-dim)' }}>Customers</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{dbHealth.customerCount}</div>
                    </div>
                    <div style={{ padding: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--text-dim)' }}>DB Size</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                        {(dbHealth.databaseSizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Creates a complete timestamped snapshot of all repair records, customer details, and invoices.
                  </div>
                  <button
                    onClick={handleCreateBackup}
                    disabled={isBackingUp}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-success)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: isBackingUp ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexShrink: 0,
                    }}
                  >
                    <Download size={14} /> {isBackingUp ? 'Creating Backup...' : 'Create Backup Now'}
                  </button>
                </div>

                {backupResult && (
                  <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '11px', color: 'var(--color-success)' }}>
                    <strong>Backup Created Successfully!</strong> ({backupResult.size})
                    <div style={{ marginTop: '2px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', wordBreak: 'break-all' }}>
                      {backupResult.path}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: APP UPDATES & VERSION */}
          {activeTab === 'updates' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Version & Environment Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '11px' }}>
                <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>App Version</div>
                  <div style={{ fontWeight: 800, color: 'var(--brand-primary)', fontSize: '14px', marginTop: '3px' }}>
                    v{updateStatus.currentVersion || '1.0.0'}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Update Channel</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '12px', marginTop: '3px' }}>
                    GitHub Releases
                  </div>
                </div>
                <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Target Architecture</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '12px', marginTop: '3px' }}>
                    Windows x64 (NSIS)
                  </div>
                </div>
              </div>

              {/* Status Display Card */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw size={15} color="var(--brand-primary)" />
                    Auto-Update System
                  </div>

                  <button
                    onClick={handleCheckForUpdates}
                    disabled={isCheckingUpdate || updateStatus.status === 'DOWNLOADING'}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--brand-primary)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: isCheckingUpdate || updateStatus.status === 'DOWNLOADING' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: isCheckingUpdate ? 0.7 : 1,
                    }}
                  >
                    <RefreshCw size={13} style={{ animation: isCheckingUpdate ? 'spin 1s linear infinite' : 'none' }} />
                    {isCheckingUpdate ? 'Checking Releases...' : 'Check for Updates'}
                  </button>
                </div>

                {/* State: CHECKING */}
                {updateStatus.status === 'CHECKING' && (
                  <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-main)' }}>
                    <RefreshCw size={16} color="var(--brand-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Connecting to GitHub Releases and comparing installed build version...</span>
                  </div>
                )}

                {/* State: NOT_AVAILABLE / IDLE */}
                {(updateStatus.status === 'IDLE' || updateStatus.status === 'NOT_AVAILABLE') && (
                  <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-main)' }}>
                    <CheckCircle2 size={16} color="var(--color-success)" />
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>Your software is up to date!</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        Version {updateStatus.currentVersion} is the latest available release.
                      </div>
                    </div>
                  </div>
                )}

                {/* State: AVAILABLE */}
                {updateStatus.status === 'AVAILABLE' && (
                  <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} color="#38bdf8" />
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '13px' }}>
                            New Update Available: v{updateStatus.updateVersion}
                          </div>
                          {updateStatus.releaseDate && (
                            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                              Released: {new Date(updateStatus.releaseDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={handleDownloadUpdate}
                        disabled={isDownloadingUpdate}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: isDownloadingUpdate ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Download size={13} />
                        {isDownloadingUpdate ? 'Downloading...' : 'Download Update'}
                      </button>
                    </div>

                    {updateStatus.releaseNotes && (
                      <div style={{ marginTop: '4px', padding: '8px 10px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-main)', maxHeight: '100px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                        <strong>Release Notes:</strong>
                        <div style={{ marginTop: '3px', color: 'var(--text-dim)' }}>{updateStatus.releaseNotes}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* State: DOWNLOADING */}
                {updateStatus.status === 'DOWNLOADING' && (
                  <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                      <span>Downloading Update v{updateStatus.updateVersion}...</span>
                      <span style={{ color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>{updateStatus.progressPercent || 0}%</span>
                    </div>

                    {/* Progress Track */}
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '999px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <div
                        style={{
                          width: `${updateStatus.progressPercent || 0}%`,
                          height: '100%',
                          backgroundColor: 'var(--brand-primary)',
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      <span>
                        {updateStatus.bytesPerSecond ? `${(updateStatus.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s` : 'Calculating speed...'}
                      </span>
                      {updateStatus.transferredBytes && updateStatus.totalBytes && (
                        <span>
                          {(updateStatus.transferredBytes / 1024 / 1024).toFixed(1)} MB / {(updateStatus.totalBytes / 1024 / 1024).toFixed(1)} MB
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* State: DOWNLOADED */}
                {updateStatus.status === 'DOWNLOADED' && (
                  <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ArrowUpCircle size={22} color="var(--color-success)" />
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: '13px' }}>
                          Update Ready to Install!
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '1px' }}>
                          Version {updateStatus.updateVersion} has been downloaded and verified.
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleQuitAndInstall}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--color-success)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                      }}
                    >
                      <RotateCw size={14} />
                      Restart & Apply Now
                    </button>
                  </div>
                )}

                {/* State: DEV_MODE */}
                {updateStatus.status === 'DEV_MODE' && (
                  <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '11px', color: 'var(--text-main)' }}>
                    <Info size={16} color="#eab308" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#eab308' }}>Development Mode Active:</strong>
                      <div style={{ marginTop: '2px', color: 'var(--text-dim)' }}>
                        Live auto-updater differential binary patching operates when running packaged releases (NSIS Setup `.exe`). You are currently in the local Vite development environment.
                      </div>
                    </div>
                  </div>
                )}

                {/* State: ERROR / updateActionError */}
                {(updateStatus.status === 'ERROR' || updateActionError) && (
                  <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '11px', color: 'var(--text-main)' }}>
                    <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#ef4444' }}>Update Check Status:</strong>
                      <div style={{ marginTop: '2px', color: 'var(--text-dim)', wordBreak: 'break-all' }}>
                        {updateActionError || updateStatus.error}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Data & Database Safety Badge */}
              <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '11px' }}>
                <ShieldCheck size={18} color="var(--brand-primary)" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Zero-Data-Loss Architecture</div>
                  <div style={{ color: 'var(--text-dim)', marginTop: '2px' }}>
                    When updating to new versions, your local SQLite database (customers, tickets, inventory, GST invoices, and backups) stored in AppData is preserved safely and automatically migrated.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
