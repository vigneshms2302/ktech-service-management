import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Wrench, Heart, ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';

export const AboutPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const bg = isLight ? '#ffffff' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#111111';
  const borderCol = isLight ? '#e5e7eb' : '#222222';
  const textMain = isLight ? '#111827' : '#f9fafb';
  const textMuted = isLight ? '#6b7280' : '#9ca3af';

  return (
    <div style={{ backgroundColor: bg, color: textMain, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <section style={{ padding: '70px 20px 40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#10a37f', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
          Our Mission
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 50px)', fontWeight: 900, letterSpacing: '-1.2px', marginBottom: '20px' }}>
          Empowering India’s Independent Electronics & Computer Repair Labs
        </h1>
        <p style={{ fontSize: '16px', color: textMuted, lineHeight: 1.6 }}>
          K-Connect was born directly on the repair bench to solve the real daily chaos faced by computer technicians, front desk receptionists, and shop owners.
        </p>
      </section>

      <section style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px 80px' }}>
        <div style={{ padding: '36px', borderRadius: '16px', backgroundColor: cardBg, border: `1px solid ${borderCol}`, marginBottom: '30px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '14px' }}>The Problem We Solve</h2>
          <p style={{ fontSize: '14.5px', color: textMuted, lineHeight: 1.7, marginBottom: '16px' }}>
            Across India, thousands of talented chip-level repair shops fix complex laptop motherboards, gaming rigs, and mobile phones every day. Yet most manage their business on handwritten paper slips, messy WhatsApp threads, and untracked scrap motherboards.
          </p>
          <p style={{ fontSize: '14.5px', color: textMuted, lineHeight: 1.7 }}>
            Generic billing software doesn’t understand voltage rails, water damage checklists, salvage parts lineage, or device unlock PINs. K-Connect was engineered specifically for the hardware repair lab: uniting intake, technician benches, spare parts, GST billing, and customer communication in one secure cloud workspace.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '50px' }}>
          <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: cardBg, border: `1px solid ${borderCol}` }}>
            <div style={{ color: '#10a37f', marginBottom: '10px' }}><Wrench size={24} /></div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Bench-First Design</h3>
            <p style={{ fontSize: '13px', color: textMuted, lineHeight: 1.6 }}>
              Every screen, shortcut (Ctrl+K, F1-F4), and checklist is optimized for fast bench technicians wearing ESD straps.
            </p>
          </div>
          <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: cardBg, border: `1px solid ${borderCol}` }}>
            <div style={{ color: '#10a37f', marginBottom: '10px' }}><Shield size={24} /></div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Security & Privacy</h3>
            <p style={{ fontSize: '13px', color: textMuted, lineHeight: 1.6 }}>
              Strict shop-level tenant isolation, AES-256 encrypted device passcodes, and audited access logs.
            </p>
          </div>
          <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: cardBg, border: `1px solid ${borderCol}` }}>
            <div style={{ color: '#10a37f', marginBottom: '10px' }}><Heart size={24} /></div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Zero Hidden Costs</h3>
            <p style={{ fontSize: '13px', color: textMuted, lineHeight: 1.6 }}>
              Transparent annual pricing, zero transaction cut on your customer payments, and honest software updates.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
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
            Start Your 14-Day Free Trial <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};
