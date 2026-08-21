import React, { useState, useEffect } from 'react';
import { User, X, AlertTriangle } from 'lucide-react';
import type { CustomerDuplicateCandidate } from '../../types/index.ts';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: { id: string; customerCode: string; fullName: string; primaryPhone: string }) => void;
  onSelectExisting?: (customerId: string) => void;
  initialPhone?: string;
  initialName?: string;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerCreated,
  onSelectExisting,
  initialPhone = '',
  initialName = '',
}) => {
  const [fullName, setFullName] = useState(initialName);
  const [primaryPhone, setPrimaryPhone] = useState(initialPhone);
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [customerType, setCustomerType] = useState<'INDIVIDUAL' | 'COMMERCIAL'>('INDIVIDUAL');
  const [notes, setNotes] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('Coimbatore');
  const [state, setState] = useState('Tamil Nadu');
  const [pincode, setPincode] = useState('');

  const [duplicates, setDuplicates] = useState<CustomerDuplicateCandidate[]>([]);
  const [isCheckingDupes, setIsCheckingDupes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(initialName);
      setPrimaryPhone(initialPhone);
      setSecondaryPhone('');
      setEmail('');
      setGstin('');
      setNotes('');
      setAddressLine1('');
      setPincode('');
      setDuplicates([]);
      setError(null);
      if (initialPhone) {
        checkDupes(initialPhone, initialName, '');
      }
    }
  }, [isOpen, initialPhone, initialName]);

  const checkDupes = async (phone: string, name: string, mail: string) => {
    if (!phone && !mail && !name) return;
    if (phone.length < 5 && (!name || name.length < 3)) return;

    setIsCheckingDupes(true);
    try {
      if (window.electronAPI?.customers?.checkDuplicates) {
        const res = await window.electronAPI.customers.checkDuplicates({
          phone,
          fullName: name,
          email: mail,
        });
        if (res.success && res.data) {
          setDuplicates(res.data);
        }
      }
    } finally {
      setIsCheckingDupes(false);
    }
  };

  const handlePhoneChange = (val: string) => {
    setPrimaryPhone(val);
    if (val.length >= 8) {
      checkDupes(val, fullName, email);
    } else {
      setDuplicates([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Customer name is required');
      return;
    }
    if (!primaryPhone.trim()) {
      setError('Primary phone number is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (!window.electronAPI?.customers?.create) {
        setError('Electron customer API unavailable');
        return;
      }

      const res = await window.electronAPI.customers.create({
        fullName: fullName.trim(),
        primaryPhone: primaryPhone.trim(),
        secondaryPhone: secondaryPhone.trim() || undefined,
        email: email.trim() || undefined,
        gstin: gstin.trim() || undefined,
        customerType,
        notes: notes.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
      });

      if (res.success && res.data) {
        onCustomerCreated(res.data);
        onClose();
      } else {
        setError(res.error || 'Failed to create customer');
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
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="var(--brand-primary)" />
            <span style={{ fontWeight: 700, fontSize: '16px' }}>Add New Customer</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Duplicate Warning Banner */}
        {duplicates.length > 0 && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid var(--color-warning)',
              color: 'var(--text-main)',
              fontSize: '12px',
              marginBottom: '16px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--color-warning)', marginBottom: '4px' }}>
              <AlertTriangle size={14} />
              <span>Possible Existing Customer Found ({duplicates.length} match)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {duplicates.map((dup) => (
                <div
                  key={dup.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--bg-app)',
                    padding: '6px 10px',
                    borderRadius: '4px',
                  }}
                >
                  <div>
                    <strong>{dup.fullName}</strong> — {dup.primaryPhone} ({dup.customerCode})
                  </div>
                  {onSelectExisting && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        onSelectExisting(dup.id);
                        onClose();
                      }}
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                    >
                      Use This Customer
                    </button>
                  )}
                </div>
              ))}
            </div>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                FULL NAME *
              </label>
              <input
                type="text"
                className="input-field"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  checkDupes(primaryPhone, e.target.value, email);
                }}
                placeholder="e.g. Senthil Kumar"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                PRIMARY PHONE NUMBER *
                {isCheckingDupes && <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 400 }}> (checking duplicates...)</span>}
              </label>
              <input
                type="tel"
                className="input-field"
                value={primaryPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="e.g. 98430 11223"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                SECONDARY / WHATSAPP PHONE
              </label>
              <input
                type="tel"
                className="input-field"
                value={secondaryPhone}
                onChange={(e) => setSecondaryPhone(e.target.value)}
                placeholder="Optional secondary contact"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  checkDupes(primaryPhone, fullName, e.target.value);
                }}
                placeholder="client@gmail.com"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                CUSTOMER TYPE
              </label>
              <select
                className="input-field"
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as 'INDIVIDUAL' | 'COMMERCIAL')}
              >
                <option value="INDIVIDUAL">Individual / Retail</option>
                <option value="COMMERCIAL">Corporate / Business Client</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                GSTIN (IF APPLICABLE)
              </label>
              <input
                type="text"
                className="input-field"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="33AAAAA0000A1Z5"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              STREET ADDRESS
            </label>
            <input
              type="text"
              className="input-field"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Door No, Street Name, Area"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                CITY
              </label>
              <input
                type="text"
                className="input-field"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                STATE
              </label>
              <input
                type="text"
                className="input-field"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                PINCODE
              </label>
              <input
                type="text"
                className="input-field"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="641001"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              INTERNAL RECEPTION NOTES
            </label>
            <textarea
              className="input-field"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Referred by ABC Corp, VIP customer, prefers WhatsApp contact"
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
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
              {isLoading ? 'Creating Record...' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
