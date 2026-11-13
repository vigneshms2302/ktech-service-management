import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Moon,
  Sun,
  Monitor,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Database,
  Search,
  CheckCircle2,
  Server,
  Settings,
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

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showError } = useToast();
  const { theme, toggleTheme } = useTheme();

  const isLight = theme === 'light';

  const { shopSlug: routeShopSlug } = useParams<{ shopSlug?: string }>();
  const searchParams = new URLSearchParams(window.location.search);
  const queryShopSlug = searchParams.get('shop') || searchParams.get('slug');
  const dedicatedShopSlug = (routeShopSlug || queryShopSlug || '').trim().toLowerCase();

  const [shopSlug, setShopSlugState] = useState<string>(() => dedicatedShopSlug || getShopSlug() || '');

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

  return (
    <div className={`min-h-screen w-full flex flex-col lg:flex-row ${isLight ? 'bg-gray-50 text-[#0d0d0d]' : 'bg-[#0a0e17] text-[#ececec]'} font-sans transition-colors duration-200 selection:bg-[#10a37f] selection:text-white`}>
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* LEFT COLUMN: VIBRANT SHOWCASE & MULTI-TENANT LAB EXPERIENCE    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="lg:w-7/12 xl:w-7/12 p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#070b14] via-[#0d1424] to-[#08121f] text-white border-b lg:border-b-0 lg:border-r border-slate-800/60 shadow-2xl">
        
        {/* Ambient Glow Orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header & Brand */}
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-4 mb-8">
            <Link to="/public" className="flex items-center gap-3 no-underline group">
              <div className="w-11 h-11 rounded-xl bg-[#10a37f] flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/30 group-hover:scale-105 transition-all">
                <img
                  src={window.location.protocol === 'file:' ? './icon.svg' : '/icon.svg'}
                  alt="K-Connect"
                  className="w-6 h-6 filter brightness-0 invert"
                />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white block">K-Connect</span>
                <span className="text-[11px] font-mono text-emerald-400 block tracking-wider uppercase font-semibold">Cloud Service OS</span>
              </div>
            </Link>

            {/* Live Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs font-mono text-slate-300 backdrop-blur-md shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Multi-Tenant Cloud Live</span>
            </div>
          </div>

          {/* Main Headline */}
          <div className="max-w-2xl mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles size={13} />
              <span>Multi-Shop Repair Laboratory</span>
            </div>
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight mb-4">
              The Real-Time Operating System for Modern Repair Centers.
            </h1>
            <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-xl">
              Each repair business gets an isolated, dedicated cloud workspace. Manage multi-meter intake diagnostics, 13-stage board repairs, spare inventory, automated WhatsApp estimates, and GST invoicing in real-time.
            </p>
          </div>

          {/* High-Tech Workbench Visual Showcase Frame */}
          <div className="relative mb-8 rounded-2xl border border-slate-700/60 overflow-hidden shadow-2xl bg-slate-950/60 group">
            <img
              src={window.location.protocol === 'file:' ? './login-hero.jpg' : '/login-hero.jpg'}
              alt="K-Connect Modern Electronics Diagnostics Lab"
              className="w-full h-56 sm:h-72 object-cover object-center filter brightness-95 contrast-105 group-hover:scale-102 transition-transform duration-700"
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/30 to-transparent pointer-events-none" />

            {/* Floating Live Telemetry Badge inside Image */}
            <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Cpu size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">MacBook Pro 16&quot; M2 Logic Board</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      Stage 6: Soldering
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-2">
                    <span>Ticket #JOB-2026-0842</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">Estimated: ₹14,500 (Approved)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <div className="px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700 text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real-Time Cloud Sync</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Value Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                <Building2 size={16} />
              </div>
              <div className="text-xs font-bold text-white mb-1">Multi-Tenant Isolation</div>
              <div className="text-[11px] text-slate-400 leading-relaxed">
                Dedicated database partition per shop. Your data, tickets, and customers are completely isolated.
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2">
                <Database size={16} />
              </div>
              <div className="text-xs font-bold text-white mb-1">Real-Time Cloud Sync</div>
              <div className="text-[11px] text-slate-400 leading-relaxed">
                Zero split-brain databases. Counter PCs, repair benches, and mobile phones stay 100% in sync.
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2">
                <Monitor size={16} />
              </div>
              <div className="text-xs font-bold text-white mb-1">Web &amp; Desktop App</div>
              <div className="text-[11px] text-slate-400 leading-relaxed">
                Use in any web browser or download the native portable Windows executable (.exe) for your counter.
              </div>
            </div>
          </div>
        </div>

        {/* Left Footer Trust Badges */}
        <div className="relative z-10 pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>AES-256 Passcode Vault</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>99.99% Cloud Uptime</span>
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">&copy; {new Date().getFullYear()} K-Connect</span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RIGHT COLUMN: FOCUSED, HIGH-CONVERSION SIGN-IN CONSOLE         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className={`lg:w-5/12 xl:w-5/12 p-4 sm:p-6 lg:p-8 xl:p-10 flex flex-col justify-between ${isLight ? 'bg-white' : 'bg-[#111622]'} relative`}>
        
        {/* Top Controls Row */}
        <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6">
          <Link
            to="/public"
            className={`text-xs font-medium flex items-center gap-1.5 no-underline transition-colors ${
              isLight ? 'text-gray-500 hover:text-gray-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            &larr; Back to Public Portal
          </Link>

          <div className="flex items-center gap-2">
            {/* Server Connection Endpoint Button */}
            <button
              type="button"
              onClick={() => {
                setModalApiUrl(currentApiUrl);
                setTestResult({ status: 'idle' });
                setIsServerModalOpen(true);
              }}
              title="Configure API Server Endpoint"
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                isLight
                  ? 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Server size={12} className="text-emerald-500" />
              <span className="max-w-[120px] truncate">{currentApiUrl || 'Server Active'}</span>
              <Settings size={12} className="text-slate-400" />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isLight
                  ? 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isLight ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>
        </div>

        {/* Central Sign-In Container */}
        <div className="w-full max-w-md mx-auto my-auto">
          
          {/* Card Header */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {isSuperAdmin ? 'Super-Admin Console' : 'Shop Staff Authentication'}
              </span>
              {isDesktop && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  Windows Desktop
                </span>
              )}
            </div>
            <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {isSuperAdmin ? 'Super-Admin Console' : 'Sign in to your repair shop'}
            </h2>
            <p className={`text-xs mt-1 ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>
              {isSuperAdmin
                ? 'Master vendor control center for shop provisioning & subscriptions.'
                : 'Enter your Shop ID and credentials to access your repair ledger and diagnostics.'}
            </p>
          </div>

          {/* New Shop Registration Prompt Banner */}
          {!isSuperAdmin && (
            <div className={`mb-4 p-3.5 rounded-xl border transition-all ${
              isLight
                ? 'bg-emerald-50/70 border-emerald-200/80 text-gray-800'
                : 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>New Repair Business?</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                    Register your shop in 60 seconds. Launch a dedicated multi-tenant lab workspace with a 14-day free trial.
                  </p>
                </div>
                <Link
                  to="/signup"
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                >
                  <span>Register</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Clean Unified Form: ShopID + Username + Password */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            
            {/* Dedicated Shop Portal Banner (GreytHR style) */}
            {!isSuperAdmin && dedicatedShopSlug && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between mb-1 ${
                  isLight
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Store size={16} />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold truncate">
                      {dedicatedShopSlug} Workspace
                    </div>
                    <div className="text-[11px] opacity-75 truncate">
                      Dedicated Shop Login Portal
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShopSlugState('');
                    navigate('/login', { replace: true });
                  }}
                  className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:underline shrink-0 ml-2 cursor-pointer"
                >
                  Change Shop
                </button>
              </div>
            )}

            {/* Shop Identifier Input */}
            {!isSuperAdmin && (
              <div>
                <label
                  htmlFor="shopSlug"
                  className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isLight ? 'text-gray-700' : 'text-slate-300'}`}
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
                    placeholder="e.g. computechstore or my-repair-lab"
                    className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-sm font-mono transition-all outline-none ${
                      isLight
                        ? 'bg-white border-gray-200 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
                        : 'bg-slate-900/80 border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                  <span>Your registered shop handle.</span>
                  {shopSlug.trim() && (
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[10.5px]">
                      /shop/{shopSlug.trim()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Staff Username */}
            <div>
              <label
                htmlFor="username"
                className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isLight ? 'text-gray-700' : 'text-slate-300'}`}
              >
                {isSuperAdmin ? 'Super-Admin Username' : 'Staff Username'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
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
                  placeholder={isSuperAdmin ? 'superadmin' : 'Username or mobile number'}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm transition-all outline-none ${
                    isLight
                      ? 'bg-white border-gray-200 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
                      : 'bg-slate-900/80 border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className={`block text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-gray-700' : 'text-slate-300'}`}
                >
                  Password
                </label>
                <Link
                  to={
                    isSuperAdmin
                      ? `/forgot-password?mode=superadmin&username=${encodeURIComponent(username || 'superadmin')}`
                      : `/forgot-password?shop=${encodeURIComponent(shopSlug || '')}&username=${encodeURIComponent(username || '')}`
                  }
                  className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm transition-all outline-none ${
                    isLight
                      ? 'bg-white border-gray-200 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
                      : 'bg-slate-900/80 border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{isSuperAdmin ? 'Access Super-Admin Portal' : 'Sign In to Repair Lab'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Useful Quick Links */}
          <div className="mt-6 pt-5 border-t border-gray-200 dark:border-slate-800 space-y-2.5">
            
            {/* Customer Repair Tracking Link */}
            <div className="flex items-center justify-between text-xs">
              <span className={isLight ? 'text-gray-500' : 'text-slate-400'}>Customer tracking a device?</span>
              <Link
                to="/track"
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
              >
                <Search size={12} />
                <span>Track Repair Job &rarr;</span>
              </Link>
            </div>

            {/* Windows Desktop App Modal Trigger */}
            {!isDesktop ? (
              <div className="flex items-center justify-between text-xs">
                <span className={isLight ? 'text-gray-500' : 'text-slate-400'}>Prefer native Windows window?</span>
                <button
                  type="button"
                  onClick={() => setIsDownloadOpen(true)}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                >
                  <Monitor size={12} />
                  <span>Download Desktop (.exe) &rarr;</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 flex items-center gap-2">
                <Monitor size={14} className="shrink-0" />
                <span>Running Windows Desktop Edition • Connected to Cloud Database</span>
              </div>
            )}

            {/* Return from Super Admin Mode (Only visible if ?admin=1 is explicitly opened) */}
            {isSuperAdmin && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSuperAdmin(false);
                    setError(null);
                    setUsername('');
                    setPassword('');
                  }}
                  className={`text-[11px] underline transition-colors cursor-pointer ${
                    isLight ? 'text-gray-400 hover:text-gray-600' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  ← Return to Regular Shop Staff Login
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Footer Security Notice */}
        <div className={`mt-8 pt-4 border-t text-center text-xs flex items-center justify-center gap-1.5 ${
          isLight ? 'border-gray-100 text-gray-400' : 'border-slate-800 text-slate-500'
        }`}>
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>Multi-Tenant Cloud • 256-Bit Encrypted • Real-Time Database</span>
        </div>
      </div>

      {/* Cloud Server Connection Configuration Modal */}
      {isServerModalOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsServerModalOpen(false)}
        >
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${
              isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#181d29] border-slate-700 text-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Server size={17} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Cloud API Server Endpoint</h3>
                  <p className="text-xs text-slate-400">Configure central database backend URL</p>
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
                      isLight ? 'bg-gray-50 border-gray-300 text-gray-900' : 'bg-slate-900/90 border-slate-700 text-white'
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

              {/* Test Status Banner */}
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

              {/* Quick Preset Buttons */}
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Quick Presets
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalApiUrl('http://localhost:5000');
                      handleTestConnection('http://localhost:5000');
                    }}
                    className="p-2.5 rounded-xl border text-left text-xs bg-slate-900/60 hover:bg-slate-900 border-slate-700/80 transition-all cursor-pointer"
                  >
                    <div className="font-bold text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Local Backend</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      http://localhost:5000
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalApiUrl('https://ktech-service-management.vercel.app');
                      handleTestConnection('https://ktech-service-management.vercel.app');
                    }}
                    className="p-2.5 rounded-xl border text-left text-xs bg-slate-900/60 hover:bg-slate-900 border-slate-700/80 transition-all cursor-pointer"
                  >
                    <div className="font-bold text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span>Cloud Production</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      https://ktech-...vercel.app
                    </div>
                  </button>
                </div>
              </div>
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
                <span>Save &amp; Connect</span>
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
