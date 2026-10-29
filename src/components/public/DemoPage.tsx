import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, CheckCircle, MonitorPlay } from 'lucide-react';

export const DemoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'intake' | 'diagnostics' | 'billing' | 'salvage'>('intake');

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
    <div className="w-full bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] transition-colors duration-200">
      <section className="pt-16 pb-12 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20 uppercase tracking-wider mb-4">
          <MonitorPlay size={13} />
          Interactive Guided Tour
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0d0d0d] dark:text-[#ececec] mb-4">
          See How K-Connect Powers Everyday Lab Operations
        </h1>
        <p className="text-base sm:text-lg text-[#676767] dark:text-[#b4b4b4] max-w-2xl mx-auto leading-relaxed">
          Switch between the four major workstation views below to understand how front desk, diagnostic technicians, and accountants collaborate in real-time.
        </p>
      </section>

      {/* Interactive Tabs */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex gap-1.5 p-1.5 rounded-2xl bg-[#f4f4f4] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2f2f2f] mb-8 overflow-x-auto">
          {[
            { id: 'intake', label: '1. Front Desk Intake' },
            { id: 'diagnostics', label: '2. Chip-Level Bench' },
            { id: 'billing', label: '3. GST Invoicing' },
            { id: 'salvage', label: '4. Salvage Teardown' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap border-none ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec] shadow-sm font-semibold'
                  : 'bg-transparent text-[#676767] dark:text-[#b4b4b4] hover:text-[#0d0d0d] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Demo Content Box */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] grid grid-cols-1 md:grid-cols-2 gap-8 items-center shadow-sm">
          <div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#10a37f]/10 text-[#10a37f] uppercase tracking-wider">
              {current.tag}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0d0d0d] dark:text-[#ececec] mt-3 mb-2.5">
              {current.title}
            </h2>
            <p className="text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] leading-relaxed mb-6">
              {current.desc}
            </p>
            <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
              {current.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2.5 text-[#0d0d0d] dark:text-[#ececec]">
                  <CheckCircle size={15} className="text-[#10a37f] shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Card */}
          <div className="p-6 rounded-xl bg-[#f9f9f9] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2f2f2f] text-center">
            <div className="w-12 h-12 rounded-full bg-[#f4f4f4] dark:bg-[#2a2a2a] text-[#0d0d0d] dark:text-[#ececec] flex items-center justify-center mx-auto mb-4">
              <Play size={20} className="ml-0.5" />
            </div>
            <h3 className="text-base font-bold text-[#0d0d0d] dark:text-[#ececec] mb-1.5">
              Test Live in Your Browser
            </h3>
            <p className="text-xs text-[#676767] dark:text-[#b4b4b4] leading-relaxed mb-5">
              Experience the actual application with demo shop data, or create your own shop account with 14 days free trial.
            </p>
            <div className="flex flex-col gap-2.5">
              <Link
                to="/signup"
                className="py-2.5 px-4 bg-[#0d0d0d] text-white hover:bg-[#262626] dark:bg-[#ececec] dark:text-[#0d0d0d] dark:hover:bg-white rounded-xl font-medium text-xs sm:text-sm text-center no-underline transition-colors shadow-none"
              >
                Start 14-Day Free Trial
              </Link>
              <Link
                to="/login"
                className="py-2 px-4 bg-transparent text-[#0d0d0d] dark:text-[#ececec] border border-[#e5e5e5] dark:border-[#2f2f2f] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl font-medium text-xs sm:text-sm text-center no-underline transition-colors"
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
