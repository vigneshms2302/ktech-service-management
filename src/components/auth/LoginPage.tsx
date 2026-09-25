import React, { useState, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  Lock,
  User,
  Eye,
  EyeOff,
  Receipt,
  MessageSquare,
  Package,
  Wrench,
  AlertCircle,
  Clock,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useShop } from '../../context/ShopContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';

export const LoginPage: React.FC = () => {
  const { login, pinLogin } = useAuth();
  const { shopSettings } = useShop();
  const { theme, toggleTheme } = useTheme();

  const isLight = theme === 'light';

  const [activeMode, setActiveMode] = useState<'PIN' | 'PASSWORD'>('PIN');
  const [selectedUser, setSelectedUser] = useState<string>('USR_OWNER');
  const [pinCode, setPinCode] = useState<string>('');
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update live clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard support for PIN entry when in PIN mode
  useEffect(() => {
    if (activeMode !== 'PIN') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        if (pinCode.length < 6) {
          handlePinDigit(e.key);
        }
      } else if (e.key === 'Backspace') {
        setPinCode((prev) => prev.slice(0, -1));
        setError(null);
      } else if (e.key === 'Enter') {
        if (pinCode.length >= 4) {
          handlePinSubmit();
        }
      } else if (e.key === 'Escape') {
        setPinCode('');
        setError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMode, pinCode, selectedUser]);

  const handlePinDigit = (digit: string) => {
    if (pinCode.length >= 6) return;
    setError(null);
    const newPin = pinCode + digit;
    setPinCode(newPin);

    // Auto submit if 4 digits matching standard user PINs
    if (newPin.length === 4) {
      executePinAuth(newPin);
    }
  };

  const handlePinDelete = () => {
    setPinCode((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handlePinClear = () => {
    setPinCode('');
    setError(null);
  };

  const executePinAuth = async (pin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await pinLogin(pin);
      if (!res.success) {
        setError(res.error || 'Incorrect PIN code entered');
        setPinCode('');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Authentication error');
      setPinCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = () => {
    if (pinCode.length < 4) {
      setError('Please enter at least 4 digits');
      return;
    }
    executePinAuth(pinCode);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await login({ username: username.trim(), password });
      if (!res.success) {
        setError(res.error || 'Invalid username or password');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  const selectQuickUser = (userId: string, defaultPin: string, defaultUsername: string) => {
    setSelectedUser(userId);
    setPinCode('');
    setUsername(defaultUsername);
    setError(null);

    // Auto-fill demonstration PIN if clicked
    if (activeMode === 'PIN') {
      setPinCode(defaultPin);
    }
  };

  const getRoleColor = (roleId?: string) => {
    switch (roleId) {
      case 'ROLE_OWNER':
        return {
          bg: isLight ? 'rgba(168, 85, 247, 0.12)' : 'rgba(168, 85, 247, 0.15)',
          text: isLight ? '#7e22ce' : '#c084fc',
          border: '#a855f7',
        };
      case 'ROLE_RECEPTION':
        return {
          bg: isLight ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.15)',
          text: isLight ? '#1d4ed8' : '#60a5fa',
          border: '#3b82f6',
        };
      case 'ROLE_TECHNICIAN':
        return {
          bg: isLight ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.15)',
          text: isLight ? '#b45309' : '#fbbf24',
          border: '#f59e0b',
        };
      case 'ROLE_ACCOUNTS':
        return {
          bg: isLight ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.15)',
          text: isLight ? '#047857' : '#34d399',
          border: '#10b981',
        };
      default:
        return {
          bg: isLight ? 'rgba(100, 116, 139, 0.12)' : 'rgba(148, 163, 184, 0.15)',
          text: isLight ? '#334155' : '#94a3b8',
          border: '#64748b',
        };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: isLight ? '#f1f5f9' : '#070b14',
        backgroundImage: isLight
          ? 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(2, 132, 199, 0.15), rgba(241, 245, 249, 0))'
          : 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(2, 132, 199, 0.18), rgba(255, 255, 255, 0))',
        color: isLight ? '#0f172a' : '#f8fafc',
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 9999,
        overflowY: 'auto',
        transition: 'background-color 0.25s ease, color 0.25s ease',
      }}
    >
      {/* Background Decorative Grid Pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: isLight
            ? 'radial-gradient(rgba(15, 23, 42, 0.06) 1px, transparent 1px), radial-gradient(rgba(2, 132, 199, 0.05) 1px, transparent 1px)'
            : 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), radial-gradient(rgba(2, 132, 199, 0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 16px 16px',
          pointerEvents: 'none',
          opacity: isLight ? 0.8 : 0.7,
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1050px',
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: isLight ? '1px solid rgba(2, 132, 199, 0.22)' : '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '20px',
          boxShadow: isLight
            ? '0 20px 50px -10px rgba(15, 23, 42, 0.12), 0 0 35px -5px rgba(2, 132, 199, 0.15)'
            : '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px -10px rgba(2, 132, 199, 0.25)',
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          overflow: 'hidden',
          minHeight: '620px',
          transition: 'all 0.25s ease',
        }}
      >
        {/* Floating Theme Toggle Switch in top-right of container */}
        <button
          type="button"
          onClick={toggleTheme}
          title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
            backgroundColor: isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.8)',
            color: isLight ? '#0284c7' : '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isLight ? '0 2px 6px rgba(0, 0, 0, 0.06)' : '0 2px 8px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isLight ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* LEFT COLUMN: BRAND HERO & SYSTEM CAPABILITIES */}
        <div
          style={{
            padding: '40px',
            backgroundColor: isLight ? 'rgba(248, 250, 252, 0.88)' : 'rgba(11, 19, 38, 0.65)',
            borderRight: isLight ? '1px solid rgba(226, 232, 240, 0.9)' : '1px solid rgba(255, 255, 255, 0.07)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <div>
            {/* Top Brand Tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 16px -4px rgba(2, 132, 199, 0.5)',
                  fontWeight: 900,
                  fontSize: '22px',
                  color: '#ffffff',
                  letterSpacing: '-1px',
                }}
              >
                K
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '0.5px', color: isLight ? '#0f172a' : '#ffffff' }}>
                  K-CONNECT
                </div>
                <div style={{ fontSize: '11px', color: isLight ? '#0284c7' : '#38bdf8', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Service & Business Management OS
                </div>
              </div>
            </div>

            {/* Shop Title Info */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: isLight ? 'rgba(2, 132, 199, 0.06)' : 'rgba(2, 132, 199, 0.08)',
                border: isLight ? '1px solid rgba(2, 132, 199, 0.2)' : '1px solid rgba(2, 132, 199, 0.2)',
                marginBottom: '28px',
              }}
            >
              <div style={{ fontSize: '10.5px', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Licensed To Workstation
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: isLight ? '#0f172a' : '#f8fafc', marginTop: '2px' }}>
                {shopSettings.shopName || 'KTech Computers'}
              </div>
              <div style={{ fontSize: '11.5px', color: isLight ? '#475569' : '#64748b', marginTop: '3px', lineHeight: 1.4 }}>
                {shopSettings.address || 'Gandhi Road, Service Center'} {shopSettings.phone ? `• ${shopSettings.phone}` : ''}
              </div>
            </div>

            {/* Feature Highlights Showcase */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: isLight ? '#475569' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Integrated Workstation Capabilities
              </div>

              {[
                {
                  icon: Wrench,
                  title: 'Intake & Diagnostics Engine',
                  desc: 'Hardware checklists, root cause logs & passcode vault',
                  color: isLight ? '#0284c7' : '#38bdf8',
                  bg: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                },
                {
                  icon: Receipt,
                  title: 'GST Billing & Advance Memos',
                  desc: 'Instant 0% Non-GST / 18% GST switching & cash receipts',
                  color: isLight ? '#059669' : '#10b981',
                  bg: isLight ? 'rgba(5, 150, 105, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                },
                {
                  icon: MessageSquare,
                  title: '1-Click WhatsApp Communications',
                  desc: 'Intake receipts, estimate approvals & delivery alerts',
                  color: isLight ? '#16a34a' : '#22c55e',
                  bg: isLight ? 'rgba(22, 163, 74, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                },
                {
                  icon: Package,
                  title: 'Component Harvest & Donor Inventory',
                  desc: 'Chip-level parts tracking & automated job allocations',
                  color: isLight ? '#d97706' : '#f59e0b',
                  bg: isLight ? 'rgba(217, 119, 6, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                },
              ].map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: feat.bg,
                        border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} color={feat.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: isLight ? '#1e293b' : '#e2e8f0' }}>{feat.title}</div>
                      <div style={{ fontSize: '11px', color: isLight ? '#64748b' : '#94a3b8', lineHeight: 1.35 }}>{feat.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Live System Indicator */}
          <div
            style={{
              paddingTop: '20px',
              borderTop: isLight ? '1px solid rgba(226, 232, 240, 0.9)' : '1px solid rgba(255, 255, 255, 0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: isLight ? '#64748b' : '#64748b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                }}
              />
              <span style={{ fontWeight: 600, color: isLight ? '#334155' : '#94a3b8' }}>Embedded SQLite Active</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isLight ? '#334155' : '#94a3b8', fontFamily: 'monospace' }}>
              <Clock size={12} />
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE AUTHENTICATION PANEL */}
        <div
          style={{
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.65)' : 'rgba(15, 23, 42, 0.45)',
          }}
        >
          <div>
            {/* Header & Mode Segmented Pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingRight: '40px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>Terminal Access</h2>
                <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: isLight ? '#475569' : '#94a3b8' }}>
                  {activeMode === 'PIN' ? 'Select staff profile & enter numeric PIN' : 'Enter account username and password'}
                </p>
              </div>

              {/* Mode Switcher */}
              <div
                style={{
                  display: 'inline-flex',
                  padding: '3px',
                  backgroundColor: isLight ? '#f1f5f9' : 'rgba(15, 23, 42, 0.8)',
                  borderRadius: '8px',
                  border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('PIN');
                    setError(null);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: activeMode === 'PIN' ? 700 : 500,
                    backgroundColor: activeMode === 'PIN' ? '#0284c7' : 'transparent',
                    color: activeMode === 'PIN' ? '#ffffff' : (isLight ? '#475569' : '#94a3b8'),
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Zap size={12} /> Quick PIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('PASSWORD');
                    setError(null);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: activeMode === 'PASSWORD' ? 700 : 500,
                    backgroundColor: activeMode === 'PASSWORD' ? '#0284c7' : 'transparent',
                    color: activeMode === 'PASSWORD' ? '#ffffff' : (isLight ? '#475569' : '#94a3b8'),
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <KeyRound size={12} /> Password
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)',
                  border: isLight ? '1px solid #fecaca' : '1px solid rgba(239, 68, 68, 0.3)',
                  color: isLight ? '#dc2626' : '#f87171',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* MODE 1: RAPID STAFF PROFILES + PIN KEYPAD */}
            {activeMode === 'PIN' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Staff Profiles Carousel/Grid */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {[
                    { id: 'USR_OWNER', name: 'K. Vignesh', role: 'Owner / Admin', pin: '1234', username: 'admin', roleId: 'ROLE_OWNER' },
                    { id: 'USR_RECEPTION', name: 'Anitha M.', role: 'Front Desk', pin: '1111', username: 'reception', roleId: 'ROLE_RECEPTION' },
                    { id: 'USR_TECH1', name: 'Rajesh K.', role: 'Senior Tech', pin: '2222', username: 'tech1', roleId: 'ROLE_TECHNICIAN' },
                    { id: 'USR_TECH2', name: 'Suresh P.', role: 'Chip Tech', pin: '3333', username: 'tech2', roleId: 'ROLE_TECHNICIAN' },
                    { id: 'USR_ACCOUNTS', name: 'Priya S.', role: 'Accounts', pin: '4444', username: 'accounts', roleId: 'ROLE_ACCOUNTS' },
                  ].map((usr) => {
                    const isSelected = selectedUser === usr.id;
                    const rColor = getRoleColor(usr.roleId);
                    return (
                      <button
                        key={usr.id}
                        type="button"
                        onClick={() => selectQuickUser(usr.id, usr.pin, usr.username)}
                        style={{
                          flex: '1 0 76px',
                          padding: '8px 6px',
                          borderRadius: '10px',
                          backgroundColor: isSelected
                            ? (isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(2, 132, 199, 0.2)')
                            : (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)'),
                          border: isSelected
                            ? '1.5px solid #0284c7'
                            : (isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)'),
                          color: isLight ? '#0f172a' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                          transform: isSelected ? 'scale(1.02)' : 'none',
                          boxShadow: isLight && isSelected ? '0 2px 8px rgba(2, 132, 199, 0.2)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: rColor.border,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#ffffff',
                          }}
                        >
                          {usr.name.charAt(0)}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {usr.name}
                        </div>
                        <div
                          style={{
                            fontSize: '9px',
                            padding: '1px 4px',
                            borderRadius: '4px',
                            backgroundColor: rColor.bg,
                            color: rColor.text,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          PIN: {usr.pin}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* PIN Dots Indicator */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 0',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {[0, 1, 2, 3].map((idx) => {
                      const isFilled = pinCode.length > idx;
                      return (
                        <div
                          key={idx}
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            border: isFilled
                              ? '2px solid #0284c7'
                              : (isLight ? '2px solid #cbd5e1' : '2px solid rgba(255, 255, 255, 0.2)'),
                            backgroundColor: isFilled
                              ? (isLight ? '#0284c7' : '#38bdf8')
                              : (isLight ? '#e2e8f0' : 'transparent'),
                            boxShadow: isFilled
                              ? (isLight ? '0 0 8px rgba(2, 132, 199, 0.5)' : '0 0 10px #38bdf8')
                              : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '11px', color: isLight ? '#475569' : '#64748b', marginTop: '6px' }}>
                    {isLoading ? 'Authenticating...' : 'Type PIN on physical keyboard or click below'}
                  </div>
                </div>

                {/* Numeric Keypad */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    maxWidth: '280px',
                    margin: '0 auto',
                    width: '100%',
                  }}
                >
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        if (k === 'C') handlePinClear();
                        else if (k === '⌫') handlePinDelete();
                        else handlePinDigit(k);
                      }}
                      disabled={isLoading}
                      style={{
                        padding: '12px 0',
                        fontSize: k === 'C' || k === '⌫' ? '13px' : '16px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        backgroundColor:
                          k === 'C'
                            ? (isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)')
                            : k === '⌫'
                            ? (isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)')
                            : (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.05)'),
                        border:
                          k === 'C'
                            ? (isLight ? '1px solid #fecaca' : '1px solid rgba(239, 68, 68, 0.3)')
                            : (isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.08)'),
                        color:
                          k === 'C'
                            ? (isLight ? '#dc2626' : '#f87171')
                            : (isLight ? '#0f172a' : '#f8fafc'),
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                        boxShadow: isLight
                          ? '0 2px 4px rgba(15, 23, 42, 0.05)'
                          : '0 2px 4px rgba(0, 0, 0, 0.2)',
                      }}
                      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
                      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* MODE 2: CLASSIC USERNAME & PASSWORD LOGIN */}
            {activeMode === 'PASSWORD' && (
              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: isLight ? '#475569' : '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Username / Staff ID
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: isLight ? '#94a3b8' : '#64748b' }} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. admin, reception, tech1, tech2"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        backgroundColor: isLight ? '#ffffff' : 'rgba(11, 17, 30, 0.8)',
                        border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: isLight ? '#0f172a' : '#f8fafc',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: isLight ? '#475569' : '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: isLight ? '#94a3b8' : '#64748b' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 36px',
                        backgroundColor: isLight ? '#ffffff' : 'rgba(11, 17, 30, 0.8)',
                        border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: isLight ? '#0f172a' : '#f8fafc',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '10px',
                        background: 'transparent',
                        border: 'none',
                        color: isLight ? '#94a3b8' : '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Quick Account Preset Buttons */}
                <div>
                  <div style={{ fontSize: '10.5px', color: isLight ? '#64748b' : '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                    Quick Demo Presets:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { label: '👑 Admin (admin123)', u: 'admin', p: 'admin123' },
                      { label: '💼 Reception', u: 'reception', p: 'reception123' },
                      { label: '🛠️ Tech 1', u: 'tech1', p: 'tech123' },
                    ].map((pre, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setUsername(pre.u);
                          setPassword(pre.p);
                          setError(null);
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)',
                          border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: isLight ? '#334155' : '#94a3b8',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {pre.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    marginTop: '8px',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#0284c7',
                    backgroundImage: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Shield size={16} />
                  <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Terminal'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Footer Copyright & Security Notice */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: isLight ? '1px solid rgba(226, 232, 240, 0.9)' : '1px solid rgba(255, 255, 255, 0.07)',
              fontSize: '10.5px',
              color: isLight ? '#64748b' : '#64748b',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Shield size={12} color="#10b981" />
            <span>Encrypted Session • Scrypt Key Derivation Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
