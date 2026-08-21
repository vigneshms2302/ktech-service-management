import React, { useState, useEffect } from 'react';
import {
  Laptop,
  ArrowLeft,
  Wrench,
  Lock,
  Unlock,
  Image,
  ShieldAlert,
} from 'lucide-react';

interface EquipmentProfileProps {
  deviceId: string;
  onBack: () => void;
  onSelectCustomer: (customerId: string) => void;
  onSelectJob: (jobId: string) => void;
  onNewJobForDevice: (customerId: string, deviceId: string) => void;
}

export const EquipmentProfile: React.FC<EquipmentProfileProps> = ({
  deviceId,
  onBack,
  onSelectCustomer,
  onSelectJob,
  onNewJobForDevice,
}) => {
  const [data, setData] = useState<{
    device: {
      id: string;
      customerId: string;
      customerName: string;
      customerPhone: string;
      customerCode: string;
      equipmentType: string;
      brand: string;
      modelName: string;
      serialNumber?: string | null;
      colorFinish?: string | null;
      specsSummary?: string | null;
      hasPasscode: boolean;
      createdAt: string;
    };
    jobs: Array<{
      id: string;
      jobNumber: string;
      serviceCategory: string;
      currentStatus: string;
      priority: string;
      reportedIssue: string;
      technicianName?: string | null;
      createdAt: string;
    }>;
    photos: Array<{
      id: string;
      photoType: string;
      filePath: string;
      caption?: string | null;
      createdAt: string;
    }>;
  } | null>(null);

  const [unlockedPasscode, setUnlockedPasscode] = useState<string | null>(null);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDevice = async () => {
      setIsLoading(true);
      try {
        if (window.electronAPI?.devices?.getById) {
          const res = await window.electronAPI.devices.getById({ deviceId });
          if (res.success && res.data) {
            setData(res.data);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDevice();
  }, [deviceId]);

  const handleUnlockPasscode = async () => {
    setVaultError(null);
    if (!window.electronAPI?.vault?.unlockPasscode) return;

    const res = await window.electronAPI.vault.unlockPasscode({ deviceId });
    if (res.success && res.data) {
      setUnlockedPasscode(res.data.passcode);
    } else {
      setVaultError(res.error || 'Access Denied');
    }
  };

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading equipment record...</div>;
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Equipment not found.</p>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: '12px' }}>
          Back
        </button>
      </div>
    );
  }

  const { device, jobs, photos } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '20px' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ padding: '5px 10px' }}>
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>/</div>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>{device.brand} {device.modelName}</span>
        <span className="badge badge-info">{device.equipmentType}</span>
      </div>

      {/* Equipment Card */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface-active)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-primary)',
              }}
            >
              <Laptop size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700 }}>{device.brand} {device.modelName}</h1>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Owner:{' '}
                <strong
                  onClick={() => onSelectCustomer(device.customerId)}
                  style={{ color: 'var(--brand-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {device.customerName}
                </strong>{' '}
                ({device.customerPhone})
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '14px', fontSize: '12px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Equipment Type: </span>
              <strong>{device.equipmentType}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)' }}>Serial Number: </span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{device.serialNumber || 'N/A'}</strong>
            </div>

            {device.colorFinish && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Color: </span>
                <span>{device.colorFinish}</span>
              </div>
            )}

            {device.specsSummary && (
              <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Hardware Specs: </span>
                <span>{device.specsSummary}</span>
              </div>
            )}
          </div>

          {/* Device Passcode Vault */}
          {device.hasPasscode && (
            <div style={{ marginTop: '14px', padding: '10px 12px', backgroundColor: 'var(--bg-app)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <Lock size={14} color="var(--color-warning)" />
                  <span>Protected Device Passcode</span>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={handleUnlockPasscode}
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                >
                  {unlockedPasscode ? <Unlock size={12} /> : <Lock size={12} />}
                  <span>{unlockedPasscode ? 'Decrypted' : 'Decrypt Passcode'}</span>
                </button>
              </div>

              {unlockedPasscode && (
                <div style={{ marginTop: '6px', color: 'var(--color-success)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                  Passcode: {unlockedPasscode}
                </div>
              )}

              {vaultError && (
                <div style={{ marginTop: '6px', color: 'var(--color-danger)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldAlert size={12} />
                  <span>{vaultError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>SERVICE HISTORY</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brand-primary)' }}>{jobs.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Job Records</div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => onNewJobForDevice(device.customerId, device.id)}
            style={{ width: '100%' }}
          >
            <Wrench size={14} />
            <span>Intake Service Job</span>
          </button>
        </div>
      </div>

      {/* Service Job History for Equipment */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wrench size={16} color="var(--brand-primary)" />
          <span>Service Job History</span>
        </h2>

        {jobs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '10px 0' }}>
            No service jobs recorded for this equipment yet.
          </p>
        ) : (
          <table className="ktech-table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Category</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Reported Issue</th>
                <th>Technician</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <strong style={{ color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                      {job.jobNumber}
                    </strong>
                  </td>
                  <td>{job.serviceCategory}</td>
                  <td><span className="badge badge-info">{job.currentStatus}</span></td>
                  <td><span className="badge badge-info">{job.priority}</span></td>
                  <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.reportedIssue}
                  </td>
                  <td>{job.technicianName || 'Unassigned'}</td>
                  <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      onClick={() => onSelectJob(job.id)}
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                    >
                      View Job
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Image size={16} color="var(--brand-primary)" />
            <span>Admission & Condition Photos ({photos.length})</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
            {photos.map((p) => (
              <div
                key={p.id}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-app)',
                }}
              >
                <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-surface-active)' }}>
                  <Image size={24} color="var(--text-dim)" />
                </div>
                <div style={{ padding: '6px 8px', fontSize: '11px' }}>
                  <span className="badge badge-info" style={{ fontSize: '9px', marginBottom: '2px' }}>{p.photoType}</span>
                  <div style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.caption || 'Intake Photo'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
