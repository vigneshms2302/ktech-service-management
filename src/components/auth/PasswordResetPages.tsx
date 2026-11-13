import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldAlert,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  Mail,
  AlertTriangle,
  HelpCircle,
  Hash,
  Store,
  User,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { saasApi, setShopSlug } from '../../api/client.ts';

type ResetMode = 'SHOP_USER' | 'SUPER_ADMIN';

/**
 * Public Forgot Password Page (/forgot-password)
 * Step 1: Request 6-digit OTP + one-click reset link via Shop ID/username or registered phone/email.
 * Step 2: Enter 6-digit OTP (single numeric input) & set new password.
 */
export const ForgotPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const mode: ResetMode = searchParams.get('mode') === 'superadmin' ? 'SUPER_ADMIN' : 'SHOP_USER';
  const initialShop = searchParams.get('shop') || '';
  const initialUser = searchParams.get('username') || '';

  const [step, setStep] = useState<'REQUEST' | 'VERIFY' | 'SUCCESS'>('REQUEST');

  // Step 1 Fields
  const [shopSlug, setShopSlugInput] = useState(initialShop);
  const [username, setUsernameInput] = useState(initialUser);
  const [contact, setContactInput] = useState('');

  // Step 2 Fields
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Guidance
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<{
    deliveryChannel?: string;
    maskedEmail?: string | null;
    supportPhone?: string | null;
    recoveryKeyAvailable?: boolean;
    expiresInMinutes?: number;
  }>({});

  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (errorMessage && errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    }
  }, [errorMessage]);

  useEffect(() => {
    if (step === 'VERIFY' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const handleRequestReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (mode === 'SHOP_USER' && !contact.trim() && !shopSlug.trim() && !username.trim()) {
      setErrorMessage('Please enter your registered Gmail address, phone number, or Shop ID.');
      return;
    }
    if (mode === 'SUPER_ADMIN' && !username.trim() && !contact.trim()) {
      setErrorMessage('Please enter your Super-Admin username or registered email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await saasApi.auth.forgotPassword({
        mode,
        shopSlug: shopSlug.trim() || undefined,
        username: username.trim() || undefined,
        contact: contact.trim() || undefined,
      });

      if (res.success && res.data) {
        setDeliveryInfo(res.data);
        setStatusMessage(
          res.message ||
            (res.data.deliveryChannel === 'EMAIL' && res.data.maskedEmail
              ? `Verification code dispatched to ${res.data.maskedEmail}.`
              : 'Reset code generated. Follow the instructions below to complete your reset.')
        );
        setStep('VERIFY');
      } else {
        setErrorMessage(res.error || 'Could not find a matching active account.');
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Network error requesting password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const cleanOtp = otp.trim();
    if (!recoveryKey.trim() && (!cleanOtp || !/^\d{6}$/.test(cleanOtp))) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }

    if (newPin && !/^\d{4,6}$/.test(newPin.trim())) {
      setErrorMessage('Quick PIN must be 4 to 6 numeric digits.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await saasApi.auth.resetPassword({
        mode,
        shopSlug: shopSlug.trim() || undefined,
        username: username.trim() || undefined,
        contact: contact.trim() || undefined,
        otp: cleanOtp || undefined,
        recoveryKey: recoveryKey.trim() || undefined,
        newPassword,
        newPin: newPin.trim() || undefined,
      });

      if (res.success) {
        if (shopSlug.trim()) {
          setShopSlug(shopSlug.trim().toLowerCase());
        }
        setStep('SUCCESS');
      } else {
        setErrorMessage(res.error || 'Failed to reset password. Please check your verification code.');
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to complete password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111827] text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans">
      <div className="w-full max-w-md mx-auto my-auto">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/5">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Reset Your Password
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            K-Connect Repair Laboratory Security &amp; Access Recovery
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Accessible Error Summary */}
          {errorMessage && (
            <div
              ref={errorSummaryRef}
              tabIndex={-1}
              role="alert"
              className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-3 outline-none"
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-400" />
              <div>
                <strong className="font-semibold block mb-0.5">Password Reset Alert</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Accessible Status Announcement */}
          {statusMessage && (
            <div
              aria-live="polite"
              className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-start gap-3"
            >
              <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-400" />
              <div>{statusMessage}</div>
            </div>
          )}

          {/* STEP 1: REQUEST CODE */}
          {step === 'REQUEST' && (
            <form onSubmit={handleRequestReset} method="POST" noValidate className="kconnect-auth-form space-y-4">
              {mode === 'SHOP_USER' ? (
                <>
                  <div>
                    <label htmlFor="contact" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Registered Email (Gmail) or Mobile Number
                    </label>
                    <div className="text-[11px] text-slate-400 mb-2">
                      Enter the Gmail address or mobile number linked to your account to receive an instant reset link &amp; 6-digit code.
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-500">
                        <Mail size={16} />
                      </div>
                      <input
                        id="contact"
                        name="contact"
                        type="text"
                        value={contact}
                        onChange={(e) => setContactInput(e.target.value)}
                        placeholder="e.g. technician@gmail.com or 9842200000"
                        autoComplete="email tel"
                        enterKeyHint="go"
                        className="w-full pl-10 pr-3.5 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Secondary / Bench Fast-Lookup Toggle */}
                  <details className="mt-3 pt-3 border-t border-slate-800 text-xs">
                    <summary className="cursor-pointer text-slate-400 hover:text-slate-200 font-medium select-none flex items-center justify-between">
                      <span>Know your Shop ID and Username? (Bench Lookup)</span>
                      <span className="text-[10px] text-slate-500 font-mono">OPTIONAL</span>
                    </summary>
                    <div className="pt-3 space-y-3">
                      <div>
                        <label htmlFor="shopSlug" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Shop ID (Slug)
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <Store size={15} />
                          </div>
                          <input
                            id="shopSlug"
                            name="shopSlug"
                            type="text"
                            value={shopSlug}
                            onChange={(e) => setShopSlugInput(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                            placeholder="e.g. ktech"
                            autoComplete="organization"
                            className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="username" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Staff Username
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <User size={15} />
                          </div>
                          <input
                            id="username"
                            name="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsernameInput(e.target.value)}
                            placeholder="e.g. admin or tech1"
                            autoComplete="username"
                            className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </details>
                </>
              ) : (
                <div>
                  <label htmlFor="superadminIdentifier" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Super-Admin Username or Email
                  </label>
                  <div className="text-[11px] text-slate-400 mb-1.5">Master administrator identity for K-Connect.</div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <ShieldAlert size={16} />
                    </div>
                    <input
                      id="superadminIdentifier"
                      name="superadminIdentifier"
                      type="text"
                      value={username || 'superadmin'}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="superadmin"
                      autoComplete="username"
                      required
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Preparing Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Password Reset Code &amp; Link</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: VERIFY OTP & SET NEW PASSWORD */}
          {step === 'VERIFY' && (
            <form onSubmit={handleCompleteReset} method="POST" noValidate className="kconnect-auth-form space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
                <HelpCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {deliveryInfo.deliveryChannel === 'EMAIL' && deliveryInfo.maskedEmail ? (
                    <div>
                      We dispatched a 6-digit code and direct reset link to <strong>{deliveryInfo.maskedEmail}</strong>. Please check your Gmail / email inbox. Valid for{' '}
                      {deliveryInfo.expiresInMinutes || 15} minutes.
                    </div>
                  ) : mode === 'SHOP_USER' ? (
                    <div>
                      A 6-digit verification code has been generated. Check your Gmail inbox, or ask your{' '}
                      <strong>Shop Owner</strong> to view this code or set a new password/PIN for you in <strong>Shop Settings &rarr; Staff Accounts</strong>.
                    </div>
                  ) : (
                    <div>
                      Enter the 6-digit code sent to the Super-Admin address, or enter your server's configured emergency recovery key.
                    </div>
                  )}
                  {deliveryInfo.supportPhone && (
                    <div className="text-slate-400 text-[11px]">
                      Support Hotline: <strong>{deliveryInfo.supportPhone}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Single 6-digit OTP input following MWG guidelines */}
              <div>
                <label htmlFor="otp" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  6-Digit Verification Code
                </label>
                <div className="text-[11px] text-slate-400 mb-1.5">Enter the 6-digit numeric OTP code.</div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Hash size={16} />
                  </div>
                  <input
                    ref={otpInputRef}
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="\d{6}"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-base tracking-[0.3em] font-mono font-bold text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Emergency Recovery Key for Super-Admin */}
              {mode === 'SUPER_ADMIN' && deliveryInfo.recoveryKeyAvailable && (
                <div>
                  <label htmlFor="recoveryKey" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Emergency Recovery Key (Optional)
                  </label>
                  <div className="text-[11px] text-slate-400 mb-1.5">Use if you do not have email access.</div>
                  <input
                    id="recoveryKey"
                    name="recoveryKey"
                    type="password"
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value)}
                    placeholder="Server recovery key"
                    autoComplete="off"
                    className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}

              {/* New Password with MWG Toggle Button */}
              <div>
                <label htmlFor="newPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  New Password
                </label>
                <div className="text-[11px] text-slate-400 mb-1.5">Must be at least 6 characters long.</div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    placeholder="Enter new strong password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="text-[11px] text-slate-400 mb-1.5">Re-enter the exact same password to confirm.</div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    placeholder="Confirm new password"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Optional Quick PIN for Shop Staff */}
              {mode === 'SHOP_USER' && (
                <div>
                  <label htmlFor="newPin" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Quick Bench PIN (Optional)
                  </label>
                  <div className="text-[11px] text-slate-400 mb-1.5">4 to 6 numeric digits for instant workstation sign-in.</div>
                  <input
                    id="newPin"
                    name="newPin"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="e.g. 1234"
                    className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setStep('REQUEST')}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  &larr; Request New Code
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Verifying &amp; Resetting...</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password Now</span>
                      <CheckCircle2 size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 'SUCCESS' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-white">Password Reset Successful!</h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto">
                Your credentials have been securely updated in the database. You can now log into your K-Connect Repair Laboratory account with your new password.
              </p>
              <div className="pt-4">
                <Link
                  to={mode === 'SUPER_ADMIN' ? '/login?mode=superadmin' : shopSlug ? `/login?shop=${encodeURIComponent(shopSlug)}` : '/login'}
                  className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all"
                >
                  <span>Go to Sign In</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="text-center mt-6">
          <Link
            to={mode === 'SUPER_ADMIN' ? '/login?mode=superadmin' : shopSlug ? `/login?shop=${encodeURIComponent(shopSlug)}` : '/login'}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-600 font-mono py-4">
        &copy; {new Date().getFullYear()} K-Connect Repair Laboratory &bull; End-to-End Cryptographic Security
      </div>
    </div>
  );
};

/**
 * Direct Reset Password Link Handler (/reset-password?token=...)
 * Validates the one-click token and allows resetting the password directly.
 */
export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';
  const urlMode = searchParams.get('mode') === 'superadmin' ? 'SUPER_ADMIN' : 'SHOP_USER';

  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [verifiedDetails, setVerifiedDetails] = useState<{
    accountType?: string;
    username?: string;
    shopName?: string | null;
    shopSlug?: string | null;
    expiresAt?: string;
  }>({});

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setIsTokenValid(false);
      setTokenError('Missing password reset token in link.');
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const res = await saasApi.auth.verifyResetToken({ token });
        if (!isMounted) return;
        if (res.success && res.data?.valid) {
          setIsTokenValid(true);
          setVerifiedDetails(res.data);
        } else {
          setIsTokenValid(false);
          setTokenError(res.error || 'This password reset link is invalid or has expired.');
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setIsTokenValid(false);
        setTokenError((err as Error).message || 'Failed to verify reset link.');
      } finally {
        if (isMounted) setIsValidating(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (errorMessage && errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    }
  }, [errorMessage]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }

    if (newPin && !/^\d{4,6}$/.test(newPin.trim())) {
      setErrorMessage('Quick PIN must be 4 to 6 numeric digits.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saasApi.auth.resetPassword({
        token,
        mode: verifiedDetails.accountType === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SHOP_USER',
        newPassword,
        newPin: newPin.trim() || undefined,
      });

      if (res.success) {
        if (verifiedDetails.shopSlug) {
          setShopSlug(verifiedDetails.shopSlug);
        }
        setIsDone(true);
      } else {
        setErrorMessage(res.error || 'Failed to reset password.');
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to complete reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111827] text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans">
      <div className="w-full max-w-md mx-auto my-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/5">
            <Lock size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Create New Password
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            K-Connect Repair Laboratory Secure Link Reset
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {isValidating ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw size={28} className="animate-spin text-emerald-400 mx-auto" />
              <div className="text-sm text-slate-300">Verifying secure reset link...</div>
            </div>
          ) : !isTokenValid ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle size={28} />
              </div>
              <h2 className="text-lg font-bold text-white">Reset Link Invalid or Expired</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                {tokenError || 'This reset link has expired, was already used, or is malformed.'}
              </p>
              <div className="pt-2">
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center gap-2 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow transition-colors"
                >
                  <KeyRound size={14} />
                  <span>Request a Fresh Reset Link</span>
                </Link>
              </div>
            </div>
          ) : isDone ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-white">Password Updated!</h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto">
                Your new password has been applied. You can now log into K-Connect immediately.
              </p>
              <div className="pt-4">
                <Link
                  to={
                    verifiedDetails.accountType === 'SUPER_ADMIN'
                      ? '/login?mode=superadmin'
                      : verifiedDetails.shopSlug
                        ? `/login?shop=${encodeURIComponent(verifiedDetails.shopSlug)}`
                        : '/login'
                  }
                  className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} method="POST" noValidate className="kconnect-auth-form space-y-4">
              {/* Account Context Badge */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                <div className="font-semibold text-emerald-400 mb-0.5">
                  {verifiedDetails.shopName || (verifiedDetails.accountType === 'SUPER_ADMIN' ? 'Super-Admin Console' : 'Workshop Account')}
                </div>
                <div className="text-slate-400">
                  Resetting credentials for username: <strong className="text-white">@{verifiedDetails.username}</strong>
                  {verifiedDetails.shopSlug && (
                    <> &bull; Shop ID: <strong className="text-white">@{verifiedDetails.shopSlug}</strong></>
                  )}
                </div>
              </div>

              {errorMessage && (
                <div
                  ref={errorSummaryRef}
                  tabIndex={-1}
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 outline-none"
                >
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                  <div>{errorMessage}</div>
                </div>
              )}

              <div>
                <label htmlFor="newPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  New Password
                </label>
                <div className="text-[11px] text-slate-400 mb-1.5">At least 6 characters long.</div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="text-[11px] text-slate-400 mb-1.5">Re-enter the exact same password.</div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    placeholder="Confirm new password"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {verifiedDetails.accountType !== 'SUPER_ADMIN' && (
                <div>
                  <label htmlFor="newPin" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Quick Bench PIN (Optional)
                  </label>
                  <div className="text-[11px] text-slate-400 mb-1.5">4 to 6 numeric digits for rapid workstation sign-in.</div>
                  <input
                    id="newPin"
                    name="newPin"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="e.g. 1234"
                    className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Saving New Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save &amp; Activate New Password</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link
            to={urlMode === 'SUPER_ADMIN' ? '/login?mode=superadmin' : '/login'}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-600 font-mono py-4">
        &copy; {new Date().getFullYear()} K-Connect Repair Laboratory &bull; End-to-End Cryptographic Security
      </div>
    </div>
  );
};
