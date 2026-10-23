import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wrench,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';
import { saasApi, setShopSlug } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const SignupPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const { refreshUserList } = useAuth();

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate clean slug from shop name
  const handleShopNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    setFormData((prev) => ({
      ...prev,
      shopName: val,
      slug: prev.slug === '' || prev.slug === prev.shopName.toLowerCase().replace(/[^a-z0-9]/g, '-') ? generatedSlug : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shopName.trim() || !formData.slug.trim() || !formData.ownerName.trim() || !formData.phone.trim() || !formData.password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await saasApi.public.register({
        ...formData,
        slug: formData.slug.trim().toLowerCase(),
      });

      if (res.success) {
        setShopSlug(formData.slug.trim().toLowerCase());
        await refreshUserList();
        // Redirect to onboarding
        navigate('/onboarding');
      } else {
        setError(res.error || 'Failed to create shop account. Please verify details.');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Registration communication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const bg = isLight ? '#ffffff' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#111111';
  const borderCol = isLight ? '#e5e7eb' : '#222222';
  const textMain = isLight ? '#111827' : '#f9fafb';
  const textMuted = isLight ? '#6b7280' : '#9ca3af';
  const inputBg = isLight ? '#f9fafb' : '#171717';

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
      <div style={{ maxWidth: '560px', width: '100%', margin: '0 auto' }}>
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
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10a37f, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(16, 163, 127, 0.25)',
              }}
            >
              <Wrench size={22} />
            </div>
            <span style={{ fontSize: '20px', fontWeight: 800 }}>K-Connect SaaS</span>
          </Link>

          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>
            Start Your 14-Day Free Trial
          </h1>
          <p style={{ fontSize: '14px', color: textMuted }}>
            Full multi-device cloud workspace for your computer & mobile repair shop. No credit card required.
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Shop Name & Slug */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Shop / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Computer Care"
                  value={formData.shopName}
                  onChange={handleShopNameChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Shop URL Handle (Slug) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. apex-care"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13.5px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Owner Full Name & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Owner Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Mobile Number (WhatsApp) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="98422 12345"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Email & Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="ramesh@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Create Admin Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* City & State */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>State *</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: inputBg,
                    color: textMain,
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '10px',
                padding: '13px',
                backgroundColor: '#10a37f',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14.5px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 163, 127, 0.3)',
              }}
            >
              {isSubmitting ? 'Provisioning Shop...' : 'Create Account & Start 14-Day Free Trial'} <ArrowRight size={16} />
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
