import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Phone, Mail, MapPin, Shield } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';

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
            The premier multi-tenant service operating system engineered specifically for computer, laptop, mobile, and electronics repair laboratories across India.
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
                Annual Pricing & 14-Day Trial
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" style={{ color: textMuted, textDecoration: 'none' }}>
                How K-Connect Works
              </Link>
            </li>
            <li>
              <Link to="/faq" style={{ color: textMuted, textDecoration: 'none' }}>
                Frequently Asked Questions
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
                Refund & Cancellation Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: Contact & Operations */}
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px', color: textMain }}>
            Direct Contact
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: textMuted }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={14} color="#10a37f" />
              <span>+91 98422 00000</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={14} color="#10a37f" />
              <span>billing@kconnect.cloud</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <MapPin size={15} color="#10a37f" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Gandhipuram Market, Coimbatore, Tamil Nadu 641012, India</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          paddingTop: '24px',
          borderTop: `1px solid ${borderCol}`,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: textMuted,
          gap: '12px',
        }}
      >
        <div>
          © {new Date().getFullYear()} K-Connect Cloud SaaS Technologies. All rights reserved.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>Free 14-Day Trial</span>
          <span>•</span>
          <span>Annual Subscription</span>
          <span>•</span>
          <span>Made for Repair Labs</span>
        </div>
      </div>
    </footer>
  );
};
