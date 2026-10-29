import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Workflow } from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Register Your Shop in 30 Seconds',
      desc: 'Enter your shop name, city, and mobile number. Choose your custom shop handle (e.g. kconnect.cloud/ktech). Your 14-day free trial activates instantly with no credit card required.',
    },
    {
      num: '02',
      title: 'Run Quick Onboarding',
      desc: 'Set up your shop header, print address, tax GSTIN, and create PIN credentials for your front desk receptionist and bench technicians.',
    },
    {
      num: '03',
      title: 'Admit Your First Repair Job',
      desc: 'Type customer details, select device model (Laptop, Desktop, Motherboard, Console, Mobile), note reported symptoms, and print an 80mm thermal intake receipt with QR tracking.',
    },
    {
      num: '04',
      title: 'Diagnose & Dispatch WhatsApp Estimates',
      desc: 'Bench technicians check voltage rails and log faulty chips. Send a professional WhatsApp PDF quotation. Customer approves with 1 click.',
    },
    {
      num: '05',
      title: 'Deliver, Issue Warranty & Collect Payment',
      desc: 'Complete the 10-point QC test. Print thermal delivery slip, issue a digital warranty card, and record the payment via cash or your shop UPI QR.',
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] transition-colors duration-200">
      <section className="pt-16 pb-12 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20 uppercase tracking-wider mb-4">
          <Workflow size={13} />
          Simplicity at Scale
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0d0d0d] dark:text-[#ececec] mb-4">
          How K-Connect Transforms Your Daily Repair Operations
        </h1>
        <p className="text-base sm:text-lg text-[#676767] dark:text-[#b4b4b4] max-w-2xl mx-auto leading-relaxed">
          Designed from the ground up to replace handwritten ticket books, WhatsApp confusion, and untracked scrap parts with a smooth 5-step flow.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex flex-col gap-4">
          {steps.map((st) => (
            <div
              key={st.num}
              className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] shadow-sm flex items-start gap-5 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-[#f4f4f4] dark:bg-[#2a2a2a] text-[#0d0d0d] dark:text-[#ececec] font-mono font-bold text-sm flex items-center justify-center shrink-0">
                {st.num}
              </div>
              <div className="flex-1">
                <h2 className="text-base sm:text-lg font-bold text-[#0d0d0d] dark:text-[#ececec] mb-1.5">
                  {st.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] leading-relaxed">
                  {st.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <div className="mt-12 p-8 rounded-2xl bg-[#f9f9f9] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2f2f2f] text-center">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0d0d0d] dark:text-[#ececec] mb-2">
            Ready to streamline your shop today?
          </h3>
          <p className="text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] max-w-lg mx-auto mb-5">
            Join hundreds of Indian repair technicians managing their benches on K-Connect.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0d0d0d] text-white hover:bg-[#262626] dark:bg-[#ececec] dark:text-[#0d0d0d] dark:hover:bg-white rounded-xl font-medium text-sm transition-colors no-underline shadow-none"
          >
            Start 14-Day Free Trial <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
};
