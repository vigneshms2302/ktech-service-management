import React, { useState, useEffect } from 'react';
import { Laptop, Monitor, Smartphone, Wrench, X, AlertTriangle, Lock } from 'lucide-react';
import type { DeviceDuplicateCandidate } from '../../types/index.ts';
import {
  autoCorrectBrand,
  autoCorrectModel,
  autoCorrectSpecs,
  autoCorrectCode,
  autoCorrectTitle,
  handleAutoCorrectKeyDown,
} from '../../utils/autoCorrect.ts';

type SimpleCategory = 'LAPTOP' | 'COMPUTER' | 'MOBILE' | 'OTHER';

const SIMPLE_CATEGORIES: Array<{ id: SimpleCategory; label: string; icon: React.ReactNode; desc: string }> = [
  { id: 'LAPTOP', label: 'Laptop', icon: <Laptop size={20} />, desc: 'MacBook, Windows Laptop, Chromebook' },
  { id: 'COMPUTER', label: 'Computer', icon: <Monitor size={20} />, desc: 'Desktop PC, Assembled, All-in-One' },
  { id: 'MOBILE', label: 'Mobile', icon: <Smartphone size={20} />, desc: 'iPhone, Android Smartphone, Feature Phone' },
  { id: 'OTHER', label: 'Other', icon: <Wrench size={20} />, desc: 'Printer, Tablet, TV, Gaming Console, etc.' },
];

const BRAND_SUGGESTIONS: Record<SimpleCategory, string[]> = {
  LAPTOP: ['Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Apple', 'MSI'],
  COMPUTER: ['Custom / Assembled', 'Dell', 'HP', 'Lenovo', 'Apple (iMac/Mini)', 'Asus'],
  MOBILE: ['Apple iPhone', 'Samsung', 'OnePlus', 'Xiaomi / Redmi', 'Vivo', 'Oppo', 'Realme', 'Pixel'],
  OTHER: ['Epson', 'Canon', 'HP', 'Sony', 'Apple iPad', 'Samsung Tablet', 'LG'],
};

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
  const [category, setCategory] = useState<SimpleCategory>('LAPTOP');
  const [customDeviceType, setCustomDeviceType] = useState('');
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
      setCategory('LAPTOP');
      setCustomDeviceType('');
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
      setError('Brand / Manufacturer is required (e.g. Dell, HP, Samsung, Apple)');
      return;
    }
    if (!modelName.trim()) {
      setError('Model name / number is required (e.g. Inspiron 15, Galaxy S23, iPhone 14)');
      return;
    }
    if (category === 'OTHER' && !customDeviceType.trim()) {
      setError('Please specify the custom device type (e.g. Printer, Tablet, iPad, etc.)');
      return;
    }

    const finalEquipmentType = category === 'OTHER'
      ? customDeviceType.trim()
      : category === 'LAPTOP' ? 'Laptop'
      : category === 'COMPUTER' ? 'Computer'
      : 'Mobile';

    setIsLoading(true);
    setError(null);
    try {
      if (!window.electronAPI?.devices?.create) {
        setError('Electron device API unavailable');
        return;
      }

      const res = await window.electronAPI.devices.create({
        customerId,
        equipmentType: finalEquipmentType,
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
          width: '560px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          padding: '22px',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: 'rgba(2, 132, 199, 0.15)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Laptop size={18} />
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Register Equipment</span>
              {customerName && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Customer: {customerName}</div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
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
              marginBottom: '12px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--color-warning)', marginBottom: '4px' }}>
              <AlertTriangle size={13} />
              <span>Customer already has similar equipment registered:</span>
            </div>
            {duplicates.map((dup) => (
              <div key={dup.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-app)', padding: '4px 8px', borderRadius: '4px', marginTop: '4px' }}>
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
              marginBottom: '12px',
              flexShrink: 0,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '2px' }}>
          {/* 1. Category Selection Chips */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.03em' }}>
              EQUIPMENT TYPE *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {SIMPLE_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategory(cat.id);
                      if (cat.id !== 'OTHER') {
                        setCustomDeviceType('');
                      }
                    }}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.12)' : 'var(--bg-app)',
                      color: isSelected ? 'var(--brand-primary)' : 'var(--text-main)',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.12s ease',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ color: isSelected ? 'var(--brand-primary)' : 'var(--text-dim)' }}>
                      {cat.icon}
                    </div>
                    <span style={{ fontSize: '12px' }}>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* If OTHER is selected, show custom device type input */}
          {category === 'OTHER' && (
            <div style={{ backgroundColor: 'rgba(2, 132, 199, 0.06)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '4px' }}>
                SPECIFY CUSTOM DEVICE TYPE *
              </label>
              <input
                type="text"
                className="input-field"
                value={customDeviceType}
                onChange={(e) => setCustomDeviceType(e.target.value)}
                onKeyDown={(e) => handleAutoCorrectKeyDown(e, customDeviceType, setCustomDeviceType)}
                onBlur={() => setCustomDeviceType(autoCorrectTitle(customDeviceType))}
                placeholder="e.g. Printer, Tablet, iPad, Smart TV, Audio Receiver, Gaming Console..."
                spellCheck={true}
                autoCorrect="on"
                required
                autoFocus
              />
            </div>
          )}

          {/* 2. Brand & Model */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                BRAND / MAKE *
              </label>
              <input
                type="text"
                className="input-field"
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  checkDuplicates(serialNumber, e.target.value, modelName);
                }}
                onKeyDown={(e) => handleAutoCorrectKeyDown(e, brand, (v) => {
                  setBrand(v);
                  checkDuplicates(serialNumber, v, modelName);
                })}
                onBlur={() => {
                  const b = autoCorrectBrand(brand);
                  setBrand(b);
                  checkDuplicates(serialNumber, b, modelName);
                }}
                placeholder={category === 'MOBILE' ? 'e.g. Apple, Samsung, OnePlus' : 'e.g. Dell, HP, Lenovo, Apple'}
                spellCheck={true}
                autoCorrect="on"
                required
              />
              {/* Quick Brand Suggestions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                {BRAND_SUGGESTIONS[category].slice(0, 4).map((b) => (
                  <span
                    key={b}
                    onClick={() => {
                      setBrand(b);
                      checkDuplicates(serialNumber, b, modelName);
                    }}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                    }}
                  >
                    +{b}
                  </span>
                ))}
              </div>
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
                onKeyDown={(e) => handleAutoCorrectKeyDown(e, modelName, (v) => {
                  setModelName(v);
                  checkDuplicates(serialNumber, brand, v);
                })}
                onBlur={() => {
                  const m = autoCorrectModel(modelName);
                  setModelName(m);
                  checkDuplicates(serialNumber, brand, m);
                }}
                placeholder={category === 'MOBILE' ? 'e.g. iPhone 14, Galaxy S23' : category === 'LAPTOP' ? 'e.g. Inspiron 15 3520' : 'e.g. Pavilion Gaming, OptiPlex'}
                spellCheck={true}
                autoCorrect="on"
                required
              />
            </div>
          </div>

          {/* 3. Serial / IMEI & Color */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                {category === 'MOBILE' ? 'IMEI / SERIAL NUMBER' : 'SERIAL NUMBER / SERVICE TAG'}
              </label>
              <input
                type="text"
                className="input-field"
                value={serialNumber}
                onChange={(e) => {
                  setSerialNumber(e.target.value);
                  checkDuplicates(e.target.value, brand, modelName);
                }}
                onBlur={() => {
                  const s = autoCorrectCode(serialNumber);
                  setSerialNumber(s);
                  checkDuplicates(s, brand, modelName);
                }}
                placeholder={category === 'MOBILE' ? 'e.g. 356789012345678' : 'e.g. PF39AB12, 8CG1234XYZ'}
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
                onKeyDown={(e) => handleAutoCorrectKeyDown(e, colorFinish, setColorFinish)}
                onBlur={() => setColorFinish(autoCorrectTitle(colorFinish))}
                placeholder="e.g. Black, Silver, Space Grey, Blue"
                spellCheck={true}
                autoCorrect="on"
              />
            </div>
          </div>

          {/* 4. Specs Summary */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              HARDWARE / STORAGE SPECS (OPTIONAL)
            </label>
            <input
              type="text"
              className="input-field"
              value={specsSummary}
              onChange={(e) => setSpecsSummary(e.target.value)}
              onKeyDown={(e) => handleAutoCorrectKeyDown(e, specsSummary, setSpecsSummary)}
              onBlur={() => setSpecsSummary(autoCorrectSpecs(specsSummary))}
              placeholder={category === 'MOBILE' ? 'e.g. 128GB, 8GB RAM' : 'e.g. Core i5, 16GB RAM, 512GB SSD'}
              spellCheck={true}
              autoCorrect="on"
            />
          </div>

          {/* 5. Device Lock Passcode / PIN */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} color="var(--color-warning)" />
                DEVICE PIN / SCREEN LOCK PASSCODE (OPTIONAL - ENCRYPTED IN VAULT)
              </span>
            </label>
            <input
              type="text"
              className="input-field"
              value={securityPasscode}
              onChange={(e) => setSecurityPasscode(e.target.value)}
              placeholder="e.g. 1234, pattern: L-shape, user@2026"
            />
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
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
