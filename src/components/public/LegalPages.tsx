import React from 'react';
import { useTheme } from '../../context/ThemeContext.tsx';
import { ShieldCheck, FileText, RefreshCw } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const bg = isLight ? '#ffffff' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#111111';
  const borderCol = isLight ? '#e5e7eb' : '#222222';
  const textMain = isLight ? '#111827' : '#f9fafb';
  const textMuted = isLight ? '#6b7280' : '#9ca3af';

  return (
    <div style={{ backgroundColor: bg, color: textMain, fontFamily: "'Inter', sans-serif", padding: '60px 20px 80px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10a37f', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
          <ShieldCheck size={16} /> DATA PRIVACY COMMITMENT
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '16px' }}>Privacy Policy</h1>
        <div style={{ fontSize: '13px', color: textMuted, marginBottom: '32px' }}>Last Updated: October 2026</div>

        <div style={{ padding: '36px', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${borderCol}`, lineHeight: 1.7, fontSize: '14.5px', color: textMuted }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: textMain, marginBottom: '10px' }}>1. Tenant Isolation & Zero Cross-Access</h2>
          <p style={{ marginBottom: '20px' }}>
            K-Connect is a multi-tenant platform. All repair jobs, customer names, phone numbers, hardware passcodes, and invoices entered by your shop are strictly isolated to your shop identifier. Neither other shops nor unauthorized third parties can access your data.
          </p>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: textMain, marginBottom: '10px' }}>2. Encrypted Hardware Passcodes</h2>
          <p style={{ marginBottom: '20px' }}>
            Customer device PINs, patterns, and Windows passwords collected during bench intake are encrypted using AES-256-GCM. Passcodes are accessible only to authorized shop technicians during active repairs and are never visible to platform administrators.
          </p>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: textMain, marginBottom: '10px' }}>3. Data Retention & Preservation</h2>
          <p style={{ marginBottom: '20px' }}>
            We do not sell, rent, or monetize your business records. In the event of trial expiration or subscription pause, your data remains preserved and intact. You can log in anytime to review past records or renew your licence.
          </p>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: textMain, marginBottom: '10px' }}>4. Contact for Privacy Inquiries</h2>
          <p>
            For questions regarding privacy, data export, or account deletion, contact our Data Protection Officer at <strong>billing@kconnect.cloud</strong> or +91 98422 00000.
          </p>
        </div>
      </div>
    </div>
  );
};

export const TermsOfServicePage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const bg = isLight ? '#ffffff' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#111111';
  const borderCol = isLight ? '#e5e7eb' : '#222222';
  const textMain = isLight ? '#111827' : '#f9fafb';
  const textMuted = isLight ? '#6b7280' : '#9ca3af';

  return (
    <div style={{ backgroundColor: bg, color: textMain, fontFamily: "'Inter', sans-serif", padding: '60px 20px 80px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10a37f', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
          <FileText size={16} /> USER AGREEMENT
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '16px' }}>Terms of Service</h1>
        <div style={{ fontSize: '13px', color: textMuted, marginBottom: '32px' }}>Last Updated: October 2026</div>

        <div style={{ padding: '36px', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${borderCol}`, lineHeight: 1.7, fontSize: '14.5px', color: textMuted }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: textMain, marginBottom: '10px' }}>1. SaaS Platform License</h2>
          <p style={{ marginBottom: '20px' }}>
            K-Connect grants registered repair laboratories a non-exclusive, non-transferable licence to use the service management platform for legitimate computer, electronics, and mobile repair operations for the duration of an active trial or paid annual term.
          </p>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: textMain, marginBottom: '10px' }}>2. 14-Day Free Trial Policy</h2>
          <p style={{ marginBottom: '20px' }}>
            New shops receive 14 days of free access starting from registration. Trial access is provided on a 1-trial-per-shop basis. Creating automated duplicate accounts to circumvent subscription renewal is strictly prohibited.
          </p>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: textMain, marginBottom: '10px' }}>3. Annual Subscription & GPay Verification</h2>
          <p style={{ marginBottom: '20px' }}>
            Annual subscription licences are billed in Indian Rupees (INR) at the rate configured in the active plan (₹14,999/year). Payments are collected via UPI/Google Pay and manually approved by the platform operator after verifying the 12-digit bank UTR reference. Licences run for exactly 365 days.
          </p>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: textMain, marginBottom: '10px' }}>4. Acceptable Bench Use</h2>
          <p>
            Users agree not to upload malicious payloads, reverse engineer platform source code, or attempt to compromise other tenants’ repair records.
          </p>
        </div>
      </div>
    </div>
  );
};

export const RefundPolicyPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const bg = isLight ? '#ffffff' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#111111';
  const borderCol = isLight ? '#e5e7eb' : '#222222';
  const textMain = isLight ? '#111827' : '#f9fafb';
  const textMuted = isLight ? '#6b7280' : '#9ca3af';

  return (
    <div style={{ backgroundColor: bg, color: textMain, fontFamily: "'Inter', sans-serif", padding: '60px 20px 80px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10a37f', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
          <RefreshCw size={16} /> SUBSCRIPTION TERMS
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '16px' }}>Refund & Cancellation Policy</h1>
        <div style={{ fontSize: '13px', color: textMuted, marginBottom: '32px' }}>Last Updated: October 2026</div>

        <div style={{ padding: '36px', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${borderCol}`, lineHeight: 1.7, fontSize: '14.5px', color: textMuted }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: textMain, marginBottom: '10px' }}>1. 14-Day Risk-Free Trial Evaluation</h2>
          <p style={{ marginBottom: '20px' }}>
            We provide an unrestricted 14-day free trial so that you can thoroughly test K-Connect on your front desk and technician benches before paying any subscription fee.
          </p>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: textMain, marginBottom: '10px' }}>2. 7-Day Money-Back Guarantee After Payment</h2>
          <p style={{ marginBottom: '20px' }}>
            If you purchase an annual licence and find that K-Connect does not suit your lab’s technical requirements, you may request a 100% refund within 7 calendar days of your payment approval date.
          </p>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: textMain, marginBottom: '10px' }}>3. How to Request a Refund</h2>
          <p style={{ marginBottom: '20px' }}>
            To initiate a refund, email <strong>billing@kconnect.cloud</strong> or message our support phone (+91 98422 00000) with your shop slug, registered phone number, and UPI ID. Approved refunds are processed directly back to your original bank account within 3-5 business days.
          </p>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: textMain, marginBottom: '10px' }}>4. Data Preservation After Cancellation</h2>
          <p>
            Upon cancellation or refund, your active operational licence is revoked, but your past repair records remain safely preserved in read-only format for your accounting and GST compliance.
          </p>
        </div>
      </div>
    </div>
  );
};
