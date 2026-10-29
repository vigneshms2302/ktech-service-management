import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Moon,
  Sun,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { getShopSlug, setShopSlug } from '../../api/client.ts';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, pinLogin, userList } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isLight = theme === 'light';

  const [activeMode, setActiveMode] = useState<'PASSWORD' | 'PIN'>('PASSWORD');
  const [shopSlug, setShopSlugState] = useState<string>(() => getShopSlug());
  const searchParams = new URLSearchParams(window.location.search);
  const isAdminParam = searchParams.get('admin') === '1';
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(isAdminParam);
  const [selectedUser, setSelectedUser] = useState<string>(() => userList[0]?.id || '');
  const [pinCode, setPinCode] = useState<string>('');
  const [username, setUsername] = useState<string>(isAdminParam ? 'superadmin' : '');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (userList.length > 0 && !selectedUser) {
      setSelectedUser(userList[0].id);
      setUsername(userList[0].username);
    }
  }, [userList, selectedUser]);

  // Keyboard PIN handler
  useEffect(() => {
    if (activeMode !== 'PIN') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        if (pinCode.length < 6) handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        setPinCode((prev) => prev.slice(0, -1));
        setError(null);
      } else if (e.key === 'Enter' && pinCode.length >= 4) {
        executePinAuth(pinCode);
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
    if (newPin.length === 4) executePinAuth(newPin);
  };

  const executePinAuth = async (pin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await pinLogin(pin);
      if (!res.success) {
        setError(res.error || 'Incorrect PIN');
        setPinCode('');
      } else {
        navigate('/app', { replace: true });
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Authentication error');
      setPinCode('');
    } finally {
      setIsLoading(false);
    }
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
      setShopSlug(shopSlug.trim().toLowerCase());
      const res = await login({
        username: username.trim(),
        password,
        shopSlug: isSuperAdmin ? undefined : shopSlug.trim().toLowerCase(),
        isSuperAdmin,
      });
      if (!res.success) {
        setError(res.error || 'Invalid credentials');
      } else {
        navigate(isSuperAdmin ? '/admin' : '/app', { replace: true });
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const bg = isLight ? '#ffffff' : '#212121';
  const cardBg = isLight ? '#ffffff' : '#212121';
  const borderCol = isLight ? '#e5e5e5' : '#2f2f2f';
  const textMain = isLight ? '#0d0d0d' : '#ececec';
  const textMuted = isLight ? '#676767' : '#b4b4b4';
  const inputBg = isLight ? '#ffffff' : '#2f2f2f';
  const inputBorder = isLight ? '#e5e5e5' : '#383838';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Theme Toggle - top right */}
      <button
        type="button"
        onClick={toggleTheme}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          border: `1px solid ${borderCol}`,
          backgroundColor: cardBg,
          color: textMuted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {isLight ? <Moon size={15} /> : <Sun size={15} />}
      </button>

      {/* Logo + Brand */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#10a37f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 0 0 4px rgba(16, 163, 127, 0.15)',
          }}
        >
          <img src="/icon.svg" alt="K-Connect" style={{ width: '28px', height: '28px', filter: 'brightness(0) invert(1)' }} />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: textMain, margin: 0, letterSpacing: '-0.4px' }}>
          K-Connect
        </h1>
        <p style={{ fontSize: '13px', color: textMuted, margin: '4px 0 0' }}>
          Service Management Platform
        </p>
      </div>

      {/* Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: cardBg,
          border: `1px solid ${borderCol}`,
          borderRadius: '16px',
          padding: '28px',
          boxShadow: isLight
            ? '0 4px 24px rgba(0,0,0,0.06)'
            : '0 4px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Tab Switcher (Only for regular shop staff) */}
        {!isSuperAdmin && (
          <div
            style={{
              display: 'flex',
              borderRadius: '10px',
              backgroundColor: isLight ? '#f3f4f6' : '#1a1a1a',
              padding: '3px',
              marginBottom: '20px',
              gap: '2px',
            }}
          >
            {(['PASSWORD', 'PIN'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setActiveMode(mode); setError(null); }}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: activeMode === mode
                    ? (isLight ? '#ffffff' : '#2a2a2a')
                    : 'transparent',
                  color: activeMode === mode ? textMain : textMuted,
                  boxShadow: activeMode === mode
                    ? (isLight ? '0 1px 3px rgba(0,0,0,0.08)' : 'none')
                    : 'none',
                }}
              >
                {mode === 'PASSWORD' ? 'Password' : 'Quick PIN'}
              </button>
            ))}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontSize: '12.5px',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* PASSWORD FORM */}
        {activeMode === 'PASSWORD' && (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Vendor Admin Header (Only shown when accessed via /admin or ?admin=1) */}
            {isSuperAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#10a37f' }}>
                  🛡️ Vendor Super-Admin Portal
                </span>
                <Link
                  to="/login"
                  onClick={() => {
                    setIsSuperAdmin(false);
                    setUsername('');
                    setPassword('');
                    setError(null);
                  }}
                  style={{ fontSize: '12px', color: textMuted, textDecoration: 'none' }}
                >
                  Shop Login &rarr;
                </Link>
              </div>
            )}

            {/* New Shop Registration Prompt */}
            {!isSuperAdmin && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: isLight ? 'rgba(16, 163, 127, 0.06)' : 'rgba(16, 163, 127, 0.1)',
                  border: '1px solid rgba(16, 163, 127, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#10a37f' }}>
                    New Repair Shop?
                  </div>
                  <div style={{ fontSize: '11px', color: textMuted, marginTop: '2px' }}>
                    Register & activate 14-day free trial
                  </div>
                </div>
                <Link
                  to="/signup"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#10a37f',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Register Shop &rarr;
                </Link>
              </div>
            )}

            {/* Shop Slug */}
            {!isSuperAdmin && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: textMuted, marginBottom: '6px' }}>
                  Shop ID
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: inputBg,
                    border: `1px solid ${inputBorder}`,
                    borderRadius: '10px',
                    padding: '0 12px',
                    height: '42px',
                  }}
                >
                  <span style={{ color: '#10a37f', fontWeight: 700, fontSize: '14px', marginRight: '4px' }}>@</span>
                  <input
                    type="text"
                    value={shopSlug}
                    onChange={(e) => setShopSlugState(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="yourshop"
                    required
                    style={{
                      flex: 1,
                      height: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: textMain,
                      fontSize: '13.5px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: textMuted, marginBottom: '6px' }}>
                {isSuperAdmin ? 'Admin Username' : 'Username'}
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: inputBg,
                  border: `1px solid ${inputBorder}`,
                  borderRadius: '10px',
                  padding: '0 12px',
                  height: '42px',
                  gap: '8px',
                }}
              >
                <User size={15} color={textMuted} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isSuperAdmin ? 'admin' : 'Username or mobile'}
                  required
                  autoComplete="username"
                  style={{
                    flex: 1,
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: textMain,
                    fontSize: '13.5px',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: textMuted, marginBottom: '6px' }}>
                Password
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: inputBg,
                  border: `1px solid ${inputBorder}`,
                  borderRadius: '10px',
                  padding: '0 12px',
                  height: '42px',
                  gap: '8px',
                }}
              >
                <Lock size={15} color={textMuted} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{
                    flex: 1,
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: textMain,
                    fontSize: '13.5px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '12px',
                backgroundColor: isLight ? '#0d0d0d' : '#ececec',
                color: isLight ? '#ffffff' : '#0d0d0d',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                marginTop: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}

        {/* PIN MODE */}
        {activeMode === 'PIN' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            {/* User selector or Quick Demo PIN buttons */}
            {userList.length > 0 ? (
              <div style={{ display: 'flex', gap: '8px', width: '100%', overflowX: 'auto', paddingBottom: '2px' }}>
                {userList.map((usr) => {
                  const isSelected = selectedUser === usr.id;
                  return (
                    <button
                      key={usr.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(usr.id);
                        setUsername(usr.username);
                        setPinCode('');
                        setError(null);
                      }}
                      style={{
                        flex: '1 0 auto',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: isSelected
                          ? '1.5px solid #10a37f'
                          : `1px solid ${inputBorder}`,
                        backgroundColor: isSelected
                          ? 'rgba(16, 163, 127, 0.1)'
                          : inputBg,
                        color: textMain,
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 500,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: isSelected ? '#10a37f' : (isLight ? '#e5e7eb' : '#333'),
                          color: isSelected ? '#fff' : textMain,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {usr.fullName.charAt(0)}
                      </div>
                      <span style={{ whiteSpace: 'nowrap' }}>{usr.fullName.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '12.5px', color: textMuted, margin: '4px 0', textAlign: 'center' }}>
                Enter your 4-digit staff PIN to unlock
              </p>
            )}

            {/* PIN dots */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: pinCode.length > idx ? '#10a37f' : (isLight ? '#d1d5db' : '#333'),
                    transition: 'all 0.15s ease',
                  }}
                />
              ))}
            </div>

            {/* Keypad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', width: '100%', maxWidth: '260px' }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    if (k === 'C') { setPinCode(''); setError(null); }
                    else if (k === '⌫') { setPinCode((p) => p.slice(0, -1)); setError(null); }
                    else handlePinDigit(k);
                  }}
                  style={{
                    height: '48px',
                    borderRadius: '10px',
                    border: `1px solid ${inputBorder}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '18px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isLight ? '#e5e7eb' : '#2a2a2a')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = inputBg)}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation links */}
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
        <div>
          <span style={{ color: textMuted }}>New repair shop? </span>
          <Link to="/signup" style={{ color: '#10a37f', fontWeight: 600, textDecoration: 'none' }}>
            Start 14-day free trial &rarr;
          </Link>
        </div>
        <Link to="/track" style={{ color: textMuted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
          <QrCode size={13} color="#10a37f" />
          <span>Customer Repair Tracker (QR / SMS) &rarr;</span>
        </Link>
      </div>

      {/* Footer */}
      <p style={{ marginTop: '16px', fontSize: '12px', color: textMuted, display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Shield size={12} color="#10a37f" />
        Secure • Multi-tenant Cloud • 256-bit Encrypted
      </p>
    </div>
  );
};
