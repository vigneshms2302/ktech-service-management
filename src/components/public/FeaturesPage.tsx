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
  Layers,
} from 'lucide-react';

export const FeaturesPage: React.FC = () => {
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
    <div className="w-full bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] transition-colors duration-200">
      {/* Header */}
      <section className="pt-16 pb-12 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20 uppercase tracking-wider mb-4">
          <Layers size={13} />
          Deep Product Capabilities
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0d0d0d] dark:text-[#ececec] mb-4">
          Engineered for Hardware Realities
        </h1>
        <p className="text-base sm:text-lg text-[#676767] dark:text-[#b4b4b4] max-w-2xl mx-auto leading-relaxed">
          Explore the exact features built into K-Connect to run front desk intake, chip-level diagnosis benches, salvage inventory, and GST accounts with zero friction.
        </p>
      </section>

      {/* Modules List */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex flex-col gap-8">
          {detailedModules.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] grid grid-cols-1 md:grid-cols-2 gap-8 items-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#f4f4f4] dark:bg-[#2a2a2a] text-[#0d0d0d] dark:text-[#ececec] flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-[#10a37f] uppercase tracking-wider">
                        Module 0{idx + 1}
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-[#0d0d0d] dark:text-[#ececec]">
                        {m.title}
                      </h2>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2 leading-snug">
                    {m.subtitle}
                  </p>
                  <p className="text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] leading-relaxed mb-4">
                    {m.description}
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#f9f9f9] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2f2f2f]">
                  <div className="text-xs font-semibold text-[#0d0d0d] dark:text-[#ececec] uppercase tracking-wider mb-4">
                    Key Operational Capabilities
                  </div>
                  <ul className="list-none p-0 m-0 flex flex-col gap-2.5 text-xs sm:text-sm">
                    {m.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2.5">
                        <CheckCircle size={15} className="text-[#10a37f] shrink-0 mt-0.5" />
                        <span className="text-[#0d0d0d] dark:text-[#ececec]">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Banner */}
        <div className="mt-16 p-8 sm:p-12 rounded-2xl bg-[#f9f9f9] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2f2f2f] text-center">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0d0d0d] dark:text-[#ececec] mb-3">
            Ready to experience these features in your own repair shop?
          </h3>
          <p className="text-sm sm:text-base text-[#676767] dark:text-[#b4b4b4] max-w-xl mx-auto mb-6">
            Get complete unrestricted access to all 6 modules for 14 days without paying a single rupee.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0d0d0d] text-white hover:bg-[#262626] dark:bg-[#ececec] dark:text-[#0d0d0d] dark:hover:bg-white rounded-xl font-medium text-sm transition-colors no-underline shadow-none"
          >
            Start 14-Day Free Trial <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
};
