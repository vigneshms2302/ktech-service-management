import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, CheckCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';

export const DemoPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'intake' | 'diagnostics' | 'billing' | 'salvage'>('intake');

  const bg = isLight ? '#ffffff' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#111111';
  const borderCol = isLight ? '#e5e7eb' : '#222222';
  const textMain = isLight ? '#111827' : '#f9fafb';
  const textMuted = isLight ? '#6b7280' : '#9ca3af';

  const demos = {
    intake: {
      title: 'Front Desk Quick Intake & Thermal Receipt',
      desc: 'Admit any customer machine in 45 seconds. Capture brand, serial number, reported fault, physical condition photos, and encrypted passcodes. Print instant thermal slips.',
      tag: 'Front Desk',
      highlights: [
        'Automatic sequence number: JOB-2026-00042',
        'Customer quick lookup by mobile number',
        'Accessories checklist (Charger, Bag, Power Cord)',
        'Thermal 80mm slip with self-service tracking QR code',
      ],
    },
    diagnostics: {
      title: 'Technician Voltage Rail & Motherboard Bench',
      desc: 'Bench technicians record exact rail measurements: +19V VIN, +3.3V ALW, +5V ALW, 1.05V PCH, and VCORE. Tag faulty MOSFETs, shorted capacitors, or BGA reflow.',
      tag: 'Bench Workstation',
      highlights: [
        'Structured voltage rail check table',
        'Before/after repair microscope photos',
        'Technician commission & labor minutes counter',
        '10-point pre-delivery QC checklist',
      ],
    },
    billing: {
      title: 'GST Tax Invoicing & Advance Adjustment',
      desc: 'Auto-calculate CGST (9%) + SGST (9%) on labor and parts. Adjust advance deposits against the final invoice. Accept UPI payments directly to your shop QR.',
      tag: 'Billing & Accounting',
      highlights: [
        'Indian GST compliant A4 and 80mm thermal formats',
        'HSN codes for parts and SAC 9987 for repair services',
        'Direct UPI QR generation on customer bills',
        '90-day digital warranty certificate generation',
      ],
    },
    salvage: {
      title: 'Scrap Machine Dismantling & Parts Lineage',
      desc: 'When a customer machine is unrepairable or donated as scrap, dismantle working LCDs, RAM sticks, fans, and hinges. Track their origin serial numbers.',
      tag: 'Inventory & Salvage',
      highlights: [
        'Record acquisition cost (e.g. ₹1,200 scrap buyback)',
        'Harvest Grade-A tested chips into live inventory',
        'FIFO inventory valuation & reorder thresholds',
        'Full traceability from donor machine to repaired job',
      ],
    },
  };

  const current = demos[activeTab];

  return (
    <div style={{ backgroundColor: bg, color: textMain, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <section style={{ padding: '70px 20px 40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#10a37f', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
          Interactive Guided Tour
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 50px)', fontWeight: 900, letterSpacing: '-1.2px', marginBottom: '20px' }}>
          See How K-Connect Powers Everyday Lab Operations
        </h1>
        <p style={{ fontSize: '16px', color: textMuted, lineHeight: 1.6 }}>
          Switch between the four major workstation views below to understand how front desk, diagnostic technicians, and accountants collaborate in real-time.
        </p>
      </section>

      {/* Interactive Tabs */}
      <section style={{ maxWidth: '960px', margin: '0 auto', padding: '0 20px 80px' }}>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            backgroundColor: isLight ? '#f3f4f6' : '#141414',
            padding: '6px',
            borderRadius: '12px',
            marginBottom: '30px',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'intake', label: '1. Front Desk Intake' },
            { id: 'diagnostics', label: '2. Chip-Level Bench' },
            { id: 'billing', label: '3. GST Invoicing' },
            { id: 'salvage', label: '4. Salvage Teardown' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? (isLight ? '#ffffff' : '#222222') : 'transparent',
                color: activeTab === tab.id ? '#10a37f' : textMuted,
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Demo Content Box */}
        <div
          style={{
            padding: '36px',
            borderRadius: '16px',
            backgroundColor: cardBg,
            border: `1px solid ${borderCol}`,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px',
            alignItems: 'center',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 163, 127, 0.15)',
                color: '#10a37f',
                textTransform: 'uppercase',
              }}
            >
              {current.tag}
            </span>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginTop: '10px', marginBottom: '12px' }}>
              {current.title}
            </h2>
            <p style={{ fontSize: '14px', color: textMuted, lineHeight: 1.6, marginBottom: '24px' }}>
              {current.desc}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
              {current.highlights.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle size={16} color="#10a37f" style={{ flexShrink: 0 }} />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Action Card */}
          <div
            style={{
              padding: '24px',
              borderRadius: '12px',
              backgroundColor: isLight ? '#f9fafb' : '#161616',
              border: `1px solid ${borderCol}`,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 163, 127, 0.15)',
                color: '#10a37f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Play size={24} style={{ marginLeft: '4px' }} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Test Live in Your Browser</h3>
            <p style={{ fontSize: '13px', color: textMuted, lineHeight: 1.5, marginBottom: '20px' }}>
              Experience the actual application with demo shop data, or create your own shop account with 14 days free trial.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link
                to="/signup"
                style={{
                  padding: '12px',
                  backgroundColor: '#10a37f',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  textDecoration: 'none',
                }}
              >
                Start 14-Day Free Trial
              </Link>
              <Link
                to="/login"
                style={{
                  padding: '10px',
                  backgroundColor: 'transparent',
                  color: textMain,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  textDecoration: 'none',
                  border: `1px solid ${borderCol}`,
                }}
              >
                Sign In to Demo Lab (ktech)
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
