import React from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench,
  Receipt,
  Package,
  MessageSquare,
  Lock,
  ArrowRight,
  CheckCircle,
  Cpu,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';

export const FeaturesPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const bg = isLight ? '#ffffff' : '#0a0a0a';
  const cardBg = isLight ? '#ffffff' : '#111111';
  const borderCol = isLight ? '#e5e7eb' : '#222222';
  const textMain = isLight ? '#111827' : '#f9fafb';
  const textMuted = isLight ? '#6b7280' : '#9ca3af';

  const detailedModules = [
    {
      id: 'jobs',
      icon: Wrench,
      title: '13-Stage Workflow State Machine',
      subtitle: 'Never lose a laptop, skip a diagnostic check, or deliver without payment.',
      description:
        'K-Connect implements a finite-state machine covering RECEIVED, WAITING_FOR_INSPECTION, UNDER_INSPECTION, DIAGNOSIS_COMPLETED, ESTIMATE_PREPARED, WAITING_FOR_CUSTOMER_APPROVAL, APPROVED, UNDER_REPAIR, WAITING_FOR_PARTS, READY_FOR_DELIVERY, DELIVERED, UNREPAIRABLE, and CANCELLED.',
      bullets: [
        'Automatic sequential Job Card ID generation (JOB-YYYY-XXXXX)',
        'Technician assignment with time-tracking and repair logs',
        'Checklist verification before marking ready for delivery',
        'Customer repair history and device recurring visit warnings',
      ],
    },
    {
      id: 'diagnostics',
      icon: Cpu,
      title: 'Chip-Level Diagnostic Matrix & Rail Logs',
      subtitle: 'Structured root-cause analysis for motherboard technicians.',
      description:
        'Technicians record voltage rails checked (VIN, 3.3V, 5V, VCORE, 1.05V PCH, RAM VDD), shorted MOSFETs, swollen caps, or BGA reflow requirements directly on the digital job card.',
      bullets: [
        'Pre-intake condition photos (cracked hinges, missing screws, liquid marks)',
        'Power status categorization (Dead, No Display, Auto-Restart, Blue Screen)',
        'Thermal paste, pad replacement, and ultrasonic wash checklists',
        'Technician commission calculation per successful repair',
      ],
    },
    {
      id: 'inventory',
      icon: Package,
      title: 'Spare Parts Inventory & Scrap Salvage Lineage',
      subtitle: 'Turn donated donor boards and customer scrap into high-margin parts.',
      description:
        'Track brand new supplier inventory alongside scrap teardowns. When an unrepairable laptop is donated, dismantle and catalog its Grade-A LCD, RAM, cooling fan, and hinges back into your stock.',
      bullets: [
        'Multi-location stock bins (Bench Shelf, Main Rack, Salvage Drawer)',
        'Low stock alerts with configurable minimum reorder levels',
        'FIFO stock valuation & supplier procurement purchase orders',
        'Salvage parts trace back to original donor machine serial numbers',
      ],
    },
    {
      id: 'billing',
      icon: Receipt,
      title: 'Indian GST Engine & Thermal Invoicing',
      subtitle: 'Generate compliant B2B tax invoices and customer POS receipts in seconds.',
      description:
        'Automatic calculation of CGST (9%) + SGST (9%) for intra-state or IGST (18%) for inter-state service billing. Generates both 80mm thermal intake tokens and A4 GST tax invoices.',
      bullets: [
        'HSN codes for spare parts and SAC codes (9987) for repair services',
        'Advance deposit adjustment against final billing balance',
        'Customer GSTIN validation and B2B corporate billing profiles',
        'Automated payment receipts with dynamic shop UPI QR codes',
      ],
    },
    {
      id: 'security',
      icon: Lock,
      title: 'Encrypted Passcode Vault (AES-256)',
      subtitle: 'Safe, auditable storage of customer device credentials.',
      description:
        'Customer PINs, pattern locks, Windows passwords, and BIOS supervisor keys are encrypted using AES-256-GCM. Passcodes are unlocked only by authorized technicians and masked upon logout.',
      bullets: [
        'Audit log records which technician revealed a device passcode',
        'Eliminates dangerous sticky notes on customer laptop lids',
        'Pattern grid recorder for Android and tablet repairs',
        'Automatic wipe upon customer delivery handover',
      ],
    },
    {
      id: 'crm',
      icon: MessageSquare,
      title: 'WhatsApp Automation & QR Self-Tracking',
      subtitle: 'Keep customers informed without answering dozens of status phone calls.',
      description:
        'Customers can scan the unique QR code on their intake token to view real-time diagnosis photos, estimate approval buttons, and ready-for-pickup notifications without staff intervention.',
      bullets: [
        'Pre-formatted WhatsApp message templates for admissions and quotes',
        'Self-service public tracker (?track=JOB-YYYY-XXXXX)',
        '90-day post-repair digital warranty cards and claim verification',
        'Customer service history viewable across all family devices',
      ],
    },
  ];

  return (
    <div style={{ backgroundColor: bg, color: textMain, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <section style={{ padding: '70px 20px 40px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#10a37f', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
          Deep Product Capabilities
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 900, letterSpacing: '-1.2px', marginBottom: '20px' }}>
          Engineered for Hardware Realities, Not Generic Invoicing
        </h1>
        <p style={{ fontSize: '16px', color: textMuted, lineHeight: 1.6, maxWidth: '700px', margin: '0 auto' }}>
          Explore the exact features built into K-Connect to run front desk intake, chip-level diagnosis benches, salvage inventory, and GST accounts with zero friction.
        </p>
      </section>

      {/* Modules List */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 20px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {detailedModules.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        backgroundColor: isLight ? '#f0fdf4' : 'rgba(16, 163, 127, 0.12)',
                        color: '#10a37f',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#10a37f', fontWeight: 800, textTransform: 'uppercase' }}>
                        MODULE 0{idx + 1}
                      </div>
                      <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{m.title}</h2>
                    </div>
                  </div>

                  <p style={{ fontSize: '14.5px', fontWeight: 600, color: textMain, marginBottom: '10px' }}>{m.subtitle}</p>
                  <p style={{ fontSize: '13.5px', color: textMuted, lineHeight: 1.6, marginBottom: '20px' }}>{m.description}</p>
                </div>

                <div
                  style={{
                    backgroundColor: isLight ? '#f9fafb' : '#141414',
                    border: `1px solid ${borderCol}`,
                    borderRadius: '12px',
                    padding: '24px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: textMain, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
                    Key Operational Capabilities
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                    {m.bullets.map((b, bIdx) => (
                      <li key={bIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <CheckCircle size={16} color="#10a37f" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ color: textMain }}>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Banner */}
        <div
          style={{
            marginTop: '60px',
            padding: '40px',
            borderRadius: '16px',
            backgroundColor: isLight ? '#f0fdf4' : '#08140f',
            border: '1px solid #10a37f',
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>
            Ready to experience these features in your own repair shop?
          </h3>
          <p style={{ fontSize: '14px', color: textMuted, marginBottom: '24px' }}>
            Get complete unrestricted access to all 6 modules for 14 days without paying a single rupee.
          </p>
          <Link
            to="/signup"
            style={{
              padding: '12px 24px',
              backgroundColor: '#10a37f',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14.5px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Start 14-Day Free Trial <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};
