import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wrench,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';
import { saasApi, setShopSlug } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { formatUserFriendlyError } from '../../utils/formatError.ts';

export const SignupPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const { login, refreshUserList } = useAuth();
  const { showError, showSuccess } = useToast();

  const [formData, setFormData] = useState({
    shopName: '',
    slug: '',
    ownerName: '',
    phone: '',
    email: '',
    username: 'admin',
    password: '',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    pincode: '',
  });

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live availability states
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [slugMessage, setSlugMessage] = useState<string>('');

  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [emailMessage, setEmailMessage] = useState<string>('');

  const [phoneStatus, setPhoneStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [phoneMessage, setPhoneMessage] = useState<string>('');

  const slugTimerRef = useRef<any>(null);
  const emailTimerRef = useRef<any>(null);
  const phoneTimerRef = useRef<any>(null);

  // Generates clean URL slug while maintaining user typing flow with hyphens & spaces
  const slugifyWhileTyping = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+/, '');
  };

  const handleShopNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const generatedSlug = slugifyWhileTyping(val);
    const nextSlug = isSlugManuallyEdited ? formData.slug : generatedSlug;

    setFormData((prev) => ({
      ...prev,
      shopName: val,
      slug: nextSlug,
    }));

    if (!isSlugManuallyEdited && generatedSlug.replace(/-+$/, '').length >= 3) {
      triggerSlugCheck(generatedSlug.replace(/-+$/, ''));
    }

    if (fieldErrors.shopName) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.shopName;
        return next;
      });
    }
  };

  const triggerSlugCheck = (slugVal: string) => {
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    const clean = slugVal.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').replace(/-+$/, '');
    if (clean.length < 3) {
      setSlugStatus(clean.length > 0 ? 'invalid' : 'idle');
      setSlugMessage(clean.length > 0 ? 'URL handle must be at least 3 characters.' : '');
      return;
    }

    setSlugStatus('checking');
    setSlugMessage('Checking availability...');

    slugTimerRef.current = setTimeout(async () => {
      try {
        const res = await saasApi.public.checkAvailability({ slug: clean });
        if (res.success && res.data?.slug) {
          if (res.data.slug.available) {
            setSlugStatus('available');
            setSlugMessage(`✓ "${clean}" is available!`);
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next.slug;
              return next;
            });
          } else {
            setSlugStatus('taken');
            setSlugMessage(res.data.slug.message || `✕ Handle "${clean}" is already taken`);
            setFieldErrors((prev) => ({ ...prev, slug: res.data.slug.message || 'Handle already taken' }));
          }
        }
      } catch {
        setSlugStatus('idle');
      }
    }, 350);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setIsSlugManuallyEdited(val.length > 0);
    setFormData((prev) => ({ ...prev, slug: val }));
    triggerSlugCheck(val);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, email: val }));

    if (fieldErrors.email) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    }

    if (emailTimerRef.current) clearTimeout(emailTimerRef.current);
    if (!val.trim()) {
      setEmailStatus('idle');
      setEmailMessage('');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
      setEmailStatus('invalid');
      setEmailMessage('Please enter a valid email format.');
      return;
    }

    setEmailStatus('checking');
    setEmailMessage('Verifying email uniqueness...');

    emailTimerRef.current = setTimeout(async () => {
      try {
        const res = await saasApi.public.checkAvailability({ email: val.trim() });
        if (res.success && res.data?.email) {
          if (res.data.email.available) {
            setEmailStatus('available');
            setEmailMessage('✓ Email address is available');
          } else {
            setEmailStatus('taken');
            setEmailMessage(res.data.email.message || '✕ Email is already registered');
            setFieldErrors((prev) => ({ ...prev, email: 'Email is already registered to another shop' }));
          }
        }
      } catch {
        setEmailStatus('idle');
      }
    }, 400);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, phone: val }));

    if (fieldErrors.phone) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }

    if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);
    const cleanDigits = val.replace(/[^0-9]/g, '');
    if (cleanDigits.length < 10) {
      setPhoneStatus('idle');
      setPhoneMessage('');
      return;
    }

    setPhoneStatus('checking');
    setPhoneMessage('Verifying mobile number...');

    phoneTimerRef.current = setTimeout(async () => {
      try {
        const res = await saasApi.public.checkAvailability({ phone: val.trim() });
        if (res.success && res.data?.phone) {
          if (res.data.phone.available) {
            setPhoneStatus('available');
            setPhoneMessage('✓ Mobile number is available');
          } else {
            setPhoneStatus('taken');
            setPhoneMessage(res.data.phone.message || '✕ Mobile number already registered');
            setFieldErrors((prev) => ({ ...prev, phone: 'Mobile number already registered to another shop' }));
          }
        }
      } catch {
        setPhoneStatus('idle');
      }
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
      if (emailTimerRef.current) clearTimeout(emailTimerRef.current);
      if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);
    };
  }, []);

  const scrollToFirstError = (errors: Record<string, string>) => {
    const fieldOrder = ['shopName', 'slug', 'ownerName', 'phone', 'username', 'password', 'email', 'city', 'state'];
    for (const key of fieldOrder) {
      if (errors[key]) {
        const el = document.getElementById(`signup_${key}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
        break;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.shopName.trim() || formData.shopName.trim().length < 2) {
      errors.shopName = 'Shop / Business Name must be at least 2 characters.';
    }

    const cleanSlug = formData.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').replace(/^-+|-+$/g, '');
    if (!cleanSlug || cleanSlug.length < 3) {
      errors.slug = 'Shop URL Handle must be at least 3 characters.';
    } else if (slugStatus === 'taken') {
      errors.slug = `Handle "${cleanSlug}" is already taken. Please choose another.`;
    }

    if (!formData.ownerName.trim() || formData.ownerName.trim().length < 2) {
      errors.ownerName = 'Owner Full Name is required.';
    }

    const cleanDigits = formData.phone.replace(/[^0-9]/g, '');
    if (!formData.phone.trim() || cleanDigits.length < 10) {
      errors.phone = 'Valid 10-digit mobile number is required.';
    } else if (phoneStatus === 'taken') {
      errors.phone = 'This mobile number is already registered to an existing shop.';
    }

    const cleanUsername = (formData.username || '').trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      errors.username = 'Admin username must be at least 3 characters.';
    } else if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
      errors.username = 'Username can only contain letters, numbers, hyphens, and underscores.';
    }

    if (formData.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        errors.email = 'Please enter a valid email address.';
      } else if (emailStatus === 'taken') {
        errors.email = 'This email address is already registered to an account.';
      }
    }

    if (!formData.password || formData.password.length < 6) {
      errors.password = 'Admin password must be at least 6 characters.';
    }

    if (!formData.city.trim()) {
      errors.city = 'City is required.';
    }

    if (!formData.state.trim()) {
      errors.state = 'State is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstKey = Object.keys(errors)[0];
      const firstMsg = errors[firstKey];
      setError(firstMsg);
      showError(firstMsg);
      scrollToFirstError(errors);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const payload: Record<string, any> = {
        shopName: formData.shopName.trim(),
        slug: cleanSlug,
        ownerName: formData.ownerName.trim(),
        phone: formData.phone.trim(),
        username: formData.username || 'admin',
        password: formData.password,
        city: formData.city.trim() || 'Coimbatore',
        state: formData.state.trim() || 'Tamil Nadu',
      };
      if (formData.email && formData.email.trim()) {
        payload.email = formData.email.trim().toLowerCase();
      }
      if (formData.pincode && formData.pincode.trim()) {
        payload.pincode = formData.pincode.trim();
      }

      const res = await saasApi.public.register(payload);

      if (res.success) {
        showSuccess(`Shop workspace "${formData.shopName}" created successfully! Starting free trial.`);
        setShopSlug(cleanSlug);
        try {
          await login({
            username: formData.username,
            password: formData.password,
            shopSlug: cleanSlug,
          });
        } catch (_) {
          await refreshUserList();
        }
        // Redirect directly to the /app dashboard
        navigate('/app', { replace: true });
      } else {
        const errorMsg = formatUserFriendlyError(res.error || 'Failed to create shop account. Please verify details.');
        setError(errorMsg);
        showError(errorMsg);

        if ((res as any).field) {
          const offendingField = (res as any).field;
          const fieldMap: Record<string, string> = { [offendingField]: errorMsg };
          setFieldErrors(fieldMap);
          scrollToFirstError(fieldMap);
        }
      }
    } catch (err: unknown) {
      const msg = formatUserFriendlyError(err);
      setError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
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
        alignItems: 'center',
        padding: '12px 16px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto' }}>
        {/* Compact Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              color: 'inherit',
              marginBottom: '4px',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10a37f, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(16, 163, 127, 0.28)',
              }}
            >
              <Wrench size={16} />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 800 }}>K-Connect SaaS</span>
          </Link>

          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px 0', letterSpacing: '-0.3px' }}>
            Start Your 14-Day Free Trial
          </h1>
          <p style={{ fontSize: '12px', color: textMuted, margin: 0 }}>
            Multi-workstation cloud workspace for your computer &amp; mobile service laboratory.
          </p>
        </div>

        {/* Card Form */}
        <div
          style={{
            padding: '18px 22px',
            borderRadius: '14px',
            backgroundColor: cardBg,
            border: `1px solid ${borderCol}`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          }}
        >
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '7px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                fontSize: '12px',
                marginBottom: '10px',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} noValidate>
            {/* Row 1: Shop Name & Slug */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '3px' }}>
                  Shop / Business Name *
                </label>
                <input
                  id="signup_shopName"
                  type="text"
                  placeholder="e.g. Apex Computer Care"
                  value={formData.shopName}
                  onChange={handleShopNameChange}
                  className={fieldErrors.shopName ? 'input-error' : ''}
                  style={{
                    width: '100%',
                    padding: '7.5px 11px',
                    borderRadius: '7px',
                    border: `1px solid ${fieldErrors.shopName ? '#ef4444' : borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.shopName && (
                  <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px', fontWeight: 500 }}>
                    {fieldErrors.shopName}
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600 }}>
                    Shop URL Handle (Slug) *
                  </label>
                  {slugStatus === 'checking' && (
                    <span style={{ fontSize: '10.5px', color: '#10a37f', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Loader2 size={10} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} /> checking
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="signup_slug"
                    type="text"
                    placeholder="e.g. computechstore"
                    value={formData.slug}
                    onChange={handleSlugChange}
                    className={fieldErrors.slug || slugStatus === 'taken' ? 'input-error' : ''}
                    style={{
                      width: '100%',
                      padding: '7.5px 28px 7.5px 11px',
                      borderRadius: '7px',
                      border: `1px solid ${fieldErrors.slug || slugStatus === 'taken'
                          ? '#ef4444'
                          : slugStatus === 'available'
                            ? '#10a37f'
                            : borderCol
                        }`,
                      backgroundColor: inputBg,
                      color: textMain,
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                    {slugStatus === 'available' && <CheckCircle2 size={15} color="#10a37f" />}
                    {slugStatus === 'taken' && <XCircle size={15} color="#ef4444" />}
                  </div>
                </div>

                {/* Live Dedicated Portal URL preview (GreytHR style) */}
                <div
                  style={{
                    marginTop: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: isLight ? '#f3f4f6' : '#1a1a1a',
                    border: `1px solid ${borderCol}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                    <Globe size={12} color="#10a37f" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '10.5px', color: textMuted, flexShrink: 0 }}>Portal:</span>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: formData.slug ? (slugStatus === 'taken' ? '#ef4444' : '#10a37f') : textMuted,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      /shop/{formData.slug || 'your-shop-name'}
                    </span>
                  </div>
                  {formData.slug && (
                    <button
                      type="button"
                      onClick={() => {
                        const origin = typeof window !== 'undefined' ? window.location.origin : '';
                        const fullUrl = `${origin}/shop/${formData.slug}`;
                        navigator.clipboard.writeText(fullUrl);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: `1px solid ${borderCol}`,
                        background: isLight ? '#fff' : '#262626',
                        color: textMain,
                        cursor: 'pointer',
                        flexShrink: 0,
                        fontWeight: 500,
                      }}
                    >
                      {copiedUrl ? '✓ Copied' : 'Copy'}
                    </button>
                  )}
                </div>

                {slugMessage && (
                  <div
                    style={{
                      color: slugStatus === 'available' ? '#10a37f' : '#ef4444',
                      fontSize: '11px',
                      marginTop: '2px',
                      fontWeight: 500,
                    }}
                  >
                    {slugMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Owner Full Name & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '3px' }}>
                  Owner Full Name *
                </label>
                <input
                  id="signup_ownerName"
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.ownerName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      ownerName: val,
                      username: prev.username === 'admin' || !prev.username ? 'admin' : prev.username,
                    }));
                    if (fieldErrors.ownerName) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.ownerName;
                        return next;
                      });
                    }
                  }}
                  className={fieldErrors.ownerName ? 'input-error' : ''}
                  style={{
                    width: '100%',
                    padding: '7.5px 11px',
                    borderRadius: '7px',
                    border: `1px solid ${fieldErrors.ownerName ? '#ef4444' : borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.ownerName && (
                  <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px', fontWeight: 500 }}>
                    {fieldErrors.ownerName}
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600 }}>
                    Mobile Number (WhatsApp) *
                  </label>
                  {phoneStatus === 'checking' && (
                    <span style={{ fontSize: '10.5px', color: '#10a37f', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> checking
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="signup_phone"
                    type="text"
                    placeholder="98422 12345"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className={fieldErrors.phone || phoneStatus === 'taken' ? 'input-error' : ''}
                    style={{
                      width: '100%',
                      padding: '7.5px 28px 7.5px 11px',
                      borderRadius: '7px',
                      border: `1px solid ${fieldErrors.phone || phoneStatus === 'taken'
                          ? '#ef4444'
                          : phoneStatus === 'available'
                            ? '#10a37f'
                            : borderCol
                        }`,
                      backgroundColor: inputBg,
                      color: textMain,
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                    {phoneStatus === 'available' && <CheckCircle2 size={15} color="#10a37f" />}
                    {phoneStatus === 'taken' && <XCircle size={15} color="#ef4444" />}
                  </div>
                </div>
                {phoneMessage && (
                  <div
                    style={{
                      color: phoneStatus === 'available' ? '#10a37f' : '#ef4444',
                      fontSize: '11px',
                      marginTop: '2px',
                      fontWeight: 500,
                    }}
                  >
                    {phoneMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Create Admin Username & Password */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '3px' }}>
                  Create Admin Username *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="signup_username"
                    type="text"
                    placeholder="e.g. admin or yourname"
                    value={formData.username}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                      setFormData({ ...formData, username: val });
                      if (fieldErrors.username) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.username;
                          return next;
                        });
                      }
                    }}
                    className={fieldErrors.username ? 'input-error' : ''}
                    style={{
                      width: '100%',
                      padding: '7.5px 11px',
                      borderRadius: '7px',
                      border: `1px solid ${fieldErrors.username ? '#ef4444' : borderCol}`,
                      backgroundColor: inputBg,
                      color: textMain,
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                {fieldErrors.username && (
                  <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px', fontWeight: 500 }}>
                    {fieldErrors.username}
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600 }}>
                    Create Admin Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: '10.5px',
                      color: textMuted,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  id="signup_password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.password;
                        return next;
                      });
                    }
                  }}
                  className={fieldErrors.password ? 'input-error' : ''}
                  style={{
                    width: '100%',
                    padding: '7.5px 11px',
                    borderRadius: '7px',
                    border: `1px solid ${fieldErrors.password ? '#ef4444' : borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.password && (
                  <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px', fontWeight: 500 }}>
                    {fieldErrors.password}
                  </div>
                )}
              </div>
            </div>

            {/* Row 4: Email Address & City */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600 }}>
                    Email Address (Optional)
                  </label>
                  {emailStatus === 'checking' && (
                    <span style={{ fontSize: '10.5px', color: '#10a37f', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> checking
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="signup_email"
                    type="email"
                    placeholder="e.g. computech@gmail.com"
                    value={formData.email}
                    onChange={handleEmailChange}
                    className={fieldErrors.email || emailStatus === 'taken' ? 'input-error' : ''}
                    style={{
                      width: '100%',
                      padding: '7.5px 28px 7.5px 11px',
                      borderRadius: '7px',
                      border: `1px solid ${fieldErrors.email || emailStatus === 'taken'
                          ? '#ef4444'
                          : emailStatus === 'available'
                            ? '#10a37f'
                            : borderCol
                        }`,
                      backgroundColor: inputBg,
                      color: textMain,
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                    {emailStatus === 'available' && <CheckCircle2 size={15} color="#10a37f" />}
                    {emailStatus === 'taken' && <XCircle size={15} color="#ef4444" />}
                  </div>
                </div>
                {emailMessage && (
                  <div
                    style={{
                      color: emailStatus === 'available' ? '#10a37f' : '#ef4444',
                      fontSize: '11px',
                      marginTop: '2px',
                      fontWeight: 500,
                    }}
                  >
                    {emailMessage}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '3px' }}>
                  City *
                </label>
                <input
                  id="signup_city"
                  type="text"
                  placeholder="e.g. Nagercoil, Coimbatore"
                  value={formData.city}
                  onChange={(e) => {
                    setFormData({ ...formData, city: e.target.value });
                    if (fieldErrors.city) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.city;
                        return next;
                      });
                    }
                  }}
                  className={fieldErrors.city ? 'input-error' : ''}
                  style={{
                    width: '100%',
                    padding: '7.5px 11px',
                    borderRadius: '7px',
                    border: `1px solid ${fieldErrors.city ? '#ef4444' : borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.city && (
                  <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px', fontWeight: 500 }}>
                    {fieldErrors.city}
                  </div>
                )}
              </div>
            </div>

            {/* Row 5: State & Pincode */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '3px' }}>
                  State *
                </label>
                <input
                  id="signup_state"
                  type="text"
                  placeholder="e.g. Tamil Nadu"
                  value={formData.state}
                  onChange={(e) => {
                    setFormData({ ...formData, state: e.target.value });
                    if (fieldErrors.state) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.state;
                        return next;
                      });
                    }
                  }}
                  className={fieldErrors.state ? 'input-error' : ''}
                  style={{
                    width: '100%',
                    padding: '7.5px 11px',
                    borderRadius: '7px',
                    border: `1px solid ${fieldErrors.state ? '#ef4444' : borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.state && (
                  <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px', fontWeight: 500 }}>
                    {fieldErrors.state}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '3px' }}>
                  PIN Code (Optional)
                </label>
                <input
                  id="signup_pincode"
                  type="text"
                  placeholder="e.g. 641001"
                  value={formData.pincode}
                  onChange={(e) => {
                    setFormData({ ...formData, pincode: e.target.value });
                  }}
                  style={{
                    width: '100%',
                    padding: '7.5px 11px',
                    borderRadius: '7px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || slugStatus === 'taken' || emailStatus === 'taken' || phoneStatus === 'taken'}
              style={{
                marginTop: '6px',
                padding: '10.5px 16px',
                backgroundColor: isSubmitting || slugStatus === 'taken' || emailStatus === 'taken' || phoneStatus === 'taken'
                  ? (isLight ? '#9ca3af' : '#4b5563')
                  : (isLight ? '#0d0d0d' : '#ececec'),
                color: isLight ? '#ffffff' : '#0d0d0d',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: isSubmitting || slugStatus === 'taken' || emailStatus === 'taken' || phoneStatus === 'taken'
                  ? 'not-allowed'
                  : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  Provisioning Cloud Laboratory...
                </>
              ) : (
                <>
                  Create Account &amp; Start 14-Day Free Trial <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Login prompt */}
          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: textMuted }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#10a37f', fontWeight: 600, textDecoration: 'none' }}>
              Sign In to Your Shop
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
