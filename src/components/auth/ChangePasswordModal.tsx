import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, X, CheckCircle2, AlertTriangle, KeyRound, RefreshCw } from 'lucide-react';
import { saasApi } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      setIsSuccess(false);
      setErrorMessage(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNewPin('');
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (errorMessage && errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    }
  }, [errorMessage]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage('Please enter your current password.');
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
      const res = await saasApi.auth.changePassword({
        currentPassword,
        newPassword,
        newPin: newPin.trim() || undefined,
      });

      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMessage(res.error || 'Failed to update password. Verify current password.');
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to change password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="admin-native-dialog w-full max-w-md bg-[#1e1e1e] text-[#ececec] border border-white/10 rounded-2xl p-0 overflow-hidden shadow-2xl backdrop:bg-black/75"
    >
      <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#171717]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <KeyRound size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Change Account Password</h3>
            <p className="text-[11px] text-[#8e8ea0]">
              Logged in as <strong>@{currentUser?.username}</strong>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-6">
        {isSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="text-base font-bold text-white">Password Changed!</h4>
            <p className="text-xs text-[#8e8ea0]">
              Your password has been updated across all active devices and secure recovery vaults.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} method="POST" noValidate className="kconnect-auth-form space-y-4">
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
              <label htmlFor="modalCurrentPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  id="modalCurrentPassword"
                  name="modalCurrentPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 bg-[#141414] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="modalNewPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                New Password
              </label>
              <div className="text-[11px] text-slate-400 mb-1.5">At least 6 characters.</div>
              <div className="relative">
                <input
                  id="modalNewPassword"
                  name="modalNewPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  placeholder="Enter new password"
                  className="w-full pl-3 pr-10 py-2 bg-[#141414] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="modalConfirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="modalConfirmPassword"
                  name="modalConfirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 bg-[#141414] border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {currentUser?.roleId !== 'ROLE_SUPER_ADMIN' && (
              <div>
                <label htmlFor="modalNewPin" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Quick Bench PIN (Optional)
                </label>
                <div className="text-[11px] text-slate-400 mb-1.5">Update your 4 to 6-digit numeric login PIN.</div>
                <input
                  id="modalNewPin"
                  name="modalNewPin"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="e.g. 1234"
                  className="w-full px-3 py-2 bg-[#141414] border border-white/15 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
};
