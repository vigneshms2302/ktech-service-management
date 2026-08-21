import React, { useState } from 'react';
import { KeyRound, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose }) => {
  const { pinLogin } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        submitPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const submitPin = async (enteredPin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await pinLogin(enteredPin);
      if (res.success) {
        setPin('');
        onClose();
      } else {
        setError(res.error || 'Invalid PIN code');
        setPin('');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
      }}
    >
      <div
        className="card"
        style={{
          width: '320px',
          backgroundColor: 'var(--bg-surface)',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={18} color="var(--brand-primary)" />
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Fast PIN Login</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              fontSize: '11px',
              marginBottom: '14px',
            }}
          >
            <AlertCircle size={13} />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: pin.length > idx ? 'var(--brand-primary)' : 'var(--bg-surface-active)',
                border: '2px solid var(--border-color)',
                transition: 'background-color 0.15s ease',
              }}
            />
          ))}
        </div>

        {/* Number Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxWidth: '240px', margin: '0 auto' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
            <button
              key={k}
              disabled={isLoading}
              onClick={() => {
                if (k === 'C') setPin('');
                else if (k === '⌫') handleDelete();
                else handleDigit(k);
              }}
              style={{
                height: '46px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.1s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-active)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'; }}
            >
              {k}
            </button>
          ))}
        </div>

        <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-dim)' }}>
          PINs: Owner: <code>1234</code> | Reception: <code>1111</code> | Tech: <code>2222</code> | Accounts: <code>4444</code>
        </div>
      </div>
    </div>
  );
};
