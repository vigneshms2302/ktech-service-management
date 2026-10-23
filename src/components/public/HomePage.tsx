import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  Wrench,
  Clock,
  Receipt,
  Package,
  MessageSquare,
  Sparkles,
  Database,
  Lock,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';

export const HomePage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  const workflowSteps = [
    {
      step: '01',
      title: 'Quick Intake & Condition Photo Capture',
      desc: 'Admit computers, laptops, and mobile devices in under 45 seconds. Tag customer details, accessories received, cosmetic flaws, and security passcodes.',
      icon: Clock,
      badge: 'Front Desk',
    },
    {
      step: '02',
      title: 'Technician Hardware Inspection & Voltage Rail Checks',
      desc: 'Technicians diagnose short circuits, power rails, water ingress, and GPU/BGA faults. Log voltage rails and faulty components with structured findings.',
      icon: Wrench,
      badge: 'Diagnostics',
    },
    {
      step: '03',
      title: 'WhatsApp Estimate & 1-Click Customer Approval',
      desc: 'Generate professional parts and labor quotations. Dispatch PDF breakdown to customer WhatsApp with approval timestamp tracking.',
      icon: MessageSquare,
      badge: 'Estimate',
    },
    {
      step: '04',
      title: 'Repair, Quality Checklist & Salvage Parts Tracking',
      desc: 'Record labor minutes, pull inventory or harvest salvage chips from scrap donors. Complete 10-point QC verification before notifying customer.',
      icon: Package,
      badge: 'Bench Lab',
    },
    {
      step: '05',
      title: 'GST Invoice, Thermal Receipt & Warranty Issuance',
      desc: 'Print thermal delivery receipts with QR code tracking, issue 90-day post-repair warranties, and collect UPI/cash payments seamlessly.',
      icon: Receipt,
      badge: 'Handover',
    },
  ];

  const features = [
    {
      icon: Wrench,
      title: '13-Stage Workflow State Machine',
      desc: 'Strict state transitions prevent skipped steps, lost devices, or premature handovers without payment or testing.',
      tag: 'Workflow Guard',
    },
    {
      icon: Package,
      title: 'Salvage Teardown & Parts Lineage',
      desc: 'Harvest working LCDs, MOSFETs, and power ICs from donated or scrap devices with tracked acquisition costs.',
      tag: 'Parts Ledger',
    },
    {
      icon: Receipt,
      title: 'Indian GST Engine & Thermal Slips',
      desc: 'Automated 18% GST splits (CGST/SGST/IGST), SAC/HSN codes, thermal 80mm intake receipts, and tax ledgers.',
      tag: 'Accounting',
    },
    {
      icon: Lock,
      title: 'Hardware Passcode Vault (AES-256)',
      desc: 'Zero-knowledge encrypted storage of customer PINs, BIOS passwords, and patterns for safe technician unlock.',
      tag: 'Security',
    },
    {
      icon: MessageSquare,
      title: 'Automated WhatsApp Communication',
      desc: 'Instant delivery of job admissions, estimate approval requests, repair ready alerts, and invoice PDFs.',
      tag: 'Customer CRM',
    },
    {
      icon: Database,
      title: 'Multi-Device Cloud Sync & Offline Safe',
      desc: 'Front desk desktop, repair bench laptops, and owner mobile browsers share the identical real-time ledger.',
      tag: 'Cloud SaaS',
    },
  ];

  const bg = isLight ? '#ffffff' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#111111';
  const borderCol = isLight ? '#e5e7eb' : '#222222';
  const textMain = isLight ? '#111827' : '#f9fafb';
  const textMuted = isLight ? '#6b7280' : '#9ca3af';

  return (
    <div style={{ backgroundColor: bg, color: textMain, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ── 1. Hero Section ────────────────────────────────────────── */}
      <section
        style={{
          padding: '80px 20px 60px',
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Release Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            backgroundColor: isLight ? '#f0fdf4' : 'rgba(16, 163, 127, 0.1)',
            border: `1px solid ${isLight ? '#bbf7d0' : 'rgba(16, 163, 127, 0.3)'}`,
            color: '#10a37f',
            fontSize: '12.5px',
            fontWeight: 600,
            marginBottom: '28px',
          }}
        >
          <Sparkles size={14} /> K-Connect Cloud SaaS v2.0 Released — Made for Repair Labs
        </div>

        {/* Hero Title */}
        <h1
          style={{
            fontSize: 'clamp(32px, 5.5vw, 64px)',
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: '-1.5px',
            marginBottom: '24px',
            maxWidth: '900px',
            margin: '0 auto 24px',
          }}
        >
          The Operating System for{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #10a37f 0%, #38bdf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Modern Computer & Mobile
          </span>{' '}
          Repair Laboratories
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            color: textMuted,
            lineHeight: 1.6,
            maxWidth: '720px',
            margin: '0 auto 36px',
          }}
        >
          Streamline customer admissions, 13-stage chip-level diagnostic pipelines, scrap salvage inventory, GST billing, and WhatsApp tracking in one unified cloud workspace.
        </p>

        {/* CTAs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            flexWrap: 'wrap',
            marginBottom: '40px',
          }}
        >
          <Link
            to="/signup"
            style={{
              padding: '14px 28px',
              backgroundColor: '#10a37f',
              color: '#ffffff',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(16, 163, 127, 0.35)',
              transition: 'transform 0.15s ease',
            }}
          >
            Start 14-Day Free Trial <ArrowRight size={17} />
          </Link>
          <Link
            to="/demo"
            style={{
              padding: '14px 24px',
              backgroundColor: isLight ? '#f3f4f6' : '#171717',
              color: textMain,
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              textDecoration: 'none',
              border: `1px solid ${borderCol}`,
            }}
          >
            Explore Interactive Tour
          </Link>
        </div>

        {/* Reassurance pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            fontSize: '13px',
            color: textMuted,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={15} color="#10a37f" /> 14-Day Free Trial Included
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={15} color="#10a37f" /> No Credit Card Required
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={15} color="#10a37f" /> Setup in Under 60 Seconds
          </div>
        </div>

        {/* App Workspace Preview Card */}
        <div
          style={{
            marginTop: '60px',
            borderRadius: '16px',
            border: `1px solid ${borderCol}`,
            backgroundColor: cardBg,
            boxShadow: isLight
              ? '0 25px 60px -15px rgba(0, 0, 0, 0.1)'
              : '0 30px 80px -20px rgba(0, 0, 0, 0.7)',
            overflow: 'hidden',
            padding: '16px',
            textAlign: 'left',
          }}
        >
          {/* Mock Browser Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '14px',
              borderBottom: `1px solid ${borderCol}`,
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            </div>
            <div
              style={{
                flex: 1,
                maxWidth: '420px',
                margin: '0 auto',
                backgroundColor: isLight ? '#f3f4f6' : '#1a1a1a',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                color: textMuted,
                textAlign: 'center',
                fontFamily: 'monospace',
              }}
            >
              https://app.kconnect.cloud/app/dashboard
            </div>
          </div>

          {/* Interactive Metric Preview Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: isLight ? '#f9fafb' : '#141414', border: `1px solid ${borderCol}` }}>
              <div style={{ fontSize: '11px', color: textMuted, fontWeight: 600 }}>Active Jobs Pipeline</div>
              <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px', color: '#10a37f' }}>18 Repairs</div>
              <div style={{ fontSize: '11px', color: '#10a37f', marginTop: '2px' }}>6 Ready for Delivery</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: isLight ? '#f9fafb' : '#141414', border: `1px solid ${borderCol}` }}>
              <div style={{ fontSize: '11px', color: textMuted, fontWeight: 600 }}>Month Collected Revenue</div>
              <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px', color: textMain }}>₹1,84,500</div>
              <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>₹28,400 Advance Held</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: isLight ? '#f9fafb' : '#141414', border: `1px solid ${borderCol}` }}>
              <div style={{ fontSize: '11px', color: textMuted, fontWeight: 600 }}>Salvage Chips Harvested</div>
              <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px', color: '#a855f7' }}>42 Parts</div>
              <div style={{ fontSize: '11px', color: textMuted, marginTop: '2px' }}>₹34,000 Inventory Value</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: isLight ? '#f9fafb' : '#141414', border: `1px solid ${borderCol}` }}>
              <div style={{ fontSize: '11px', color: textMuted, fontWeight: 600 }}>Passcode Vault Status</div>
              <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>AES-256</div>
              <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>Zero-Knowledge Locked</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. The 5-Step Repair Workflow ──────────────────────────── */}
      <section style={{ padding: '80px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '12px' }}>
            Built Specifically Around the Real Chip-Level Repair Lifecycle
          </h2>
          <p style={{ fontSize: '15px', color: textMuted, maxWidth: '640px', margin: '0 auto' }}>
            Unlike generic invoicing apps, K-Connect enforces every step from customer bench admission to diagnostic root-cause and salvage recovery.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {workflowSteps.map((ws, idx) => {
            const Icon = ws.icon;
            const isSelected = activeWorkflowStep === idx;
            return (
              <div
                key={idx}
                onClick={() => setActiveWorkflowStep(idx)}
                style={{
                  padding: '24px',
                  borderRadius: '14px',
                  backgroundColor: isSelected
                    ? isLight
                      ? '#f0fdf4'
                      : 'rgba(16, 163, 127, 0.08)'
                    : cardBg,
                  border: `1px solid ${isSelected ? '#10a37f' : borderCol}`,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease, transform 0.2s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? '#10a37f' : isLight ? '#f3f4f6' : '#1c1c1c',
                      color: isSelected ? '#ffffff' : '#10a37f',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: isLight ? '#e5e7eb' : '#222222',
                      color: textMuted,
                      textTransform: 'uppercase',
                    }}
                  >
                    {ws.badge}
                  </span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#10a37f', marginBottom: '4px', letterSpacing: '0.5px' }}>
                  STAGE {ws.step}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{ws.title}</h3>
                <p style={{ fontSize: '13px', color: textMuted, lineHeight: 1.6 }}>{ws.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. Six Core Subsystems Grid ────────────────────────────── */}
      <section style={{ padding: '80px 20px', backgroundColor: isLight ? '#f9fafb' : '#0c0c0c', borderTop: `1px solid ${borderCol}`, borderBottom: `1px solid ${borderCol}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '12px' }}>
              Everything Your Repair Lab Needs in One Cloud OS
            </h2>
            <p style={{ fontSize: '15px', color: textMuted, maxWidth: '600px', margin: '0 auto' }}>
              Say goodbye to fragmented paper books, scattered Excel sheets, and disconnected billing apps.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  style={{
                    padding: '28px',
                    borderRadius: '14px',
                    backgroundColor: cardBg,
                    border: `1px solid ${borderCol}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          backgroundColor: isLight ? '#f0fdf4' : 'rgba(16, 163, 127, 0.12)',
                          color: '#10a37f',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={22} />
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: isLight ? '#f3f4f6' : '#1f1f1f',
                          color: textMuted,
                        }}
                      >
                        {f.tag}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>{f.title}</h3>
                    <p style={{ fontSize: '13.5px', color: textMuted, lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. Transparent Pricing Preview ─────────────────────────── */}
      <section style={{ padding: '80px 20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '12px' }}>
          Honest, Transparent Annual Pricing
        </h2>
        <p style={{ fontSize: '15px', color: textMuted, marginBottom: '40px' }}>
          One flat annual subscription. Start with a 14-day free trial. Pay conveniently via GPay QR code.
        </p>

        <div
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            padding: '36px',
            borderRadius: '18px',
            backgroundColor: cardBg,
            border: '2px solid #10a37f',
            boxShadow: '0 20px 50px rgba(16, 163, 127, 0.15)',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#10a37f', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Full Professional Lab Access
            </span>
            <span style={{ padding: '3px 10px', borderRadius: '9999px', backgroundColor: 'rgba(16, 163, 127, 0.15)', color: '#10a37f', fontSize: '11.5px', fontWeight: 700 }}>
              14-Day Free Trial
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '42px', fontWeight: 900, color: textMain }}>₹14,999</span>
            <span style={{ fontSize: '14px', color: textMuted }}>/ year (₹1,250/month billed annually)</span>
          </div>

          <p style={{ fontSize: '13px', color: textMuted, lineHeight: 1.5, marginBottom: '24px' }}>
            Everything included for your entire shop team: 5 workstations, unlimited service tickets, GST billing, and WhatsApp notifications.
          </p>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
            {[
              '14-Day Free Trial with complete feature access',
              'Unlimited service tickets & diagnostic checklists',
              'Spare parts inventory & scrap salvage teardowns',
              'GST invoicing (CGST/SGST/IGST) & thermal slips',
              'Encrypted device passcode vault (AES-256)',
              '5 concurrent workstation seats for your staff',
              'GPay QR payment with manual owner verification',
            ].map((feature, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={16} color="#10a37f" style={{ flexShrink: 0 }} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Link
            to="/signup"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '14px',
              backgroundColor: '#10a37f',
              color: '#ffffff',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(16, 163, 127, 0.3)',
            }}
          >
            Start Your 14-Day Free Trial Now
          </Link>
        </div>
      </section>

      {/* ── 5. Bottom Ready CTA ────────────────────────────────────── */}
      <section
        style={{
          padding: '80px 20px',
          backgroundColor: isLight ? '#f0fdf4' : '#08140f',
          borderTop: `1px solid ${borderCol}`,
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, marginBottom: '14px' }}>
            Ready to Modernize Your Repair Shop?
          </h2>
          <p style={{ fontSize: '15px', color: textMuted, lineHeight: 1.6, marginBottom: '30px' }}>
            Join leading computer and mobile service labs using K-Connect to eliminate repair errors, track inventory teardowns, and delight customers.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              to="/signup"
              style={{
                padding: '14px 28px',
                backgroundColor: '#10a37f',
                color: '#ffffff',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Start Free Trial (14 Days) <ArrowRight size={17} />
            </Link>
            <Link
              to="/contact"
              style={{
                padding: '14px 24px',
                backgroundColor: cardBg,
                color: textMain,
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
                border: `1px solid ${borderCol}`,
              }}
            >
              Talk to Sales & Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
