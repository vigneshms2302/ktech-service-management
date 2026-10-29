import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Wrench, Heart, ArrowRight, Info } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="w-full bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] transition-colors duration-200">
      <section className="pt-16 pb-12 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20 uppercase tracking-wider mb-4">
          <Info size={13} />
          Our Mission
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0d0d0d] dark:text-[#ececec] mb-4">
          Empowering India’s Independent Electronics & Computer Repair Labs
        </h1>
        <p className="text-base sm:text-lg text-[#676767] dark:text-[#b4b4b4] max-w-2xl mx-auto leading-relaxed">
          K-Connect was born directly on the repair bench to solve the real daily chaos faced by computer technicians, front desk receptionists, and shop owners.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <div className="p-6 sm:p-8 rounded-2xl bg-[#f9f9f9] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2f2f2f] mb-8">
          <h2 className="text-xl font-bold text-[#0d0d0d] dark:text-[#ececec] mb-3">
            The Problem We Solve
          </h2>
          <p className="text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] leading-relaxed mb-4">
            Across India, thousands of talented chip-level repair shops fix complex laptop motherboards, gaming rigs, and mobile phones every day. Yet most manage their business on handwritten paper slips, messy WhatsApp threads, and untracked scrap motherboards.
          </p>
          <p className="text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] leading-relaxed">
            Generic billing software doesn’t understand voltage rails, water damage checklists, salvage parts lineage, or device unlock PINs. K-Connect was engineered specifically for the hardware repair lab: uniting intake, technician benches, spare parts, GST billing, and customer communication in one secure cloud workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[#f4f4f4] dark:bg-[#2a2a2a] text-[#0d0d0d] dark:text-[#ececec] flex items-center justify-center mb-3">
              <Wrench size={18} />
            </div>
            <h3 className="text-sm font-bold text-[#0d0d0d] dark:text-[#ececec] mb-1.5">
              Bench-First Design
            </h3>
            <p className="text-xs text-[#676767] dark:text-[#b4b4b4] leading-relaxed">
              Every screen, shortcut (Ctrl+K, F1-F4), and checklist is optimized for fast bench technicians wearing ESD straps.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[#f4f4f4] dark:bg-[#2a2a2a] text-[#0d0d0d] dark:text-[#ececec] flex items-center justify-center mb-3">
              <Shield size={18} />
            </div>
            <h3 className="text-sm font-bold text-[#0d0d0d] dark:text-[#ececec] mb-1.5">
              Security & Privacy
            </h3>
            <p className="text-xs text-[#676767] dark:text-[#b4b4b4] leading-relaxed">
              Strict shop-level tenant isolation, AES-256 encrypted device passcodes, and audited access logs.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-[#f4f4f4] dark:bg-[#2a2a2a] text-[#0d0d0d] dark:text-[#ececec] flex items-center justify-center mb-3">
              <Heart size={18} />
            </div>
            <h3 className="text-sm font-bold text-[#0d0d0d] dark:text-[#ececec] mb-1.5">
              Zero Hidden Costs
            </h3>
            <p className="text-xs text-[#676767] dark:text-[#b4b4b4] leading-relaxed">
              Transparent annual pricing, zero transaction cut on your customer payments, and honest software updates.
            </p>
          </div>
        </div>

        {/* Action Callout */}
        <div className="text-center">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0d0d0d] text-white hover:bg-[#262626] dark:bg-[#ececec] dark:text-[#0d0d0d] dark:hover:bg-white rounded-xl font-medium text-sm transition-colors no-underline shadow-none"
          >
            Start Your 14-Day Free Trial <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
};
