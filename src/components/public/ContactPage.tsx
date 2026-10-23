import React, { useState } from 'react';
import { Phone, Mail, MapPin, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';
import { saasApi } from '../../api/client.ts';

export const ContactPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Sales Inquiry / Demo',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await saasApi.public.submitContact(formData);
      if (res.success) {
        setSuccessMessage('Thank you! Your message has been received. Our team will contact you within 24 hours.');
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: 'Sales Inquiry / Demo',
          message: '',
        });
      } else {
        setErrorMessage(res.error || 'Failed to submit inquiry. Please try again or call us directly.');
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Communication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const bg = isLight ? '#ffffff' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#111111';
  const borderCol = isLight ? '#e5e7eb' : '#222222';
  const textMain = isLight ? '#111827' : '#f9fafb';
  const textMuted = isLight ? '#6b7280' : '#9ca3af';

  return (
    <div style={{ backgroundColor: bg, color: textMain, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <section style={{ padding: '70px 20px 40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#10a37f', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
          Get In Touch
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 50px)', fontWeight: 900, letterSpacing: '-1.2px', marginBottom: '20px' }}>
          We’re Here to Help Your Repair Lab Succeed
        </h1>
        <p style={{ fontSize: '16px', color: textMuted, lineHeight: 1.6 }}>
          Have questions about multi-workstation setup, annual GPay payments, thermal printers, or custom shop migration? Talk to our founders directly.
        </p>
      </section>

      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px 80px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '30px',
            alignItems: 'flex-start',
          }}
        >
          {/* Contact Details */}
          <div style={{ padding: '36px', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${borderCol}` }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>Direct Support & Operations</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(16, 163, 127, 0.15)', color: '#10a37f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Phone & WhatsApp Support</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>+91 98422 00000</div>
                  <div style={{ fontSize: '12px', color: textMuted, marginTop: '2px' }}>Mon - Sat: 9:30 AM to 8:30 PM IST</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(16, 163, 127, 0.15)', color: '#10a37f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Email Correspondence</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>billing@kconnect.cloud</div>
                  <div style={{ fontSize: '12px', color: textMuted, marginTop: '2px' }}>Inquiries answered within 2-4 hours</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(16, 163, 127, 0.15)', color: '#10a37f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Main Headquarters</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px', lineHeight: 1.5 }}>
                    K-Connect Cloud SaaS Technologies<br />
                    Gandhipuram Market, Coimbatore, Tamil Nadu 641012, India
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: isLight ? '#f0fdf4' : 'rgba(16, 163, 127, 0.08)', border: `1px solid ${isLight ? '#bbf7d0' : 'rgba(16, 163, 127, 0.3)'}`, fontSize: '13px', color: '#10a37f', lineHeight: 1.5 }}>
              💡 <strong>Instant Activation:</strong> If you have already made a GPay payment, simply submit your 12-digit UTR on the checkout page for rapid verification.
            </div>
          </div>

          {/* Contact Form */}
          <div style={{ padding: '36px', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${borderCol}` }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Send Us a Message</h2>
            <p style={{ fontSize: '13.5px', color: textMuted, marginBottom: '24px' }}>
              Fill in your details and we’ll reach out to schedule an onboarding walkthrough.
            </p>

            {successMessage && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(16, 163, 127, 0.12)', border: '1px solid #10a37f', color: '#10a37f', fontSize: '13px', marginBottom: '20px' }}>
                <CheckCircle size={18} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '13px', marginBottom: '20px' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>Your Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senthil Nathan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: isLight ? '#ffffff' : '#171717', color: textMain, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="senthil@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: isLight ? '#ffffff' : '#171717', color: textMain, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="98422 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: isLight ? '#ffffff' : '#171717', color: textMain, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: isLight ? '#ffffff' : '#171717', color: textMain, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="Sales Inquiry / Demo">Sales Inquiry & Onboarding Demo</option>
                  <option value="GPay Payment Assistance">GPay Payment & Licence Verification</option>
                  <option value="Hardware / Printer Setup">Thermal Printer & Scanner Integration</option>
                  <option value="Feature Request">New Feature Suggestion</option>
                  <option value="General Question">General Question</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>Message *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us about your shop (how many technicians, types of repairs, or questions you have)..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderCol}`, backgroundColor: isLight ? '#ffffff' : '#171717', color: textMain, fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#10a37f',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Send size={16} /> {isSubmitting ? 'Submitting...' : 'Send Inquiry'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
