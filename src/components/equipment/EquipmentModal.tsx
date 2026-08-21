import React, { useState, useEffect } from 'react';
import { Laptop, X, AlertTriangle, Lock } from 'lucide-react';
import type { EquipmentType, DeviceDuplicateCandidate } from '../../types/index.ts';

const APPROVED_EQUIPMENT_TYPES: Array<{ value: EquipmentType; label: string }> = [
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'DESKTOP', label: 'Desktop PC' },
  { value: 'CUSTOM_PC', label: 'Custom Gaming / Workstation PC' },
  { value: 'MONITOR', label: 'Monitor / Display' },
  { value: 'PRINTER', label: 'Printer' },
  { value: 'PLAYSTATION', label: 'PlayStation (PS4 / PS5)' },
  { value: 'XBOX', label: 'Xbox Console' },
  { value: 'GAMING_CONSOLE', label: 'Other Gaming Console (Switch / Steam Deck)' },
  { value: 'HDD', label: 'Hard Disk Drive (HDD)' },
  { value: 'SSD', label: 'Solid State Drive (SSD SATA)' },
  { value: 'M_2', label: 'M.2 NVMe SSD' },
  { value: 'PEN_DRIVE', label: 'Pen Drive / USB Storage' },
  { value: 'SMPS', label: 'SMPS / Power Unit' },
  { value: 'POWER_SUPPLY', label: 'Industrial Power Supply' },
  { value: 'EV_CHARGER', label: 'EV Charger / Control Box' },
  { value: 'ADAPTER', label: 'Power Adapter / Charger' },
  { value: 'MOTHERBOARD', label: 'Motherboard (Board-Level Service)' },
  { value: 'OTHER', label: 'Other Electronic Equipment' },
];

interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  onEquipmentCreated: (device: { id: string; customerId: string; equipmentType: string; brand: string; modelName: string; serialNumber?: string }) => void;
  onSelectExisting?: (deviceId: string) => void;
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  onEquipmentCreated,
  onSelectExisting,
}) => {
  const [equipmentType, setEquipmentType] = useState<EquipmentType>('LAPTOP');
  const [brand, setBrand] = useState('');
  const [modelName, setModelName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [colorFinish, setColorFinish] = useState('');
  const [specsSummary, setSpecsSummary] = useState('');
  const [securityPasscode, setSecurityPasscode] = useState('');

  const [duplicates, setDuplicates] = useState<DeviceDuplicateCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEquipmentType('LAPTOP');
      setBrand('');
      setModelName('');
      setSerialNumber('');
      setColorFinish('');
      setSpecsSummary('');
      setSecurityPasscode('');
      setDuplicates([]);
      setError(null);
    }
  }, [isOpen]);

  const checkDuplicates = async (ser: string, b: string, m: string) => {
    if (!customerId) return;
    if (!ser && (!b || !m)) return;

    try {
      if (window.electronAPI?.devices?.checkDuplicates) {
        const res = await window.electronAPI.devices.checkDuplicates({
          customerId,
          serialNumber: ser,
          brand: b,
          modelName: m,
        });
        if (res.success && res.data) {
          setDuplicates(res.data);
        }
      }
    } catch {
      // Non-blocking
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim()) {
      setError('Brand is required (e.g. Dell, Lenovo, HP, Sony)');
      return;
    }
    if (!modelName.trim()) {
      setError('Model name is required (e.g. ThinkPad T14, PS5 Digital)');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (!window.electronAPI?.devices?.create) {
        setError('Electron device API unavailable');
        return;
      }

      const res = await window.electronAPI.devices.create({
        customerId,
        equipmentType,
        brand: brand.trim(),
        modelName: modelName.trim(),
        serialNumber: serialNumber.trim() || undefined,
        colorFinish: colorFinish.trim() || undefined,
        specsSummary: specsSummary.trim() || undefined,
        securityPasscode: securityPasscode.trim() || undefined,
      });

      if (res.success && res.data) {
        onEquipmentCreated(res.data);
        onClose();
      } else {
        setError(res.error || 'Failed to create equipment record');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        className="card"
        style={{
          width: '540px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Laptop size={18} color="var(--brand-primary)" />
            <div>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Register Customer Equipment</span>
              {customerName && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Owner: {customerName}</div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Duplicate Equipment Warning */}
        {duplicates.length > 0 && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid var(--color-warning)',
              color: 'var(--text-main)',
              fontSize: '12px',
              marginBottom: '14px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--color-warning)', marginBottom: '4px' }}>
              <AlertTriangle size={13} />
              <span>Customer already has similar equipment registered:</span>
            </div>
            {duplicates.map((dup) => (
              <div key={dup.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-app)', padding: '4px 8px', borderRadius: '4px' }}>
                <span><strong>{dup.brand} {dup.modelName}</strong> ({dup.equipmentType}) {dup.serialNumber ? `SN: ${dup.serialNumber}` : ''}</span>
                {onSelectExisting && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      onSelectExisting(dup.id);
                      onClose();
                    }}
                    style={{ padding: '2px 6px', fontSize: '10px' }}
                  >
                    Select This
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              fontSize: '12px',
              marginBottom: '14px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              EQUIPMENT TYPE *
            </label>
            <select
              className="input-field"
              value={equipmentType}
              onChange={(e) => setEquipmentType(e.target.value as EquipmentType)}
              required
            >
              {APPROVED_EQUIPMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                BRAND / MANUFACTURER *
              </label>
              <input
                type="text"
                className="input-field"
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  checkDuplicates(serialNumber, e.target.value, modelName);
                }}
                placeholder="e.g. Dell, Lenovo, HP, Sony, Asus"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                MODEL NAME / NUMBER *
              </label>
              <input
                type="text"
                className="input-field"
                value={modelName}
                onChange={(e) => {
                  setModelName(e.target.value);
                  checkDuplicates(serialNumber, brand, e.target.value);
                }}
                placeholder="e.g. Inspiron 15 3501, PS5 Slim"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                SERIAL NUMBER / SERVICE TAG
              </label>
              <input
                type="text"
                className="input-field"
                value={serialNumber}
                onChange={(e) => {
                  setSerialNumber(e.target.value);
                  checkDuplicates(e.target.value, brand, modelName);
                }}
                placeholder="e.g. PF39AB12, 8CG1234XYZ"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                COLOR / FINISH
              </label>
              <input
                type="text"
                className="input-field"
                value={colorFinish}
                onChange={(e) => setColorFinish(e.target.value)}
                placeholder="e.g. Space Grey, Matte Black"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              CAPACITY / HARDWARE SPECIFICATION (WHERE APPLICABLE)
            </label>
            <input
              type="text"
              className="input-field"
              value={specsSummary}
              onChange={(e) => setSpecsSummary(e.target.value)}
              placeholder="e.g. Core i5 11th Gen, 16GB RAM, 512GB SSD or 1TB External HDD"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} color="var(--color-warning)" />
                DEVICE PIN / OS PASSCODE (STORED ENCRYPTED IN VAULT)
              </span>
            </label>
            <input
              type="text"
              className="input-field"
              value={securityPasscode}
              onChange={(e) => setSecurityPasscode(e.target.value)}
              placeholder="e.g. 1234, user@2026 (Decryption requires credentials.view permission)"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving Equipment...' : 'Register Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
