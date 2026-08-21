import React, { useState, useEffect } from 'react';
import {
  Database,
  ShieldCheck,
  Lock,
  Unlock,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import type { SystemHealth, AuditLogEntry } from '../../types/index.ts';

export const Phase1Dashboard: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [unlockedPasscode, setUnlockedPasscode] = useState<string | null>(null);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSystemData = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.system?.getHealth) {
        const healthRes = await window.electronAPI.system.getHealth();
        if (healthRes.success && healthRes.data) {
          setHealth(healthRes.data);
        }
      }

      if (window.electronAPI?.system?.getAuditLogs) {
        const auditRes = await window.electronAPI.system.getAuditLogs({ limit: 15 });
        if (auditRes.success && auditRes.data) {
          setAuditLogs(auditRes.data);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, [currentUser]);

  const handleUnlockPasscode = async () => {
    setUnlockedPasscode(null);
    setVaultError(null);

    if (!window.electronAPI?.vault?.unlockPasscode) {
      setVaultError('Electron Vault API unavailable');
      return;
    }

    const res = await window.electronAPI.vault.unlockPasscode({ deviceId: 'DEV-001' });
    if (res.success && res.data) {
      setUnlockedPasscode(res.data.passcode);
      fetchSystemData(); // Refresh audit log
    } else {
      setVaultError(res.error || 'Access Denied');
    }
  };

  const handleTriggerBackup = async () => {
    setBackupMsg(null);
    if (!window.electronAPI?.system?.createBackup) return;

    const res = await window.electronAPI.system.createBackup({ backupType: 'MANUAL' });
    if (res.success && res.data) {
      setBackupMsg(`Backup created successfully: ${res.data.backupPath.split('\\').pop()}`);
      fetchSystemData();
    } else {
      setBackupMsg(`Backup failed: ${res.error}`);
    }
  };

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      {/* Welcome Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>KTech Computers</span>
            <span className="badge badge-success" style={{ fontSize: '11px' }}>Phase 1 Foundation Active</span>
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Electron Sandbox • SQLite Relational Engine (45 Entities) • Drizzle ORM • Role-Based Access Control • Local-First
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={fetchSystemData}
          disabled={isLoading}
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Grid: System Status & Verification Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* 1. Database & Relational Engine Health */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="var(--brand-primary)" />
              <span style={{ fontWeight: 700, fontSize: '14px' }}>SQLite Database Status</span>
            </div>
            <span className="badge badge-success">
              <CheckCircle2 size={11} style={{ marginRight: '4px' }} />
              {health?.databaseStatus || 'HEALTHY'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Verified Relational Tables:</span>
              <strong style={{ color: health?.tableCount === 45 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {health?.tableCount || 0} / 45 Tables
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Storage Mode:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>Local SQLite (WAL Mode)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Database File Size:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>
                {health?.databaseSizeBytes ? `${(health.databaseSizeBytes / 1024).toFixed(1)} KB` : 'Initializing...'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Active Users / Staff:</span>
              <strong>{health?.userCount || 0} Profiles</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Seed Records (Customers/Jobs):</span>
              <strong>{health?.customerCount || 0} Customers / {health?.jobCount || 0} Jobs</strong>
            </div>

            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--bg-app)', borderRadius: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
              <span style={{ color: 'var(--text-dim)' }}>Path: </span>
              {health?.databasePath || 'Resolving local path...'}
            </div>
          </div>
        </div>

        {/* 2. Active Role & Permission Matrix */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#a855f7" />
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Active Session & Roles</span>
            </div>
            <span className="badge badge-info">{currentUser?.roleName || 'Guest'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Authenticated User:</span>
              <strong>{currentUser?.fullName} ({currentUser?.username})</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Role Identifier:</span>
              <code style={{ color: 'var(--brand-primary)' }}>{currentUser?.roleId}</code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Granted Permissions:</span>
              <strong>{currentUser?.roleId === 'ROLE_OWNER' ? 'WILDCARD (All 26 Grants)' : `${currentUser?.permissions.length} Grants`}</strong>
            </div>

            <div style={{ marginTop: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>CAPABILITY AUDIT:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                <span className={`badge ${hasPermission('jobs.intake') ? 'badge-success' : 'badge-danger'}`}>
                  Intake: {hasPermission('jobs.intake') ? 'YES' : 'NO'}
                </span>
                <span className={`badge ${hasPermission('jobs.diagnose') ? 'badge-success' : 'badge-danger'}`}>
                  Diagnose: {hasPermission('jobs.diagnose') ? 'YES' : 'NO'}
                </span>
                <span className={`badge ${hasPermission('billing.create') ? 'badge-success' : 'badge-danger'}`}>
                  Billing: {hasPermission('billing.create') ? 'YES' : 'NO'}
                </span>
                <span className={`badge ${hasPermission('inventory.salvage') ? 'badge-success' : 'badge-danger'}`}>
                  Salvage: {hasPermission('inventory.salvage') ? 'YES' : 'NO'}
                </span>
                <span className={`badge ${hasPermission('credentials.view') ? 'badge-success' : 'badge-danger'}`}>
                  Passcodes: {hasPermission('credentials.view') ? 'YES' : 'NO'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Encrypted Passcode Vault & Backup Actions */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="var(--color-warning)" />
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Credential Vault & Backup</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
            <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-app)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Demo Device (DEV-001) ThinkPad:</span>
                <button
                  className="btn btn-secondary"
                  onClick={handleUnlockPasscode}
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                >
                  {unlockedPasscode ? <Unlock size={12} /> : <Lock size={12} />}
                  <span>{unlockedPasscode ? 'Decrypted' : 'Unlock Passcode'}</span>
                </button>
              </div>

              {unlockedPasscode && (
                <div style={{ color: 'var(--color-success)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  Decrypted Passcode: {unlockedPasscode}
                </div>
              )}

              {vaultError && (
                <div style={{ color: 'var(--color-danger)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={12} />
                  <span>{vaultError}</span>
                </div>
              )}
            </div>

            {/* Standalone Backup Button */}
            <div>
              <button
                className="btn btn-secondary"
                onClick={handleTriggerBackup}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Save size={14} color="var(--brand-primary)" />
                <span>Create Standalone Database Backup</span>
              </button>

              {backupMsg && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--color-success)', fontWeight: 500 }}>
                  {backupMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Audit Log Stream */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--brand-primary)" />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Immutable System Audit Trail</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Showing {auditLogs.length} most recent mutations
          </span>
        </div>

        <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
          <table className="ktech-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User / Staff</th>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>Context / Payload</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{log.userName}</span>
                      {log.username && <span style={{ color: 'var(--text-dim)', fontSize: '10px', marginLeft: '4px' }}>({log.username})</span>}
                    </td>
                    <td>
                      <span className={`badge ${log.action.includes('PASSCODE') ? 'badge-warning' : log.action.includes('LOGIN') ? 'badge-info' : 'badge-success'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td><code style={{ fontSize: '11px' }}>{log.entityType}</code></td>
                    <td><code style={{ fontSize: '11px', color: 'var(--brand-primary)' }}>{log.entityId}</code></td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.afterState || log.beforeState || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
