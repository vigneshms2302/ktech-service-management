import React, { useState, useRef } from 'react';
import {
  Shield,
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Users,
  Plus,
  Trash2,
  User,
  AtSign,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Mail,
  MapPin,
  QrCode,
  Receipt,
  KeyRound,
  ShieldCheck,
  Check,
  Store,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useShop } from '../../context/ShopContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';

interface SetupWizardProps {
  onSetupComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onSetupComplete }) => {
  const { refreshUserList } = useAuth();
  const { updateShopSettings } = useShop();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Owner Account State
  const [ownerName, setOwnerName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('admin');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerConfirmPassword, setOwnerConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pinDigits, setPinDigits] = useState<[string, string, string, string]>(['', '', '', '']);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  // Pin Input Refs for Auto-Advance
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handlePinChange = (index: number, val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    const newDigits: [string, string, string, string] = [...pinDigits];
    
    if (cleaned.length > 0) {
      newDigits[index] = cleaned[cleaned.length - 1];
      setPinDigits(newDigits);
      if (index < 3) {
        pinRefs[index + 1].current?.focus();
      }
    } else {
      newDigits[index] = '';
      setPinDigits(newDigits);
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const getOwnerPin = () => pinDigits.join('');

  // Step 2: Shop & Business Profile State
  const [shopName, setShopName] = useState('');
  const [shopTagline, setShopTagline] = useState('Advanced Chip-Level Service & IT Solutions');
  const [shopPhone, setShopPhone] = useState('');
  const [shopEmail, setShopEmail] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopCity, setShopCity] = useState('');
  const [shopState, setShopState] = useState('');
  const [shopPincode, setShopPincode] = useState('');
  const [shopGstin, setShopGstin] = useState('');
  const [shopUpiId, setShopUpiId] = useState('');

  // Step 3: Additional Staff State (Optional)
  const [staffList, setStaffList] = useState<Array<{
    fullName: string;
    username: string;
    roleId: string;
    pinCode: string;
    phone: string;
  }>>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('ROLE_TECHNICIAN');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');

  const handleAddStaff = () => {
    if (!newStaffName.trim() || !newStaffUsername.trim()) {
      setErrorMessage('Please enter staff member full name and username.');
      return;
    }
    setErrorMessage(null);
    setStaffList((prev) => [
      ...prev,
      {
        fullName: newStaffName.trim(),
        username: newStaffUsername.trim().toLowerCase(),
        roleId: newStaffRole,
        pinCode: newStaffPin.trim() || '1111',
        phone: newStaffPhone.trim(),
      },
    ]);
    setNewStaffName('');
    setNewStaffUsername('');
    setNewStaffPin('');
    setNewStaffPhone('');
  };

  const handleRemoveStaff = (index: number) => {
    setStaffList((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep1 = () => {
    setErrorMessage(null);
    if (!ownerName.trim()) {
      setErrorMessage('Please enter the Administrator / Owner full name.');
      return false;
    }
    if (!ownerUsername.trim()) {
      setErrorMessage('Please enter an admin username.');
      return false;
    }
    if (!ownerPassword.trim() || ownerPassword.length < 6) {
      setErrorMessage('Master password must be at least 6 characters.');
      return false;
    }
    if (ownerPassword !== ownerConfirmPassword) {
      setErrorMessage('Master password and confirmation do not match.');
      return false;
    }
    const pin = getOwnerPin();
    if (pin.length < 4) {
      setErrorMessage('Please enter a complete 4-digit quick terminal PIN.');
      pinRefs[pin.length]?.current?.focus();
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    setErrorMessage(null);
    if (!shopName.trim()) {
      setErrorMessage('Please enter your business or service center name.');
      return false;
    }
    if (!shopPhone.trim()) {
      setErrorMessage('Please enter the official business contact phone number.');
      return false;
    }
    if (!shopAddress.trim()) {
      setErrorMessage('Please enter the shop street address.');
      return false;
    }
    return true;
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (!window.electronAPI?.system?.completeSetup) {
        throw new Error('System initialization IPC API unavailable.');
      }

      const res = await window.electronAPI.system.completeSetup({
        owner: {
          fullName: ownerName.trim(),
          username: ownerUsername.trim().toLowerCase(),
          password: ownerPassword.trim(),
          pinCode: getOwnerPin(),
          phone: ownerPhone.trim() || undefined,
          email: ownerEmail.trim() || undefined,
        },
        shop: {
          shopName: shopName.trim(),
          tagline: shopTagline.trim() || undefined,
          phone: shopPhone.trim(),
          email: shopEmail.trim() || undefined,
          address: shopAddress.trim(),
          city: shopCity.trim() || undefined,
          state: shopState.trim() || undefined,
          pincode: shopPincode.trim() || undefined,
          gstin: shopGstin.trim() || undefined,
          upiId: shopUpiId.trim() || undefined,
        },
        technicians: staffList.map((s) => ({
          fullName: s.fullName,
          username: s.username,
          pinCode: s.pinCode,
          phone: s.phone || undefined,
          roleId: s.roleId,
        })),
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to complete initial software setup');
      }

      updateShopSettings({
        shopName: shopName.trim(),
        tagline: shopTagline.trim(),
        phone: shopPhone.trim(),
        address: [shopAddress.trim(), shopCity.trim(), shopState.trim(), shopPincode.trim()].filter(Boolean).join(', '),
        gstin: shopGstin.trim(),
        upiId: shopUpiId.trim(),
      });

      await refreshUserList();
      onSetupComplete();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Setup encountered an error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: isLight ? '#f1f5f9' : '#060a12',
        backgroundImage: isLight
          ? 'radial-gradient(ellipse 70% 60% at 50% -10%, rgba(2, 132, 199, 0.18), rgba(241, 245, 249, 0)), radial-gradient(circle at 100% 100%, rgba(56, 189, 248, 0.08), transparent 40%)'
          : 'radial-gradient(ellipse 70% 60% at 50% -10%, rgba(2, 132, 199, 0.25), rgba(6, 10, 18, 0)), radial-gradient(circle at 100% 100%, rgba(56, 189, 248, 0.12), transparent 40%)',
        color: isLight ? '#0f172a' : '#f8fafc',
        fontFamily: "var(--font-sans, 'Inter', -apple-system, sans-serif)",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        zIndex: 99999,
        overflow: 'hidden',
        height: '100vh',
        width: '100vw',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: 'calc(100vh - 24px)',
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: isLight ? '1px solid rgba(203, 213, 225, 0.8)' : '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '16px',
          boxShadow: isLight
            ? '0 20px 50px -15px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.8)'
            : '0 25px 70px -15px rgba(0, 0, 0, 0.9), 0 0 40px -10px rgba(2, 132, 199, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Header & Integrated Stepper */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: isLight ? 'rgba(248, 250, 252, 0.85)' : 'rgba(11, 19, 38, 0.85)',
            borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          {/* Brand Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px -2px rgba(2, 132, 199, 0.5)',
              }}
            >
              <Store size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff', letterSpacing: '-0.01em' }}>
                  K-Connect Setup
                </span>
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    backgroundColor: 'rgba(2, 132, 199, 0.12)',
                    color: '#0284c7',
                    border: '1px solid rgba(2, 132, 199, 0.25)',
                  }}
                >
                  NEW SOFTWARE
                </span>
              </div>
              <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8' }}>
                4-step workstation personalization
              </div>
            </div>
          </div>

          {/* Stepper Steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {[
              { num: 1, label: 'Owner Account', icon: Shield },
              { num: 2, label: 'Shop Profile', icon: Building2 },
              { num: 3, label: 'Staff', icon: Users },
              { num: 4, label: 'Launch', icon: Sparkles },
            ].map((s) => {
              const StepIcon = s.icon;
              const isActive = step === s.num;
              const isDone = step > s.num;

              return (
                <div
                  key={s.num}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    backgroundColor: isActive
                      ? '#0284c7'
                      : isDone
                      ? isLight
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(16, 185, 129, 0.18)'
                      : isLight
                      ? '#f1f5f9'
                      : 'rgba(255, 255, 255, 0.04)',
                    color: isActive
                      ? '#ffffff'
                      : isDone
                      ? isLight
                        ? '#059669'
                        : '#34d399'
                      : isLight
                      ? '#64748b'
                      : '#64748b',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isDone ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    <StepIcon size={12} strokeWidth={2.2} />
                  )}
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          {errorMessage && (
            <div
              style={{
                marginBottom: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.12)',
                border: isLight ? '1px solid #fecaca' : '1px solid rgba(239, 68, 68, 0.3)',
                color: isLight ? '#dc2626' : '#f87171',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ================= STEP 1: OWNER ACCOUNT ================= */}
          {step === 1 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ marginBottom: '4px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 2px', color: isLight ? '#0f172a' : '#ffffff' }}>
                  Step 1: Super Administrator & Owner Profile
                </h2>
                <p style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', margin: 0 }}>
                  Create the master owner credentials with authority over settings, financial reports, passcodes, and staff.
                </p>
              </div>

              {/* Group 1: Master Credentials */}
              <div className="setup-group-card" style={{ marginBottom: '8px' }}>
                <div className="setup-group-header">
                  <ShieldCheck size={14} />
                  <span>Master Administrator Credentials</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px' }}>
                  {/* Owner Full Name */}
                  <div className="ktech-field">
                    <label className="ktech-label">
                      <span>Owner Full Name<span className="req-star">*</span></span>
                    </label>
                    <div className="ktech-input-box">
                      <div className="field-icon-left">
                        <User size={14} />
                      </div>
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g. K. Vignesh"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Admin Username */}
                  <div className="ktech-field">
                    <label className="ktech-label">
                      <span>Admin Username<span className="req-star">*</span></span>
                    </label>
                    <div className="ktech-input-box">
                      <div className="field-icon-left">
                        <AtSign size={14} />
                      </div>
                      <input
                        type="text"
                        value={ownerUsername}
                        onChange={(e) => setOwnerUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="admin"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>

                  {/* Master Password */}
                  <div className="ktech-field">
                    <label className="ktech-label">
                      <span>Master Password<span className="req-star">*</span></span>
                    </label>
                    <div className="ktech-input-box">
                      <div className="field-icon-left">
                        <Lock size={14} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="field-action-right"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="ktech-field">
                    <label className="ktech-label">
                      <span>Confirm Password<span className="req-star">*</span></span>
                    </label>
                    <div className="ktech-input-box">
                      <div className="field-icon-left">
                        <KeyRound size={14} />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={ownerConfirmPassword}
                        onChange={(e) => setOwnerConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="field-action-right"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 2: Quick Access PIN & Contact */}
              <div className="setup-group-card" style={{ marginBottom: 0 }}>
                <div className="setup-group-header">
                  <Cpu size={14} />
                  <span>Terminal Fast-Access PIN & Contact</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '16px', alignItems: 'flex-start' }}>
                  {/* Segmented 4-Digit PIN */}
                  <div className="ktech-field">
                    <label className="ktech-label">
                      <span>Quick 4-Digit PIN<span className="req-star">*</span></span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {[0, 1, 2, 3].map((idx) => (
                        <input
                          key={idx}
                          ref={pinRefs[idx]}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          className="pin-digit-cell"
                          value={pinDigits[idx]}
                          onChange={(e) => handlePinChange(idx, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(idx, e)}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      1-click terminal lock / unlock
                    </span>
                  </div>

                  {/* Mobile Phone */}
                  <div className="ktech-field">
                    <label className="ktech-label">
                      <span>Owner Mobile Phone</span>
                    </label>
                    <div className="ktech-input-box">
                      <div className="field-icon-left">
                        <Phone size={14} />
                      </div>
                      <input
                        type="text"
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="ktech-field">
                    <label className="ktech-label">
                      <span>Owner Email Address</span>
                    </label>
                    <div className="ktech-input-box">
                      <div className="field-icon-left">
                        <Mail size={14} />
                      </div>
                      <input
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="owner@yourshop.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: SHOP PROFILE & BRANDING ================= */}
          {step === 2 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ marginBottom: '4px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 2px', color: isLight ? '#0f172a' : '#ffffff' }}>
                  Step 2: Service Center & Business Profile
                </h2>
                <p style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', margin: 0 }}>
                  This branding will print on intake slips, WhatsApp alerts, estimate memos, and GST tax invoices.
                </p>
              </div>

              {/* Group 1: Business Identity */}
              <div className="setup-group-card" style={{ marginBottom: '8px' }}>
                <div className="setup-group-header">
                  <Store size={14} />
                  <span>Business Branding & Contact</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px' }}>
                  {/* Shop Name */}
                  <div className="ktech-field">
                    <label className="ktech-label">
                      <span>Shop / Service Center Name<span className="req-star">*</span></span>
                    </label>
                    <div className="ktech-input-box">
                      <div className="field-icon-left">
                        <Building2 size={14} />
                      </div>
                      <input
                        type="text"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="e.g. Sri Krishna IT Care"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Tagline */}
                  <div className="ktech-field">
                    <label className="ktech-label">
                      <span>Tagline / Subtitle</span>
                    </label>
                    <div className="ktech-input-box">
                      <div className="field-icon-left">
                        <Sparkles size={14} />
                      </div>
                      <input
                        type="text"
                        value={shopTagline}
                        onChange={(e) => setShopTagline(e.target.value)}
                        placeholder="Chip-Level Repair Lab"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="ktech-field">
                    <label className="ktech-label">
                      <span>Contact Phone<span className="req-star">*</span></span>
                    </label>
                    <div className="ktech-input-box">
                      <div className="field-icon-left">
                        <Phone size={14} />
                      </div>
                      <input
                        type="text"
                        value={shopPhone}
                        onChange={(e) => setShopPhone(e.target.value)}
                        placeholder="+91 98400 12345"
                      />
                    </div>
                  </div>

                  {/* Support Email */}
                  <div className="ktech-field">
                    <label className="ktech-label">
                      <span>Support Email</span>
                    </label>
                    <div className="ktech-input-box">
                      <div className="field-icon-left">
                        <Mail size={14} />
                      </div>
                      <input
                        type="email"
                        value={shopEmail}
                        onChange={(e) => setShopEmail(e.target.value)}
                        placeholder="support@yourshop.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 2: Location & Tax / Payments */}
              <div className="setup-group-card" style={{ marginBottom: 0 }}>
                <div className="setup-group-header">
                  <MapPin size={14} />
                  <span>Physical Address, GST & Digital Invoicing</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr 0.9fr 0.8fr 1fr 1fr', gap: '8px' }}>
                  <div className="ktech-field">
                    <label className="ktech-label">
                      <span>Street Address<span className="req-star">*</span></span>
                    </label>
                    <div className="ktech-input-box">
                      <div className="field-icon-left">
                        <MapPin size={14} />
                      </div>
                      <input
                        type="text"
                        value={shopAddress}
                        onChange={(e) => setShopAddress(e.target.value)}
                        placeholder="Shop #12, Cross-Cut Rd"
                      />
                    </div>
                  </div>

                  <div className="ktech-field">
                    <label className="ktech-label">City</label>
                    <div className="ktech-input-box">
                      <input
                        type="text"
                        className="no-icon"
                        value={shopCity}
                        onChange={(e) => setShopCity(e.target.value)}
                        placeholder="Coimbatore"
                      />
                    </div>
                  </div>

                  <div className="ktech-field">
                    <label className="ktech-label">State</label>
                    <div className="ktech-input-box">
                      <input
                        type="text"
                        className="no-icon"
                        value={shopState}
                        onChange={(e) => setShopState(e.target.value)}
                        placeholder="Tamil Nadu"
                      />
                    </div>
                  </div>

                  <div className="ktech-field">
                    <label className="ktech-label">Pincode</label>
                    <div className="ktech-input-box">
                      <input
                        type="text"
                        className="no-icon"
                        value={shopPincode}
                        onChange={(e) => setShopPincode(e.target.value)}
                        placeholder="641012"
                      />
                    </div>
                  </div>

                  {/* GSTIN */}
                  <div className="ktech-field">
                    <label className="ktech-label">
                      <span>GSTIN (Optional)</span>
                    </label>
                    <div className="ktech-input-box">
                      <div className="field-icon-left">
                        <Receipt size={14} />
                      </div>
                      <input
                        type="text"
                        value={shopGstin}
                        onChange={(e) => setShopGstin(e.target.value.toUpperCase())}
                        placeholder="33AAAAA0000A1Z5"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>

                  {/* UPI ID */}
                  <div className="ktech-field">
                    <label className="ktech-label">
                      <span>UPI QR ID</span>
                    </label>
                    <div className="ktech-input-box">
                      <div className="field-icon-left">
                        <QrCode size={14} />
                      </div>
                      <input
                        type="text"
                        value={shopUpiId}
                        onChange={(e) => setShopUpiId(e.target.value)}
                        placeholder="yourshop@upi"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: INITIAL STAFF / TECHNICIANS ================= */}
          {step === 3 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ marginBottom: '4px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 2px', color: isLight ? '#0f172a' : '#ffffff' }}>
                  Step 3: Bench Technicians & Front Desk (Optional)
                </h2>
                <p style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', margin: 0 }}>
                  Add your bench staff or front desk team now, or skip and manage them anytime in Settings.
                </p>
              </div>

              {/* Add New Staff Mini Form */}
              <div className="setup-group-card" style={{ marginBottom: '8px' }}>
                <div className="setup-group-header">
                  <Plus size={14} />
                  <span>Add Staff Member</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr auto', gap: '8px', alignItems: 'flex-end' }}>
                  <div className="ktech-field">
                    <label className="ktech-label">Full Name</label>
                    <div className="ktech-input-box">
                      <input
                        type="text"
                        className="no-icon"
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                      />
                    </div>
                  </div>

                  <div className="ktech-field">
                    <label className="ktech-label">Username</label>
                    <div className="ktech-input-box">
                      <input
                        type="text"
                        className="no-icon"
                        value={newStaffUsername}
                        onChange={(e) => setNewStaffUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="ramesh"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>

                  <div className="ktech-field">
                    <label className="ktech-label">Role</label>
                    <div className="ktech-input-box">
                      <select
                        className="no-icon"
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value)}
                      >
                        <option value="ROLE_TECHNICIAN">Technician</option>
                        <option value="ROLE_RECEPTION">Front Desk</option>
                        <option value="ROLE_ACCOUNTS">Accounts</option>
                      </select>
                    </div>
                  </div>

                  <div className="ktech-field">
                    <label className="ktech-label">PIN</label>
                    <div className="ktech-input-box">
                      <input
                        type="text"
                        maxLength={4}
                        className="no-icon"
                        value={newStaffPin}
                        onChange={(e) => setNewStaffPin(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="1122"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddStaff}
                    style={{ height: '36px', padding: '0 14px', borderRadius: '8px' }}
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Roster List */}
              <div className="setup-group-card" style={{ marginBottom: 0, maxHeight: '130px', overflowY: 'auto' }}>
                <div className="setup-group-header">
                  <Users size={14} />
                  <span>Configured Staff Roster ({staffList.length})</span>
                </div>

                {staffList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-dim)', fontSize: '11.5px' }}>
                    No additional staff added yet. (You can skip this step or add staff now).
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {staffList.map((s, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          backgroundColor: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)',
                          border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '11.5px',
                            }}
                          >
                            {s.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '12px', color: isLight ? '#0f172a' : '#ffffff' }}>
                              {s.fullName}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              @{s.username} • PIN: {s.pinCode} • <span style={{ color: '#0284c7', fontWeight: 600 }}>{s.roleId.replace('ROLE_', '')}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveStaff(idx)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#f87171',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 4: REVIEW & LAUNCH WORKSTATION ================= */}
          {step === 4 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ marginBottom: '4px', textAlign: 'center' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 6px',
                  }}
                >
                  <Sparkles size={22} />
                </div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 2px', color: isLight ? '#0f172a' : '#ffffff' }}>
                  Ready to Launch Your Workstation!
                </h2>
                <p style={{ fontSize: '11.5px', color: isLight ? '#64748b' : '#94a3b8', margin: 0 }}>
                  Review your configured business profile before entering your clean workspace.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                {/* Shop Card */}
                <div className="setup-group-card" style={{ marginBottom: 0 }}>
                  <div className="setup-group-header">
                    <Building2 size={14} />
                    <span>Business Profile</span>
                  </div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>
                    {shopName}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {shopTagline}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-main)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={12} color="#0284c7" />
                    <span>{shopPhone}</span>
                    {shopEmail && <span>• ✉️ {shopEmail}</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <MapPin size={12} color="#0284c7" style={{ marginTop: '1px', flexShrink: 0 }} />
                    <span>{[shopAddress, shopCity, shopState, shopPincode].filter(Boolean).join(', ')}</span>
                  </div>
                  {shopGstin && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                      GSTIN: <span style={{ fontWeight: 700 }}>{shopGstin}</span>
                    </div>
                  )}
                </div>

                {/* Admin Card */}
                <div className="setup-group-card" style={{ marginBottom: 0 }}>
                  <div className="setup-group-header" style={{ color: '#8b5cf6' }}>
                    <ShieldCheck size={14} />
                    <span>Administrator Profile</span>
                  </div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>
                    {ownerName}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Username: <strong style={{ fontFamily: 'var(--font-mono)', color: isLight ? '#0f172a' : '#ffffff' }}>@{ownerUsername}</strong>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-main)', marginTop: '6px' }}>
                    Counter PIN: <strong style={{ fontFamily: 'var(--font-mono)', letterSpacing: '2px', color: '#0284c7' }}>{getOwnerPin()}</strong>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Staff Configured: <strong>{staffList.length} member(s)</strong>
                  </div>
                  {(ownerPhone || ownerEmail) && (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px', paddingTop: '6px', borderTop: isLight ? '1px solid #f1f5f9' : '1px solid rgba(255, 255, 255, 0.08)' }}>
                      {ownerPhone && <span>📞 {ownerPhone} </span>}
                      {ownerEmail && <span>✉️ {ownerEmail}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Navigation Buttons */}
          <div
            style={{
              paddingTop: '12px',
              marginTop: 'auto',
              borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            {step > 1 ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
                disabled={isSubmitting}
                style={{ padding: '6px 14px', borderRadius: '8px', height: '36px', fontSize: '12px' }}
              >
                <ArrowLeft size={13} />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (step === 1 && !validateStep1()) return;
                  if (step === 2 && !validateStep2()) return;
                  setStep((prev) => (prev + 1) as 2 | 3 | 4);
                }}
                style={{
                  padding: '0 20px',
                  height: '36px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  boxShadow: '0 4px 12px -2px rgba(2, 132, 199, 0.4)',
                }}
              >
                <span>Continue</span>
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                style={{
                  padding: '0 22px',
                  height: '38px',
                  fontSize: '13px',
                  fontWeight: 800,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  boxShadow: '0 6px 16px -2px rgba(16, 185, 129, 0.4)',
                }}
              >
                {isSubmitting ? (
                  <span>Initializing Workstation...</span>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Complete Setup & Launch K-Connect</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
