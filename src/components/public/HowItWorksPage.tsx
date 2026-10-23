import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';

export const HowItWorksPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const bg = isLight ? '#ffffff' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#111111';
  const borderCol = isLight ? '#e5e7eb' : '#222222';
  const textMain = isLight ? '#111827' : '#f9fafb';
  const textMuted = isLight ? '#6b7280' : '#9ca3af';

  const steps = [
    {
      num: '01',
      title: 'Register Your Shop in 30 Seconds',
      desc: 'Enter your shop name, city, and mobile number. Choose your custom shop handle (e.g. kconnect.cloud/ktech). Your 14-day free trial activates instantly with no credit card required.',
    },
    {
      num: '02',
      title: 'Run Quick Onboarding',
      desc: 'Set up your shop header, print address, tax GSTIN, and create PIN credentials for your front desk receptionist and bench technicians.',
    },
    {
      num: '03',
      title: 'Admit Your First Repair Job',
      desc: 'Type customer details, select device model (Laptop, Desktop, Motherboard, Console, Mobile), note reported symptoms, and print an 80mm thermal intake receipt with QR tracking.',
    },
    {
      num: '04',
      title: 'Diagnose & Dispatch WhatsApp Estimates',
      desc: 'Bench technicians check voltage rails and log faulty chips. Send a professional WhatsApp PDF quotation. Customer approves with 1 click.',
    },
    {
      num: '05',
      title: 'Deliver, Issue Warranty & Collect Payment',
      desc: 'Complete the 10-point QC test. Print thermal delivery slip, issue a digital warranty card, and record the payment via cash or your shop UPI QR.',
    },
  ];

  return (
    <div style={{ backgroundColor: bg, color: textMain, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <section style={{ padding: '70px 20px 40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#10a37f', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
          Simplicity at Scale
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 50px)', fontWeight: 900, letterSpacing: '-1.2px', marginBottom: '20px' }}>
          How K-Connect Transforms Your Daily Repair Operations
        </h1>
        <p style={{ fontSize: '16px', color: textMuted, lineHeight: 1.6 }}>
          Designed from the ground up to replace handwritten ticket books, WhatsApp confusion, and untracked scrap parts with a smooth 5-step flow.
        </p>
      </section>

      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '20px 20px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {steps.map((st, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '24px',
                padding: '30px',
                borderRadius: '16px',
                backgroundColor: cardBg,
                border: `1px solid ${borderCol}`,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#10a37f',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {st.num}
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{st.title}</h3>
                <p style={{ fontSize: '14px', color: textMuted, lineHeight: 1.6 }}>{st.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <Link
            to="/signup"
            style={{
              padding: '14px 28px',
              backgroundColor: '#10a37f',
              color: '#ffffff',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '15px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Start Your Free 14-Day Trial <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};
