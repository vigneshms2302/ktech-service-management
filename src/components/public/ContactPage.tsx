import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { saasApi } from '../../api/client.ts';

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Sales Inquiry / Demo',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await saasApi.public.submitContact({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
      });

      if (res.success) {
        setSuccessMessage('Thank you! Your message has been received. Our team will contact you shortly.');
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: 'Sales Inquiry / Demo',
          message: '',
        });
      } else {
        setErrorMessage(res.error || 'Failed to submit inquiry. Please try again or call us directly.');
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Communication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] transition-colors duration-200">
      <section className="pt-16 pb-12 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20 uppercase tracking-wider mb-4">
          <MessageSquare size={13} />
          Get In Touch
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0d0d0d] dark:text-[#ececec] mb-4">
          We’re Here to Help Your Repair Lab Succeed
        </h1>
        <p className="text-base sm:text-lg text-[#676767] dark:text-[#b4b4b4] max-w-2xl mx-auto leading-relaxed">
          Have questions about multi-workstation setup, annual GPay payments, thermal printers, or custom shop migration? Talk to our founders directly.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Contact Details */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#f9f9f9] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2f2f2f]">
            <h2 className="text-xl font-bold text-[#0d0d0d] dark:text-[#ececec] mb-6">
              Direct Support & Operations
            </h2>

            <div className="flex flex-col gap-6 mb-8">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec] flex items-center justify-center shrink-0">
                  <Phone size={18} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#676767] dark:text-[#b4b4b4] uppercase tracking-wider">
                    Phone & WhatsApp Support
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-[#0d0d0d] dark:text-[#ececec] mt-0.5">
                    +91 98422 00000
                  </div>
                  <div className="text-xs text-[#676767] dark:text-[#b4b4b4] mt-0.5">
                    Mon - Sat: 9:30 AM to 8:30 PM IST
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec] flex items-center justify-center shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#676767] dark:text-[#b4b4b4] uppercase tracking-wider">
                    Email Correspondence
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-[#0d0d0d] dark:text-[#ececec] mt-0.5">
                    billing@kconnect.cloud
                  </div>
                  <div className="text-xs text-[#676767] dark:text-[#b4b4b4] mt-0.5">
                    Inquiries answered within 2-4 hours
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec] flex items-center justify-center shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#676767] dark:text-[#b4b4b4] uppercase tracking-wider">
                    Main Headquarters
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-[#0d0d0d] dark:text-[#ececec] mt-0.5 leading-relaxed">
                    K-Connect Cloud SaaS Technologies<br />
                    Gandhipuram Market, Coimbatore, Tamil Nadu 641012, India
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] text-xs text-[#676767] dark:text-[#b4b4b4] leading-relaxed">
              <strong className="text-[#0d0d0d] dark:text-[#ececec]">Instant Activation:</strong> If you have already made a GPay payment, simply submit your 12-digit UTR on the checkout page for rapid verification.
            </div>
          </div>

          {/* Contact Form */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] shadow-sm">
            <h2 className="text-xl font-bold text-[#0d0d0d] dark:text-[#ececec] mb-2">
              Send Us a Message
            </h2>
            <p className="text-xs sm:text-sm text-[#676767] dark:text-[#b4b4b4] mb-6">
              Fill in your details and we’ll reach out to schedule an onboarding walkthrough.
            </p>

            {successMessage && (
              <div className="flex gap-2.5 items-start p-3.5 rounded-xl bg-[#10a37f]/10 border border-[#10a37f]/20 text-[#10a37f] text-xs sm:text-sm mb-5">
                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="flex gap-2.5 items-start p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs sm:text-sm mb-5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-1.5">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senthil Nathan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5e5] dark:border-[#2f2f2f] bg-white dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec] text-sm outline-none focus:border-[#0d0d0d] dark:focus:border-[#ececec] transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="senthil@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5e5] dark:border-[#2f2f2f] bg-white dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec] text-sm outline-none focus:border-[#0d0d0d] dark:focus:border-[#ececec] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-1.5">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="98422 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5e5] dark:border-[#2f2f2f] bg-white dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec] text-sm outline-none focus:border-[#0d0d0d] dark:focus:border-[#ececec] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-1.5">
                  Subject
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5e5] dark:border-[#2f2f2f] bg-white dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec] text-sm outline-none focus:border-[#0d0d0d] dark:focus:border-[#ececec] transition-colors"
                >
                  <option value="Sales Inquiry / Demo">Sales Inquiry & Onboarding Demo</option>
                  <option value="GPay Payment Assistance">GPay Payment & Licence Verification</option>
                  <option value="Hardware / Printer Setup">Thermal Printer & Scanner Integration</option>
                  <option value="Feature Request">New Feature Suggestion</option>
                  <option value="General Question">General Question</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0d0d0d] dark:text-[#ececec] mb-1.5">
                  Message *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us about your shop (number of technicians, repair types, or questions)..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e5e5e5] dark:border-[#2f2f2f] bg-white dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-[#ececec] text-sm outline-none focus:border-[#0d0d0d] dark:focus:border-[#ececec] transition-colors resize-vertical"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-5 bg-[#0d0d0d] text-white hover:bg-[#262626] dark:bg-[#ececec] dark:text-[#0d0d0d] dark:hover:bg-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-none mt-2"
              >
                <Send size={15} /> {isSubmitting ? 'Submitting...' : 'Send Inquiry'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
