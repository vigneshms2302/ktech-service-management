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
export const HomePage: React.FC = () => {
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

  return (
    <div className="w-full bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] font-sans transition-colors duration-200">
      {/* ── 1. Hero Section (ChatGPT Blank Canvas Style) ─────────────── */}
      <section className="pt-20 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center relative">
        {/* Floating Sparkle Icon Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#e5e5e5] dark:border-[#2f2f2f] bg-black/[0.02] dark:bg-white/[0.04] text-xs font-medium text-[#676767] dark:text-[#b4b4b4] mb-8 animate-fade-in shadow-none">
          <Sparkles size={14} className="text-[#0d0d0d] dark:text-white" />
          <span>K-Connect Cloud SaaS v2.0 • Electronics Repair OS</span>
        </div>

        {/* Hero Title: Plain Large Typography */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-[#0d0d0d] dark:text-[#ececec] max-w-4xl mx-auto leading-[1.12] mb-6">
          The Operating System for Modern Computer & Mobile Repair Laboratories
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-[#676767] dark:text-[#b4b4b4] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Streamline customer admissions, 13-stage chip-level diagnostics, scrap salvage inventory, GST billing, and WhatsApp updates in one blank-canvas cloud workspace.
        </p>

        {/* Action Buttons: Solid Black / Ghost */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap mb-10">
          <Link
            to="/signup"
            className="px-6 py-3.5 rounded-xl text-sm md:text-base font-medium bg-[#0d0d0d] text-white hover:bg-[#262626] dark:bg-[#ececec] dark:text-[#0d0d0d] dark:hover:bg-white transition-colors inline-flex items-center gap-2 shadow-none no-underline"
          >
            Start 14-Day Free Trial <ArrowRight size={16} />
          </Link>
          <Link
            to="/demo"
            className="px-6 py-3.5 rounded-xl text-sm md:text-base font-medium bg-transparent text-[#0d0d0d] dark:text-[#ececec] border border-[#e5e5e5] dark:border-[#2f2f2f] hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-colors inline-flex items-center gap-2 no-underline"
          >
            Explore Interactive Tour
          </Link>
        </div>

        {/* Reassurance Checklist */}
        <div className="flex items-center justify-center gap-6 flex-wrap text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4]">
          <div className="flex items-center gap-1.5">
            <CheckCircle size={15} className="text-[#0d0d0d] dark:text-[#ececec]" /> 14-Day Free Trial Included
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle size={15} className="text-[#0d0d0d] dark:text-[#ececec]" /> No Credit Card Required
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle size={15} className="text-[#0d0d0d] dark:text-[#ececec]" /> Setup in Under 60 Seconds
          </div>
        </div>

        {/* App Workspace Preview Card */}
        <div className="mt-14 rounded-2xl border border-[#e5e5e5] dark:border-[#2f2f2f] bg-white dark:bg-[#1a1a1a] shadow-none overflow-hidden p-4 text-left transition-colors">
          {/* Mock Browser Header */}
          <div className="flex items-center gap-2 pb-3.5 border-b border-[#e5e5e5] dark:border-[#2f2f2f] mb-4">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 max-w-sm mx-auto bg-gray-100 dark:bg-[#262626] py-1 px-3 rounded-md text-[11px] text-[#676767] dark:text-[#b4b4b4] text-center font-mono">
              https://app.kconnect.cloud/app/dashboard
            </div>
          </div>

          {/* Interactive Metric Preview Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f]">
              <div className="text-[11px] text-[#676767] dark:text-[#b4b4b4] font-medium uppercase tracking-wider">Active Pipeline</div>
              <div className="text-xl font-semibold mt-1 text-[#0d0d0d] dark:text-[#ececec]">18 Repairs</div>
              <div className="text-xs text-[#10a37f] mt-0.5">6 Ready for Delivery</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f]">
              <div className="text-[11px] text-[#676767] dark:text-[#b4b4b4] font-medium uppercase tracking-wider">Month Revenue</div>
              <div className="text-xl font-semibold mt-1 text-[#0d0d0d] dark:text-[#ececec]">₹1,84,500</div>
              <div className="text-xs text-[#676767] dark:text-[#b4b4b4] mt-0.5">₹28,400 Advance Held</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f]">
              <div className="text-[11px] text-[#676767] dark:text-[#b4b4b4] font-medium uppercase tracking-wider">Salvage Harvested</div>
              <div className="text-xl font-semibold mt-1 text-[#0d0d0d] dark:text-[#ececec]">42 Parts</div>
              <div className="text-xs text-[#676767] dark:text-[#b4b4b4] mt-0.5">₹34,000 Inventory Value</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f]">
              <div className="text-[11px] text-[#676767] dark:text-[#b4b4b4] font-medium uppercase tracking-wider">Passcode Vault</div>
              <div className="text-xl font-semibold mt-1 text-[#0d0d0d] dark:text-[#ececec]">AES-256</div>
              <div className="text-xs text-[#10a37f] mt-0.5">Zero-Knowledge Locked</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. The 5-Step Repair Workflow ──────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-3 text-[#0d0d0d] dark:text-[#ececec]">
            Built Specifically Around the Real Chip-Level Repair Lifecycle
          </h2>
          <p className="text-sm sm:text-base text-[#676767] dark:text-[#b4b4b4] max-w-xl mx-auto">
            Unlike generic invoicing apps, K-Connect enforces every step from customer bench admission to diagnostic root-cause and salvage recovery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflowSteps.map((ws, idx) => {
            const Icon = ws.icon;
            const isSelected = activeWorkflowStep === idx;
            return (
              <div
                key={idx}
                onClick={() => setActiveWorkflowStep(idx)}
                className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#0d0d0d] dark:border-white bg-gray-50 dark:bg-white/[0.04]'
                    : 'border-[#e5e5e5] dark:border-[#2f2f2f] bg-white dark:bg-[#212121] hover:border-gray-400 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[#0d0d0d] text-white dark:bg-white dark:text-[#0d0d0d]'
                        : 'bg-gray-100 dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec]'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-[#e5e5e5] dark:border-[#2f2f2f] text-[#676767] dark:text-[#b4b4b4] uppercase">
                    {ws.badge}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#676767] dark:text-[#b4b4b4] mb-1 tracking-wider uppercase">
                  Stage {ws.step}
                </div>
                <h3 className="text-base font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">{ws.title}</h3>
                <p className="text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] leading-relaxed">{ws.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. Six Core Subsystems Grid ────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 border-t border-b border-[#e5e5e5] dark:border-[#2f2f2f] bg-white dark:bg-[#212121]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-3 text-[#0d0d0d] dark:text-[#ececec]">
              Everything Your Repair Lab Needs in One Cloud OS
            </h2>
            <p className="text-sm sm:text-base text-[#676767] dark:text-[#b4b4b4] max-w-lg mx-auto">
              Say goodbye to fragmented paper books, scattered Excel sheets, and disconnected billing apps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec] flex items-center justify-center">
                        <Icon size={20} />
                      </div>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-[#e5e5e5] dark:border-[#2f2f2f] text-[#676767] dark:text-[#b4b4b4]">
                        {f.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-2">{f.title}</h3>
                    <p className="text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. Transparent Pricing Preview ─────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-3 text-[#0d0d0d] dark:text-[#ececec]">
          Honest, Transparent Annual Pricing
        </h2>
        <p className="text-sm sm:text-base text-[#676767] dark:text-[#b4b4b4] mb-12">
          One flat annual subscription. Start with a 14-day free trial. Pay conveniently via GPay QR code.
        </p>

        <div className="max-w-xl mx-auto p-8 rounded-2xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] text-left">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold text-[#0d0d0d] dark:text-[#ececec] uppercase tracking-wider">
              Full Professional Lab Access
            </span>
            <span className="px-2.5 py-0.5 rounded-full border border-[#e5e5e5] dark:border-[#2f2f2f] text-[11px] font-medium text-[#676767] dark:text-[#b4b4b4]">
              14-Day Free Trial
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-bold text-[#0d0d0d] dark:text-[#ececec]">₹14,999</span>
            <span className="text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4]">/ year (₹1,250/month billed annually)</span>
          </div>

          <p className="text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] leading-relaxed mb-6">
            Everything included for your entire shop team: 5 workstations, unlimited service tickets, GST billing, and WhatsApp notifications.
          </p>

          <ul className="space-y-2.5 mb-8 p-0 list-none text-xs sm:text-sm text-[#0d0d0d] dark:text-[#ececec]">
            {[
              '14-Day Free Trial with complete feature access',
              'Unlimited service tickets & diagnostic checklists',
              'Spare parts inventory & scrap salvage teardowns',
              'GST invoicing (CGST/SGST/IGST) & thermal slips',
              'Encrypted device passcode vault (AES-256)',
              '5 concurrent workstation seats for your staff',
              'GPay QR payment with manual owner verification',
            ].map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2.5">
                <CheckCircle size={15} className="text-[#0d0d0d] dark:text-white shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Link
            to="/signup"
            className="block w-full text-center py-3.5 rounded-xl font-medium text-sm bg-[#0d0d0d] text-white hover:bg-[#262626] dark:bg-[#ececec] dark:text-[#0d0d0d] dark:hover:bg-white transition-colors no-underline shadow-none"
          >
            Start Your 14-Day Free Trial Now
          </Link>
        </div>
      </section>

      {/* ── 5. Bottom Ready CTA ────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 border-t border-[#e5e5e5] dark:border-[#2f2f2f] text-center bg-white dark:bg-[#212121]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-3 text-[#0d0d0d] dark:text-[#ececec]">
            Ready to Modernize Your Repair Shop?
          </h2>
          <p className="text-sm sm:text-base text-[#676767] dark:text-[#b4b4b4] mb-8 leading-relaxed">
            Join leading computer and mobile service labs using K-Connect to eliminate repair errors, track inventory teardowns, and delight customers.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link
              to="/signup"
              className="px-6 py-3.5 rounded-xl text-sm font-medium bg-[#0d0d0d] text-white hover:bg-[#262626] dark:bg-[#ececec] dark:text-[#0d0d0d] dark:hover:bg-white transition-colors inline-flex items-center gap-2 no-underline shadow-none"
            >
              Start Free Trial (14 Days) <ArrowRight size={16} />
            </Link>
            <Link
              to="/contact"
              className="px-6 py-3.5 rounded-xl text-sm font-medium bg-transparent text-[#0d0d0d] dark:text-[#ececec] border border-[#e5e5e5] dark:border-[#2f2f2f] hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-colors inline-flex items-center gap-2 no-underline"
            >
              Talk to Sales & Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
