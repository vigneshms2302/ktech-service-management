import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  ArrowRight,
  QrCode,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';
import { saasApi } from '../../api/client.ts';

export const PricingPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [platformSettings, setPlatformSettings] = useState<{
    annualPriceInr: number;
    payeeName: string;
    upiId: string;
    trialDurationDays: number;
  }>({
    annualPriceInr: 14999,
    payeeName: 'K-Connect Cloud SaaS Technologies',
    upiId: 'ktech@upi',
    trialDurationDays: 14,
  });

  useEffect(() => {
    saasApi.public.getSettings().then((res) => {
      if (res.success && res.data) {
        setPlatformSettings({
          annualPriceInr: res.data.annualPriceInr || 14999,
          payeeName: res.data.payeeName || 'K-Connect Cloud SaaS Technologies',
          upiId: res.data.upiId || 'ktech@upi',
          trialDurationDays: res.data.trialDurationDays || 14,
        });
      }
    });
  }, []);

  const bg = isLight ? '#ffffff' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#111111';
  const borderCol = isLight ? '#e5e7eb' : '#222222';
  const textMain = isLight ? '#111827' : '#f9fafb';
  const textMuted = isLight ? '#6b7280' : '#9ca3af';

  const faqs = [
    {
      q: 'How does the 14-day free trial work?',
      a: 'When you register your shop, your 14-day trial starts immediately with full access to all features, multi-device cloud sync, and 5 seats. No credit card or payment is required upfront.',
    },
    {
      q: 'How do I pay for the annual subscription?',
      a: `Payments are made directly via Google Pay, PhonePe, Paytm, or any UPI app by scanning our verified official QR code or sending to ${platformSettings.upiId}. Once you submit your 12-digit UTR reference, our team manually verifies the bank credit and activates your 365-day licence.`,
    },
    {
      q: 'What happens to my data after the 14-day trial expires?',
      a: 'All your customer data, job cards, inventory records, and invoices remain completely preserved and safe. You will never lose records. Simply complete the annual renewal to resume full operational access.',
    },
    {
      q: 'Can multiple computers in my shop use K-Connect at the same time?',
      a: 'Yes! Your annual plan includes 5 concurrent staff seats. Your front desk reception desktop, technician bench laptops, and shop owner mobile browser can all work simultaneously on the same live database.',
    },
    {
      q: 'Do you charge transaction fees on customer payments?',
      a: 'Zero transaction fees. K-Connect does not touch or cut fees from your customer payments. When customers pay your shop via your shop UPI QR code, 100% goes directly to your bank account.',
    },
  ];

  return (
    <div style={{ backgroundColor: bg, color: textMain, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <section style={{ padding: '70px 20px 40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#10a37f', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
          Predictable Pricing
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 900, letterSpacing: '-1.2px', marginBottom: '20px' }}>
          One Plan. Full Power. No Hidden Fees.
        </h1>
        <p style={{ fontSize: '16px', color: textMuted, lineHeight: 1.6 }}>
          Start with a risk-free {platformSettings.trialDurationDays}-day trial. Upgrade to an annual licence via convenient Google Pay QR verification.
        </p>
      </section>

      {/* Main Pricing Box */}
      <section style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px 60px' }}>
        <div
          style={{
            borderRadius: '20px',
            backgroundColor: cardBg,
            border: '2px solid #10a37f',
            boxShadow: '0 20px 60px rgba(16, 163, 127, 0.15)',
            overflow: 'hidden',
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              padding: '24px 32px',
              backgroundColor: isLight ? '#f0fdf4' : 'rgba(16, 163, 127, 0.1)',
              borderBottom: `1px solid ${borderCol}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#10a37f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Full Commercial Lab License
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 800, marginTop: '2px' }}>K-Connect Professional Annual</h2>
            </div>
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                backgroundColor: '#10a37f',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              Includes {platformSettings.trialDurationDays}-Day Free Trial
            </span>
          </div>

          <div style={{ padding: '36px 32px' }}>
            {/* Price Display */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '48px', fontWeight: 900, color: textMain }}>
                ₹{platformSettings.annualPriceInr.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: '15px', color: textMuted }}>/ year</span>
              <span style={{ fontSize: '13px', color: '#10a37f', fontWeight: 600, marginLeft: '8px' }}>
                (₹{Math.round(platformSettings.annualPriceInr / 12).toLocaleString('en-IN')}/month)
              </span>
            </div>

            <p style={{ fontSize: '14px', color: textMuted, marginBottom: '32px' }}>
              Full commercial licence for 1 shop location. Includes 5 workstation seats, unlimited service tickets, automated GST reporting, and priority support.
            </p>

            {/* Included features list */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '36px' }}>
              {[
                'Unlimited computer, laptop & mobile repair jobs',
                '13-stage diagnostic state machine',
                'Multi-tier spare parts & scrap salvage lineage',
                'Customer WhatsApp estimates & status tracking',
                'Indian GST tax invoices (CGST/SGST/IGST)',
                'Encrypted hardware passcode vault (AES-256)',
                'Thermal 80mm intake receipt slip printing',
                '5 concurrent staff workstation seats',
                'Daily automated cloud data backup',
                'Direct phone & WhatsApp technical support',
              ].map((feat, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px' }}>
                  <CheckCircle size={16} color="#10a37f" style={{ flexShrink: 0 }} />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <Link
                to="/signup"
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '14px',
                  backgroundColor: '#10a37f',
                  color: '#ffffff',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '15px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                Start 14-Day Free Trial <ArrowRight size={16} />
              </Link>
              <Link
                to="/checkout/annual"
                style={{
                  padding: '14px 24px',
                  backgroundColor: isLight ? '#f3f4f6' : '#1f1f1f',
                  color: textMain,
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  border: `1px solid ${borderCol}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <QrCode size={16} /> View GPay Payment Details
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Process Explanation */}
      <section style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px 80px' }}>
        <div style={{ padding: '32px', borderRadius: '16px', backgroundColor: isLight ? '#f9fafb' : '#141414', border: `1px solid ${borderCol}` }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px' }}>How Annual GPay Activation Works</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', fontSize: '13px', color: textMuted }}>
            <div>
              <div style={{ fontWeight: 700, color: textMain, marginBottom: '4px' }}>1. Start 14-Day Free Trial</div>
              Register your shop in 30 seconds. Test all features on your bench with zero payment.
            </div>
            <div>
              <div style={{ fontWeight: 700, color: textMain, marginBottom: '4px' }}>2. Scan Official GPay QR</div>
              Pay ₹{platformSettings.annualPriceInr.toLocaleString('en-IN')} using Google Pay, PhonePe, or UPI to {platformSettings.upiId}.
            </div>
            <div>
              <div style={{ fontWeight: 700, color: textMain, marginBottom: '4px' }}>3. Verified & Activated</div>
              Submit your 12-digit UTR ID. The platform owner manually verifies your payment and activates your 365-day licence.
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px 80px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 800, textAlign: 'center', marginBottom: '32px' }}>
          Frequently Asked Questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: cardBg,
                border: `1px solid ${borderCol}`,
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: textMain }}>
                {faq.q}
              </div>
              <div style={{ fontSize: '13.5px', color: textMuted, lineHeight: 1.6 }}>
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
