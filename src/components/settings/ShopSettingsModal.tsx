import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Download,
  Save,
  CheckCircle2,
  X,
  Store,
} from 'lucide-react';

interface ShopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShopSettingsModal: React.FC<ShopSettingsModalProps> = ({ isOpen, onClose }) => {
  const [shopName, setShopName] = useState(() => localStorage.getItem('ktech_shop_name') || 'KTech Computers');
  const [tagline, setTagline] = useState(() => localStorage.getItem('ktech_shop_tagline') || 'Chip-Level Laptop, Desktop & Electronic Repair Lab');
  const [phone, setPhone] = useState(() => localStorage.getItem('ktech_shop_phone') || '+91 98400 12345');
  const [address, setAddress] = useState(() => localStorage.getItem('ktech_shop_address') || '1st Floor, Gandhi Road, Main Market');
  const [gstin, setGstin] = useState(() => localStorage.getItem('ktech_shop_gstin') || '33AAAAA0000A1Z5');
  const [upiId, setUpiId] = useState(() => localStorage.getItem('ktech_shop_upi') || 'ktech@upi');

  const [dbHealth, setDbHealth] = useState<{
    databaseStatus: string;
    databasePath: string;
    databaseSizeBytes: number;
    jobCount: number;
    customerCount: number;
  } | null>(null);

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<{ path: string; size: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
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
    fetchHealth();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('ktech_shop_name', shopName);
    localStorage.setItem('ktech_shop_tagline', tagline);
    localStorage.setItem('ktech_shop_phone', phone);
    localStorage.setItem('ktech_shop_address', address);
    localStorage.setItem('ktech_shop_gstin', gstin);
    localStorage.setItem('ktech_shop_upi', upiId);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          maxWidth: '620px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="var(--brand-primary)" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Shop Configuration & Data Backup
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Shop Business Details */}
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Store size={15} color="var(--brand-primary)" /> Shop Details (Printed on Invoices & Job Slips)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Shop / Business Name</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Phone / WhatsApp Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Tagline / Specialization</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Shop Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Shop GSTIN Number</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>UPI ID / VPA (For QR Payments)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              {isSaved && (
                <span style={{ fontSize: '12px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} /> Settings Saved!
                </span>
              )}
              <button
                type="submit"
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Save size={13} /> Save Shop Info
              </button>
            </div>
          </form>

          {/* Section 2: Database Health & Backup */}
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Database size={15} color="var(--color-success)" /> Local Database & Backup Safety
            </div>

            {dbHealth && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '11px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-dim)' }}>Status</div>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Creates a timestamped snapshot of all repair records, customer details, and invoices.
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
      </div>
    </div>
  );
};
