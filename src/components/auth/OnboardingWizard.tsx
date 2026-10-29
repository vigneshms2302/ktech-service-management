import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';
import { useShop } from '../../context/ShopContext.tsx';
import { saasApi } from '../../api/client.ts';

export const OnboardingWizard: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const { shopSettings, updateShopSettings } = useShop();

  const [step, setStep] = useState(1);
  const [shopName, setShopName] = useState(shopSettings.shopName || '');
  const [phone, setPhone] = useState(shopSettings.phone || '');
  const [address, setAddress] = useState(shopSettings.address || '');
  const [gstin, setGstin] = useState(shopSettings.gstin || '');
  const [upiId, setUpiId] = useState(shopSettings.upiId || '');

  const [techName, setTechName] = useState('');
  const [techPhone, setTechPhone] = useState('');
  const [techPin, setTechPin] = useState('2222');

  const handleSaveStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    updateShopSettings({
      shopName,
      phone,
      address,
      gstin: gstin.toUpperCase(),
      upiId,
    });
    setStep(2);
  };

  const handleSaveStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (techName.trim()) {
      try {
        await saasApi.auth.createUser({
          username: techName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          fullName: techName.trim(),
          phone: techPhone.trim(),
          pinCode: techPin.trim(),
          roleId: 'ROLE_TECHNICIAN',
          password: 'techpassword123',
        });
      } catch (err) {
        console.warn('Could not auto-create tech in onboarding:', err);
      }
    }
    setStep(3);
  };

  const bg = isLight ? '#ffffff' : '#212121';
  const cardBg = isLight ? '#ffffff' : '#212121';
  const borderCol = isLight ? '#e5e5e5' : '#2f2f2f';
  const textMain = isLight ? '#0d0d0d' : '#ececec';
  const textMuted = isLight ? '#676767' : '#b4b4b4';
  const inputBg = isLight ? '#ffffff' : '#2f2f2f';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: bg,
        color: textMain,
        fontFamily: "'Inter', -apple-system, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: '580px', width: '100%', margin: '0 auto' }}>
        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          {[
            { s: 1, label: 'Shop Profile' },
            { s: 2, label: 'Team & PINs' },
            { s: 3, label: 'Ready to Repair' },
          ].map((item) => (
            <div key={item.s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: step >= item.s ? '#10a37f' : isLight ? '#e5e5e5' : '#2f2f2f',
                  color: step >= item.s ? '#ffffff' : textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {step > item.s ? <CheckCircle size={16} /> : item.s}
              </div>
              <span style={{ fontSize: '12.5px', fontWeight: step === item.s ? 700 : 500, color: step === item.s ? textMain : textMuted }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Card Box */}
        <div
          style={{
            padding: '36px',
            borderRadius: '16px',
            backgroundColor: cardBg,
            border: `1px solid ${borderCol}`,
            boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
          }}
        >
          {step === 1 && (
            <form onSubmit={handleSaveStep1} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>Welcome! Configure Your Shop Header</h2>
                <p style={{ fontSize: '13px', color: textMuted }}>
                  These details will appear on your customer thermal intake receipts and GST invoices.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>Shop Name</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: inputBg, color: textMain, fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>Shop Phone / WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: inputBg, color: textMain, fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="33AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: inputBg, color: textMain, fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>Print Address (For Thermal & A4 Invoices)</label>
                <input
                  type="text"
                  required
                  placeholder="1st Floor, Gandhi Road, Main Market"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: inputBg, color: textMain, fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>Shop UPI VPA (For Dynamic QR Code on Bills)</label>
                <input
                  type="text"
                  placeholder="myshop@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: inputBg, color: textMain, fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  backgroundColor: isLight ? '#0d0d0d' : '#ececec',
                  color: isLight ? '#ffffff' : '#0d0d0d',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                Save & Continue to Team Setup <ArrowRight size={16} />
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSaveStep2} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>Add Your First Bench Technician</h2>
                <p style={{ fontSize: '13px', color: textMuted }}>
                  Technicians log in quickly using a 4-digit numeric PIN on shop laptops.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>Technician Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Kumar"
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: inputBg, color: textMain, fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>Mobile Number</label>
                  <input
                    type="text"
                    placeholder="98422 11111"
                    value={techPhone}
                    onChange={(e) => setTechPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: inputBg, color: textMain, fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>Quick Login PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={techPin}
                    onChange={(e) => setTechPin(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: inputBg, color: textMain, fontSize: '13.5px', outline: 'none', boxSizing: 'border-box', letterSpacing: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: 'transparent',
                    color: textMuted,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                  }}
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '12px',
                    backgroundColor: isLight ? '#0d0d0d' : '#ececec',
                    color: isLight ? '#ffffff' : '#0d0d0d',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  Save Technician & Finish <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 163, 127, 0.15)',
                  color: '#10a37f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Sparkles size={32} />
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>Your Shop Workspace is Ready!</h2>
              <p style={{ fontSize: '14px', color: textMuted, lineHeight: 1.6, marginBottom: '28px' }}>
                Your 14-day free trial is now active. You can start admitting laptop and computer repairs immediately.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => navigate('/app/jobs')}
                  style={{
                    padding: '14px',
                    backgroundColor: isLight ? '#0d0d0d' : '#ececec',
                    color: isLight ? '#ffffff' : '#0d0d0d',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '14.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Wrench size={17} /> Create Your First Repair Job Card
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/app/dashboard')}
                  style={{
                    padding: '12px',
                    backgroundColor: 'transparent',
                    color: textMain,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                  }}
                >
                  Go to Executive Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
