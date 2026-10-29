import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';

export const PublicFooter: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const footerBg = isLight ? '#f9f9f9' : '#171717';
  const borderCol = isLight ? '#e5e5e5' : '#2f2f2f';
  const textMuted = isLight ? '#676767' : '#b4b4b4';
  const textMain = isLight ? '#0d0d0d' : '#ececec';

  return (
    <footer
      style={{
        backgroundColor: footerBg,
        borderTop: `1px solid ${borderCol}`,
        padding: '60px 20px 30px',
        color: textMain,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '40px',
          marginBottom: '50px',
        }}
      >
        {/* Col 1: Brand & Bio */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10a37f, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Wrench size={16} />
            </div>
            <span style={{ fontSize: '17px', fontWeight: 800 }}>K-Connect SaaS</span>
          </div>
          <p style={{ fontSize: '13px', color: textMuted, lineHeight: 1.6, marginBottom: '16px' }}>
            The premier multi-tenant service operating system engineered specifically for computer, laptop, mobile, and electronics repair laboratories.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10a37f', fontWeight: 600 }}>
            <Shield size={14} /> 100% Tenant Isolation & Encrypted Passcodes
          </div>
        </div>

        {/* Col 2: Product Subsystems */}
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px', color: textMain }}>
            Product Modules
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
            <li>
              <Link to="/features" style={{ color: textMuted, textDecoration: 'none' }}>
                13-Stage Job Card Workflow
              </Link>
            </li>
            <li>
              <Link to="/features" style={{ color: textMuted, textDecoration: 'none' }}>
                Inventory & Salvage Teardown
              </Link>
            </li>
            <li>
              <Link to="/features" style={{ color: textMuted, textDecoration: 'none' }}>
                GST Invoices & Estimates
              </Link>
            </li>
            <li>
              <Link to="/features" style={{ color: textMuted, textDecoration: 'none' }}>
                WhatsApp Customer Center
              </Link>
            </li>
            <li>
              <Link to="/demo" style={{ color: textMuted, textDecoration: 'none' }}>
                Interactive Product Tour
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Company & Resources */}
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px', color: textMain }}>
            Resources & Legal
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
            <li>
              <Link to="/pricing" style={{ color: textMuted, textDecoration: 'none' }}>
                Transparent Pricing
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" style={{ color: textMuted, textDecoration: 'none' }}>
                How It Works
              </Link>
            </li>
            <li>
              <Link to="/track" style={{ color: textMuted, textDecoration: 'none' }}>
                Track Repair Ticket
              </Link>
            </li>
            <li>
              <Link to="/privacy" style={{ color: textMuted, textDecoration: 'none' }}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" style={{ color: textMuted, textDecoration: 'none' }}>
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/refund-policy" style={{ color: textMuted, textDecoration: 'none' }}>
                Refund Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: Contact & Hours */}
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px', color: textMain }}>
            Contact & Support
          </h4>
          <p style={{ fontSize: '13px', color: textMuted, lineHeight: 1.6, marginBottom: '12px' }}>
            Email: support@ktechcomputers.com<br />
            Emergency Hotline: +91 94430 00000<br />
            Lab Hours: Mon – Sat, 9:30 AM – 8:30 PM IST
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Link
              to="/signup"
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#10a37f',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Start Free Trial
            </Link>
            <Link
              to="/login"
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: `1px solid ${borderCol}`,
                color: textMain,
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          paddingTop: '20px',
          borderTop: `1px solid ${borderCol}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12px',
          color: textMuted,
        }}
      >
        <div>
          © {new Date().getFullYear()} K-Connect Cloud SaaS Platform. Engineered by KTech Computers. All Rights Reserved.
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link to="/privacy" style={{ color: textMuted, textDecoration: 'none' }}>Privacy</Link>
          <Link to="/terms" style={{ color: textMuted, textDecoration: 'none' }}>Terms</Link>
          <Link to="/refund-policy" style={{ color: textMuted, textDecoration: 'none' }}>Refunds</Link>
          <Link to="/contact" style={{ color: textMuted, textDecoration: 'none' }}>Contact</Link>
        </div>
      </div>
    </footer>
  );
};
