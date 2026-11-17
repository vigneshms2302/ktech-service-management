import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Moon,
  Sun,
  Monitor,
  ArrowRight,
  ShieldCheck,
  Search,
  Server,
  Check,
  RefreshCw,
  X,
  Store,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { getShopSlug, setShopSlug, getApiBaseUrl, setApiBaseUrl } from '../../api/client.ts';
import { formatUserFriendlyError } from '../../utils/formatError.ts';
import { DownloadAppModal } from '../common/DownloadAppModal.tsx';

/**
 * Detects shop slug from custom wildcard subdomains (e.g. ktech.kconnect.in, shop1.yourdomain.com).
 * Supported seamlessly on Vercel with a single CNAME wildcard (*.yourdomain.com).
 */
function getDetectedSubdomain(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.vercel.app') ||
    hostname.split('.').length < 3
  ) {
    return '';
  }
  const parts = hostname.split('.');
  const sub = parts[0];
  if (!['www', 'app', 'admin', 'api', 'mail', 'smtp'].includes(sub)) {
    return sub;
  }
  return '';
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showError } = useToast();
  const { theme, toggleTheme } = useTheme();

  const isLight = theme === 'light';

  const { shopSlug: routeShopSlug } = useParams<{ shopSlug?: string }>();
  const [searchParams] = useSearchParams();
  const queryShopSlug = searchParams.get('shop') || searchParams.get('slug');
  const detectedSubdomain = getDetectedSubdomain();
  const dedicatedShopSlug = (routeShopSlug || queryShopSlug || detectedSubdomain || '').trim().toLowerCase();

  const [shopSlug, setShopSlugState] = useState<string>(() => dedicatedShopSlug || getShopSlug() || '');
  const [isChangingShop, setIsChangingShop] = useState<boolean>(false);

  useEffect(() => {
    if (dedicatedShopSlug) {
      setShopSlugState(dedicatedShopSlug);
      setShopSlug(dedicatedShopSlug);
    }
  }, [dedicatedShopSlug]);

  const isAdminParam = searchParams.get('admin') === '1';
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(isAdminParam);
  const [username, setUsername] = useState<string>(isAdminParam ? 'superadmin' : '');
  const [password, setPassword] = useState<string>('');

  useEffect(() => {
    if (isAdminParam) {
      setIsSuperAdmin(true);
      if (!username) setUsername('superadmin');
    }
  }, [isAdminParam]);

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState<boolean>(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState<boolean>(false);
  const [currentApiUrl, setCurrentApiUrl] = useState<string>(() => getApiBaseUrl() || (window.location.protocol === 'file:' ? 'http://localhost:5000' : ''));
  const [modalApiUrl, setModalApiUrl] = useState<string>(currentApiUrl);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message?: string }>({ status: 'idle' });

  const isDesktop = Boolean(window.electronAPI?.isDesktop);

  const handleTestConnection = async (urlToTest: string) => {
    setTestResult({ status: 'testing', message: 'Connecting to server...' });
    const startTime = Date.now();
    try {
      const cleanUrl = urlToTest.trim().replace(/\/$/, '');
      const target = cleanUrl.startsWith('http')
        ? `${cleanUrl}/api/health`
        : `${window.location.origin}/api/health`;
      const res = await fetch(target, { method: 'GET' });
      const latency = Date.now() - startTime;
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        setTestResult({
          status: 'success',
          message: `Connected (${latency}ms) • ${json.service || 'API Server Active'}`,
        });
      } else {
        setTestResult({
          status: 'error',
          message: `HTTP ${res.status}: Server returned error status`,
        });
      }
    } catch (e: any) {
      setTestResult({
        status: 'error',
        message: e.message || 'Cannot reach server at this address.',
      });
    }
  };

  const handleSaveApiUrl = () => {
    const clean = modalApiUrl.trim().replace(/\/$/, '');
    setApiBaseUrl(clean);
    setCurrentApiUrl(clean);
    setIsServerModalOpen(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    if (!isSuperAdmin && !shopSlug.trim()) {
      setError('Please specify your registered Shop ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const cleanSlug = shopSlug.trim().toLowerCase();
      setShopSlug(cleanSlug);
      const res = await login({
        username: username.trim(),
        password,
        shopSlug: isSuperAdmin ? undefined : cleanSlug,
        isSuperAdmin,
      });
      if (!res.success) {
        const friendlyError = formatUserFriendlyError(res.error || 'Invalid credentials or shop not found', 401);
        setError(friendlyError);
        showError(friendlyError);
      } else {
        navigate(isSuperAdmin ? '/admin' : '/app', { replace: true });
      }
    } catch (err: unknown) {
      const friendlyError = formatUserFriendlyError(err);
      setError(friendlyError);
      showError(friendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  // Has an active remembered or dedicated shop
  const hasLockedShop = !isSuperAdmin && Boolean(shopSlug.trim()) && !isChangingShop;

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0a0e17] text-slate-100'
      } font-sans transition-colors duration-200 selection:bg-[#10a37f] selection:text-white`}
    >
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Link to="/public" className="flex items-center gap-3 no-underline group">
          <div className="w-10 h-10 rounded-xl bg-[#10a37f] flex items-center justify-center shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/20 group-hover:scale-105 transition-all">
            <img
              src={window.location.protocol === 'file:' ? './icon.svg' : '/icon.svg'}
              alt="K-Connect"
              className="w-5 h-5 filter brightness-0 invert"
            />
          </div>
          <div>
            <span className={`text-lg font-bold tracking-tight block ${isLight ? 'text-slate-900' : 'text-white'}`}>
              K-Connect
            </span>
            <span className="text-[10px] font-mono text-emerald-500 block uppercase tracking-wider font-semibold">
              Cloud Service OS
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {/* Server Config (Desktop or Local Dev) */}
          {isDesktop && (
            <button
              type="button"
              onClick={() => {
                setModalApiUrl(currentApiUrl);
                setTestResult({ status: 'idle' });
                setIsServerModalOpen(true);
              }}
              title="Configure API Server Endpoint"
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Server size={15} />
            </button>
          )}

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isLight ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>
      </header>

      {/* ── Main Centered GreytHR-Style Login Card ─────────────────── */}
      <main className="w-full max-w-md mx-auto px-4 py-4 sm:py-8 my-auto">
        <div
          className={`rounded-2xl border shadow-xl p-6 sm:p-9 transition-all ${
            isLight
              ? 'bg-white border-slate-200/90 shadow-slate-200/50'
              : 'bg-[#121722] border-slate-800/90 shadow-black/40'
          }`}
        >
          {/* Card Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
                  isSuperAdmin
                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {isSuperAdmin ? <ShieldCheck size={12} /> : <Store size={12} />}
                <span>{isSuperAdmin ? 'Platform Vendor Console' : 'Shop Staff Authentication'}</span>
              </span>
              {isDesktop && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  Windows App
                </span>
              )}
            </div>

            <h1 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {isSuperAdmin ? 'Super-Admin Sign In' : 'Log In to Your Repair Shop'}
            </h1>
            <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {isSuperAdmin
                ? 'Master vendor platform credentials for tenant provisioning & system settings.'
                : 'Enter your credentials to access tickets, diagnostics, inventory & billing.'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* GreytHR Clean Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* 1. Shop Context: GreytHR Locked Banner OR Shop Slug Input */}
            {!isSuperAdmin && (
              <>
                {hasLockedShop ? (
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      isLight
                        ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
                        : 'bg-emerald-950/25 border-emerald-800/60 text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Store size={18} />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold truncate">
                          @{shopSlug}
                        </div>
                        <div className="text-[11px] opacity-75 truncate">
                          Dedicated Shop Workspace
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChangingShop(true)}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 ml-3 cursor-pointer"
                    >
                      Change Shop
                    </button>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="shopSlug"
                      className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      Shop Identifier (Slug)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm">
                        @
                      </span>
                      <input
                        id="shopSlug"
                        name="shopSlug"
                        type="text"
                        required
                        spellCheck={false}
                        autoCorrect="off"
                        autoCapitalize="none"
                        value={shopSlug}
                        onChange={(e) => setShopSlugState(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        placeholder="e.g. ktech or myrepairshop"
                        className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-sm font-mono transition-all outline-none ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
                            : 'bg-slate-900/80 border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        }`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      <span>Unique ID chosen during registration.</span>
                      {shopSlug.trim() && (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[10.5px]">
                          /shop/{shopSlug.trim()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 2. Username Input */}
            <div>
              <label
                htmlFor="username"
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                {isSuperAdmin ? 'Super-Admin Username' : 'Username or Mobile Number'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={16} />
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isSuperAdmin ? 'superadmin' : 'Username, registered mobile or email'}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm transition-all outline-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
                      : 'bg-slate-900/80 border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
            </div>

            {/* 3. Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className={`block text-xs font-semibold uppercase tracking-wider ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  Password
                </label>
                <Link
                  to={
                    isSuperAdmin
                      ? `/forgot-password?mode=superadmin&username=${encodeURIComponent(username || 'superadmin')}`
                      : `/forgot-password?shop=${encodeURIComponent(shopSlug || '')}&username=${encodeURIComponent(username || '')}`
                  }
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus={isSuperAdmin && username === 'superadmin'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm transition-all outline-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
                      : 'bg-slate-900/80 border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* 4. Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>{isSuperAdmin ? 'Log In to Master Console' : 'Sign In to Shop'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* New Shop Registration CTA (GreytHR style) */}
          {!isSuperAdmin && (
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-center">
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                New repair center?{' '}
                <Link
                  to="/signup"
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  Register Your Shop (14-Day Free Trial)
                </Link>
              </p>
            </div>
          )}

          {/* Super Admin Switcher Link */}
          {isSuperAdmin ? (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSuperAdmin(false);
                  setError(null);
                  setUsername('');
                  setPassword('');
                }}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
              >
                ← Return to Regular Shop Staff Login
              </button>
            </div>
          ) : (
            <div className="mt-3 text-center">
              <Link
                to="/login?admin=1"
                onClick={() => {
                  setIsSuperAdmin(true);
                  setUsername('superadmin');
                  setPassword('');
                  setError(null);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Super-Admin Portal Access
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* ── Minimalist Clean Footer ─────────────────────────────────── */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <Link
            to="/track"
            className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors no-underline"
          >
            <Search size={13} />
            <span>Track Repair Device</span>
          </Link>

          {!isDesktop && (
            <button
              type="button"
              onClick={() => setIsDownloadOpen(true)}
              className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors bg-transparent border-none p-0 cursor-pointer"
            >
              <Monitor size={13} />
              <span>Windows Desktop (.exe)</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>256-Bit Encrypted Multi-Tenant Cloud</span>
        </div>
      </footer>

      {/* Cloud Server Connection Modal */}
      {isServerModalOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsServerModalOpen(false)}
        >
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#181d29] border-slate-700 text-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Server size={17} />
                </div>
                <div>
                  <h3 className="text-base font-bold">API Server Endpoint</h3>
                  <p className="text-xs text-slate-400">Configure central backend URL</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsServerModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-300">
                  API Server Base URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={modalApiUrl}
                    onChange={(e) => setModalApiUrl(e.target.value)}
                    placeholder="http://localhost:5000"
                    className={`flex-1 px-3.5 py-2 rounded-xl text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900/90 border-slate-700 text-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleTestConnection(modalApiUrl)}
                    disabled={testResult.status === 'testing'}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {testResult.status === 'testing' ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    <span>Test</span>
                  </button>
                </div>
              </div>

              {testResult.status !== 'idle' && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                    testResult.status === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : testResult.status === 'error'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  }`}
                >
                  {testResult.status === 'success' && <Check size={14} className="shrink-0" />}
                  {testResult.status === 'error' && <AlertCircle size={14} className="shrink-0" />}
                  {testResult.status === 'testing' && <RefreshCw size={14} className="animate-spin shrink-0" />}
                  <span className="font-mono">{testResult.message}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => setIsServerModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApiUrl}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Check size={14} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop App Download Modal */}
      <DownloadAppModal isOpen={isDownloadOpen} onClose={() => setIsDownloadOpen(false)} />
    </div>
  );
};
