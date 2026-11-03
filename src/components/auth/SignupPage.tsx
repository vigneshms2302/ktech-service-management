import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wrench,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';
import { saasApi, setShopSlug } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';

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

  // Auto-generate clean slug from shop name
  const handleShopNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    setFormData((prev) => {
      const shouldUpdateSlug = prev.slug === '' || prev.slug === prev.shopName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const nextSlug = shouldUpdateSlug ? generatedSlug : prev.slug;
      if (shouldUpdateSlug && generatedSlug.length >= 3) {
        triggerSlugCheck(generatedSlug);
      }
      return {
        ...prev,
        shopName: val,
        slug: nextSlug,
      };
    });

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
    const clean = slugVal.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
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
    const fieldOrder = ['shopName', 'slug', 'ownerName', 'phone', 'email', 'password', 'city', 'state'];
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

    const cleanSlug = formData.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
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
      const res = await saasApi.public.register({
        ...formData,
        slug: cleanSlug,
      });

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
        const errorMsg = res.error || 'Failed to create shop account. Please verify details.';
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
      const msg = (err as Error).message || 'Registration communication error.';
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
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: '580px', width: '100%', margin: '0 auto' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: 'inherit',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #10a37f, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(16, 163, 127, 0.28)',
              }}
            >
              <Wrench size={22} />
            </div>
            <span style={{ fontSize: '21px', fontWeight: 800 }}>K-Connect SaaS</span>
          </Link>

          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>
            Start Your 14-Day Free Trial
          </h1>
          <p style={{ fontSize: '14px', color: textMuted }}>
            Full multi-workstation cloud workspace for your computer & mobile service laboratory.
          </p>
        </div>

        {/* Card Form */}
        <div
          style={{
            padding: '36px',
            borderRadius: '16px',
            backgroundColor: cardBg,
            border: `1px solid ${borderCol}`,
            boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
          }}
        >
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                fontSize: '13px',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} noValidate>
            {/* Shop Name & Slug */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
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
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.shopName ? '#ef4444' : borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.shopName && (
                  <div style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                    {fieldErrors.shopName}
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600 }}>
                    Shop URL Handle (Slug) *
                  </label>
                  {slugStatus === 'checking' && (
                    <span style={{ fontSize: '11px', color: '#10a37f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Loader2 size={11} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} /> checking
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
                      padding: '10px 32px 10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${
                        fieldErrors.slug || slugStatus === 'taken'
                          ? '#ef4444'
                          : slugStatus === 'available'
                          ? '#10a37f'
                          : borderCol
                      }`,
                      backgroundColor: inputBg,
                      color: textMain,
                      fontSize: '13.5px',
                      fontFamily: 'monospace',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                    {slugStatus === 'available' && <CheckCircle2 size={16} color="#10a37f" />}
                    {slugStatus === 'taken' && <XCircle size={16} color="#ef4444" />}
                  </div>
                </div>
                {slugMessage && (
                  <div
                    style={{
                      color: slugStatus === 'available' ? '#10a37f' : '#ef4444',
                      fontSize: '11.5px',
                      marginTop: '4px',
                      fontWeight: 500,
                    }}
                  >
                    {slugMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Owner Full Name & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Owner Full Name *
                </label>
                <input
                  id="signup_ownerName"
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.ownerName}
                  onChange={(e) => {
                    setFormData({ ...formData, ownerName: e.target.value });
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
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.ownerName ? '#ef4444' : borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.ownerName && (
                  <div style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                    {fieldErrors.ownerName}
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600 }}>
                    Mobile Number (WhatsApp) *
                  </label>
                  {phoneStatus === 'checking' && (
                    <span style={{ fontSize: '11px', color: '#10a37f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> checking
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
                      padding: '10px 32px 10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${
                        fieldErrors.phone || phoneStatus === 'taken'
                          ? '#ef4444'
                          : phoneStatus === 'available'
                          ? '#10a37f'
                          : borderCol
                      }`,
                      backgroundColor: inputBg,
                      color: textMain,
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                    {phoneStatus === 'available' && <CheckCircle2 size={16} color="#10a37f" />}
                    {phoneStatus === 'taken' && <XCircle size={16} color="#ef4444" />}
                  </div>
                </div>
                {phoneMessage && (
                  <div
                    style={{
                      color: phoneStatus === 'available' ? '#10a37f' : '#ef4444',
                      fontSize: '11.5px',
                      marginTop: '4px',
                      fontWeight: 500,
                    }}
                  >
                    {phoneMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Email & Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600 }}>
                    Email Address (Optional)
                  </label>
                  {emailStatus === 'checking' && (
                    <span style={{ fontSize: '11px', color: '#10a37f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> checking
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="signup_email"
                    type="email"
                    placeholder="ramesh@gmail.com"
                    value={formData.email}
                    onChange={handleEmailChange}
                    className={fieldErrors.email || emailStatus === 'taken' ? 'input-error' : ''}
                    style={{
                      width: '100%',
                      padding: '10px 32px 10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${
                        fieldErrors.email || emailStatus === 'taken'
                          ? '#ef4444'
                          : emailStatus === 'available'
                          ? '#10a37f'
                          : borderCol
                      }`,
                      backgroundColor: inputBg,
                      color: textMain,
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                    {emailStatus === 'available' && <CheckCircle2 size={16} color="#10a37f" />}
                    {emailStatus === 'taken' && <XCircle size={16} color="#ef4444" />}
                  </div>
                </div>
                {emailMessage && (
                  <div
                    style={{
                      color: emailStatus === 'available' ? '#10a37f' : '#ef4444',
                      fontSize: '11.5px',
                      marginTop: '4px',
                      fontWeight: 500,
                    }}
                  >
                    {emailMessage}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Create Admin Password *
                </label>
                <input
                  id="signup_password"
                  type="password"
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
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.password ? '#ef4444' : borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.password && (
                  <div style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                    {fieldErrors.password}
                  </div>
                )}
              </div>
            </div>

            {/* City & State */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>City *</label>
                <input
                  id="signup_city"
                  type="text"
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
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.city ? '#ef4444' : borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.city && (
                  <div style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                    {fieldErrors.city}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>State *</label>
                <input
                  id="signup_state"
                  type="text"
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
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.state ? '#ef4444' : borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {fieldErrors.state && (
                  <div style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', fontWeight: 500 }}>
                    {fieldErrors.state}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || slugStatus === 'taken' || emailStatus === 'taken' || phoneStatus === 'taken'}
              style={{
                marginTop: '10px',
                padding: '13px',
                backgroundColor: isSubmitting || slugStatus === 'taken' || emailStatus === 'taken' || phoneStatus === 'taken'
                  ? (isLight ? '#9ca3af' : '#4b5563')
                  : (isLight ? '#0d0d0d' : '#ececec'),
                color: isLight ? '#ffffff' : '#0d0d0d',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '14.5px',
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
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Provisioning Cloud Laboratory...
                </>
              ) : (
                <>
                  Create Account & Start 14-Day Free Trial <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Login prompt */}
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: textMuted }}>
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
