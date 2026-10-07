import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Clock,
  Wrench,
  Copy,
  Zap,
  Plus,
  Monitor,
} from 'lucide-react';

interface WorkstationNode {
  id: string;
  machineId: string;
  hostname: string;
  platform: string;
  registeredAt: string;
  lastActiveAt: string;
  isActive: boolean;
  ipAddress?: string;
  isCurrentMachine: boolean;
}

export const RemoteSupportTab: React.FC = () => {
  // Support Session State
  const [challenge, setChallenge] = useState<{
    challengeCode: string;
    machineId: string;
    expiresAt: string;
    validForMinutes: number;
  } | null>(null);

  const [responseToken, setResponseToken] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [sessionStatus, setSessionStatus] = useState<{
    isActive: boolean;
    operatorId?: string;
    expiresAt?: string;
    remainingMinutes?: number;
    unlockedFeatures: string[];
  }>({
    isActive: false,
    unlockedFeatures: [],
  });

  const [isPerformingMaintenance, setIsPerformingMaintenance] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState<string | null>(null);

  // Firewall State
  const [firewallStatus, setFirewallStatus] = useState<{
    defaultRules: Array<{ domain: string; purpose: string; allowSubdomains: boolean }>;
    customDomains: string[];
    isActive: boolean;
  } | null>(null);

  const [newDomain, setNewDomain] = useState('');

  // Workstation Node License State
  const [licenseStatus, setLicenseStatus] = useState<{
    isAllowed: boolean;
    currentMachineId: string;
    currentHostname: string;
    activeCount: number;
    maxSeats: number;
    isCurrentRegistered: boolean;
    workstations: WorkstationNode[];
    reason?: string;
  } | null>(null);

  const [isUpdatingLicense, setIsUpdatingLicense] = useState(false);

  const fetchSessionStatus = async () => {
    try {
      if (window.electronAPI?.system?.getSupportSessionStatus) {
        const res = await window.electronAPI.system.getSupportSessionStatus();
        if (res.success && res.data) {
          setSessionStatus(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch support session status:', err);
    }
  };

  const fetchFirewall = async () => {
    try {
      if (window.electronAPI?.system?.getFirewallStatus) {
        const res = await window.electronAPI.system.getFirewallStatus();
        if (res.success && res.data) {
          setFirewallStatus(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch firewall status:', err);
    }
  };

  const fetchWorkstations = async () => {
    try {
      if (window.electronAPI?.system?.getWorkstationLicenseStatus) {
        const res = await window.electronAPI.system.getWorkstationLicenseStatus();
        if (res.success && res.data) {
          setLicenseStatus(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch workstation license:', err);
    }
  };

  useEffect(() => {
    fetchSessionStatus();
    fetchFirewall();
    fetchWorkstations();
    const interval = setInterval(fetchSessionStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateChallenge = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      if (window.electronAPI?.system?.generateSupportChallenge) {
        const res = await window.electronAPI.system.generateSupportChallenge();
        if (res.success && res.data) {
          setChallenge(res.data);
          setActionSuccess('15-Minute Support Challenge generated. Share this with KTech Support Engineer.');
        } else {
          setActionError(res.error || 'Failed to generate support challenge');
        }
      }
    } catch (err: unknown) {
      setActionError((err as Error).message);
    }
  };

  const handleActivateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) {
      setActionError('Please generate a support challenge first.');
      return;
    }
    if (!responseToken.trim()) {
      setActionError('Please enter the Authorization Token provided by KTech Engineer.');
      return;
    }

    setIsActivating(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (window.electronAPI?.system?.activateSupportSession) {
        const res = await window.electronAPI.system.activateSupportSession({
          challengeCode: challenge.challengeCode,
          responseToken: responseToken.trim(),
          operatorName: operatorName.trim() || undefined,
        });

        if (res.success) {
          setActionSuccess(res.message);
          setResponseToken('');
          if (res.session) setSessionStatus(res.session);
          fetchSessionStatus();
        } else {
          setActionError(res.message || 'Authorization failed');
        }
      }
    } catch (err: unknown) {
      setActionError((err as Error).message);
    } finally {
      setIsActivating(false);
    }
  };

  const handleEndSession = async () => {
    try {
      if (window.electronAPI?.system?.endSupportSession) {
        await window.electronAPI.system.endSupportSession();
        fetchSessionStatus();
        setActionSuccess('Support session ended. Elevated diagnostic privileges revoked.');
        setChallenge(null);
      }
    } catch (err: unknown) {
      setActionError((err as Error).message);
    }
  };

  const handleMaintenance = async (action: 'REINDEX' | 'VACUUM' | 'INTEGRITY_FIX' | 'CLEAN_ORPHANS') => {
    setIsPerformingMaintenance(true);
    setMaintenanceResult(null);
    try {
      if (window.electronAPI?.system?.executeSupportMaintenance) {
        const res = await window.electronAPI.system.executeSupportMaintenance({ action });
        if (res.success) {
          setMaintenanceResult(`Maintenance action "${action}" completed successfully!`);
        } else {
          setActionError(res.error || `Maintenance action "${action}" failed`);
        }
      }
    } catch (err: unknown) {
      setActionError((err as Error).message);
    } finally {
      setIsPerformingMaintenance(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    try {
      if (window.electronAPI?.system?.addFirewallDomain) {
        await window.electronAPI.system.addFirewallDomain({ domain: newDomain.trim() });
        setNewDomain('');
        fetchFirewall();
      }
    } catch (err) {
      console.error('Failed to add domain to firewall:', err);
    }
  };

  const handleDeactivateWorkstation = async (machineId: string) => {
    if (!confirm('Are you sure you want to deactivate this computer node? It will free up 1 license seat.')) return;
    setIsUpdatingLicense(true);
    try {
      if (window.electronAPI?.system?.deactivateWorkstation) {
        const res = await window.electronAPI.system.deactivateWorkstation({ machineId });
        if (res.success) {
          setActionSuccess(res.message || 'Workstation deactivated successfully.');
          fetchWorkstations();
          setTimeout(() => setActionSuccess(null), 3500);
        }
      }
    } catch (err) {
      console.error('Failed to deactivate workstation:', err);
    } finally {
      setIsUpdatingLicense(false);
    }
  };

  const handleReactivateWorkstation = async (machineId: string) => {
    setIsUpdatingLicense(true);
    try {
      if (window.electronAPI?.system?.reactivateWorkstation) {
        const res = await window.electronAPI.system.reactivateWorkstation({ machineId });
        if (res.success) {
          setActionSuccess(res.message || 'Workstation reactivated successfully.');
          fetchWorkstations();
          setTimeout(() => setActionSuccess(null), 3500);
        } else {
          setActionError(res.message || 'Cannot reactivate workstation');
        }
      }
    } catch (err) {
      console.error('Failed to reactivate workstation:', err);
    } finally {
      setIsUpdatingLicense(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Workstation Node Licensing Banner */}
      <div
        style={{
          padding: '14px',
          backgroundColor: 'rgba(14, 165, 233, 0.08)',
          border: '1px solid rgba(14, 165, 233, 0.25)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Monitor size={18} color="#0ea5e9" />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
              Workstation Node Licensing & Device Seat Limits
            </h3>
          </div>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor:
                (licenseStatus?.activeCount || 0) >= (licenseStatus?.maxSeats || 4)
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(34, 197, 94, 0.15)',
              color:
                (licenseStatus?.activeCount || 0) >= (licenseStatus?.maxSeats || 4)
                  ? '#ef4444'
                  : '#22c55e',
            }}
          >
            {licenseStatus?.activeCount || 1} / {licenseStatus?.maxSeats || 4} Seats Active
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
          To prevent unauthorized multi-device copying, this shop installation is locked to a maximum of{' '}
          <strong>{licenseStatus?.maxSeats || 4} computers</strong> using hardware machine signatures. Deactivate an old PC below to replace it.
        </p>

        {/* Workstation List */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
          {licenseStatus?.workstations.map((node) => (
            <div
              key={node.id}
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--bg-card)',
                border: node.isCurrentMachine ? '1px solid #0ea5e9' : '1px solid var(--border-color)',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Monitor size={14} color={node.isActive ? '#0ea5e9' : '#64748b'} />
                  <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>{node.hostname}</strong>
                  {node.isCurrentMachine && (
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>
                      THIS PC
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: node.isActive ? '#22c55e' : '#64748b' }}>
                  {node.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                </span>
              </div>

              <div style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                <span>ID: {node.machineId}</span>
                <span>IP: {node.ipAddress || '127.0.0.1'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed var(--border-color)' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                  Active: {new Date(node.lastActiveAt).toLocaleDateString()}
                </span>

                {node.isActive ? (
                  !node.isCurrentMachine && (
                    <button
                      onClick={() => handleDeactivateWorkstation(node.machineId)}
                      disabled={isUpdatingLicense}
                      style={{
                        padding: '2px 6px',
                        fontSize: '10px',
                        backgroundColor: 'transparent',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Deactivate Node
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleReactivateWorkstation(node.machineId)}
                    disabled={isUpdatingLicense}
                    style={{
                      padding: '2px 6px',
                      fontSize: '10px',
                      backgroundColor: 'transparent',
                      border: '1px solid #22c55e',
                      color: '#22c55e',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Remote Support Challenge-Response Banner */}
      <div
        style={{
          padding: '14px',
          backgroundColor: sessionStatus.isActive ? 'rgba(34, 197, 94, 0.08)' : 'rgba(168, 85, 247, 0.08)',
          border: `1px solid ${sessionStatus.isActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(168, 85, 247, 0.25)'}`,
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color={sessionStatus.isActive ? '#22c55e' : '#a855f7'} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
              {sessionStatus.isActive ? 'Elevated Remote Support Session Active' : 'Consent-Based Remote Support Session'}
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
            Cryptographically signed challenge-response access for KTech engineers. No permanent hardcoded backdoors.
          </p>
        </div>

        {sessionStatus.isActive ? (
          <button
            onClick={handleEndSession}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            End Support Session
          </button>
        ) : (
          <button
            onClick={handleGenerateChallenge}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#a855f7',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Key size={14} />
            <span>Generate Support Code</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '6px',
            color: '#22c55e',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            color: '#ef4444',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Session Active Panel: Deep Maintenance Commands */}
      {sessionStatus.isActive ? (
        <div
          style={{
            padding: '14px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Unlock size={16} color="#22c55e" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                Operator: {sessionStatus.operatorId}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#22c55e' }}>
              <Clock size={12} />
              <span>Expires in {sessionStatus.remainingMinutes} min</span>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Elevated diagnostic mode grants direct execution of SQLite storage vacuuming, index rebuilds, and orphan cleanup.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <button
              onClick={() => handleMaintenance('REINDEX')}
              disabled={isPerformingMaintenance}
              style={{
                padding: '8px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center',
              }}
            >
              <Wrench size={12} /> Rebuild Indexes
            </button>

            <button
              onClick={() => handleMaintenance('VACUUM')}
              disabled={isPerformingMaintenance}
              style={{
                padding: '8px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center',
              }}
            >
              <Zap size={12} /> Vacuum Database
            </button>

            <button
              onClick={() => handleMaintenance('CLEAN_ORPHANS')}
              disabled={isPerformingMaintenance}
              style={{
                padding: '8px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center',
              }}
            >
              <Shield size={12} /> Clean Orphans
            </button>
          </div>

          {maintenanceResult && (
            <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>{maintenanceResult}</div>
          )}
        </div>
      ) : (
        /* Challenge Code Display & Token Form */
        challenge && (
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Step 1: Tell this code to KTech Support Engineer:
              </span>
              <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 600 }}>Valid for 15 mins</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: 'var(--bg-card)',
                border: '1px dashed #a855f7',
                borderRadius: '6px',
              }}
            >
              <code style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '2px', color: '#a855f7' }}>
                {challenge.challengeCode}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(challenge.challengeCode);
                  setActionSuccess('Challenge code copied to clipboard!');
                  setTimeout(() => setActionSuccess(null), 3000);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                }}
              >
                <Copy size={14} /> Copy
              </button>
            </div>

            <form onSubmit={handleActivateSession} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Step 2: Enter Authorization Token provided by Engineer:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Engineer / Operator Name (Optional)"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    fontSize: '12px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                  }}
                />
                <input
                  type="text"
                  placeholder="SUP-XXXX-XXXX-XXXX"
                  value={responseToken}
                  onChange={(e) => setResponseToken(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    fontSize: '12px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontFamily: 'monospace',
                  }}
                />
                <button
                  type="submit"
                  disabled={isActivating}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#a855f7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isActivating ? 'Verifying...' : 'Unlock Session'}
                </button>
              </div>
            </form>
          </div>
        )
      )}

      {/* 3. In-App Firewall & Network Whitelist Section */}
      <div
        style={{
          padding: '14px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={16} color="#38bdf8" />
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
              In-App Network Guard & Request Whitelist Firewall
            </h4>
          </div>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: '#22c55e',
            }}
          >
            ACTIVE ENFORCED
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
          Outbound network connections are strictly restricted to whitelisted domains to prevent data leaks or unauthorized external calls.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
          {firewallStatus?.defaultRules.map((rule, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 8px',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '4px',
                fontSize: '11px',
              }}
            >
              <code style={{ color: '#38bdf8' }}>{rule.domain}</code>
              <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>{rule.purpose}</span>
            </div>
          ))}
          {firewallStatus?.customDomains.map((d, idx) => (
            <div
              key={`custom-${idx}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 8px',
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                borderRadius: '4px',
                fontSize: '11px',
              }}
            >
              <code style={{ color: '#38bdf8' }}>{d}</code>
              <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>Custom Whitelisted Domain</span>
            </div>
          ))}
        </div>

        {/* Add Custom Domain Form */}
        <form onSubmit={handleAddDomain} style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <input
            type="text"
            placeholder="Add custom domain (e.g. api.ktechcomputers.com)"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '11px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              color: 'var(--text-main)',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-sidebar)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={12} /> Add Rule
          </button>
        </form>
      </div>
    </div>
  );
};
