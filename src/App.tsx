import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext.tsx';

// 1. Decoupled Public Marketing Site (Unprotected)
import {
  PublicLayout,
  HomePage,
  FeaturesPage,
  PricingPage,
  HowItWorksPage,
  AboutPage,
  DemoPage,
  FaqPage,
  ContactPage,
  PrivacyPolicyPage,
  TermsOfServicePage,
  RefundPolicyPage,
  PublicJobTracker,
} from './public/index.ts';

// 2. Decoupled Standalone Auth Flow (Clean & Centered, No Sidebar)
import { LoginPage } from './components/auth/LoginPage.tsx';
import { SignupPage } from './components/auth/SignupPage.tsx';
import { OnboardingWizard } from './components/auth/OnboardingWizard.tsx';

// 3. Decoupled SaaS Application (Protected, ChatGPT-Style Sidebar Layout)
import { AppLayout, ProtectedRoute } from './app/index.ts';

// Platform Super Admin Control Center
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard.tsx';
import { AnnualCheckoutPage } from './components/subscription/AnnualCheckoutPage.tsx';

/** Public Repair Tracking Route Wrapper (reads route param or search query) */
const TrackRouteWrapper: React.FC = () => {
  const { jobNumber } = useParams<{ jobNumber?: string }>();
  const searchParams = new URLSearchParams(window.location.search);
  const trackParam = searchParams.get('track');
  const initial = jobNumber || trackParam || '';
  return <PublicJobTracker initialJobNumber={initial} />;
};

export const App: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] text-sm font-semibold">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#10a37f] border-t-transparent rounded-full animate-spin" />
          <span>Initializing K-Connect...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Root traffic opens the main SaaS application directly (redirects to /login if unauthenticated) */}
      <Route path="/" element={<Navigate to="/app" replace />} />

      {/* Customer Repair Tracking (publicly accessible via QR codes or SMS) */}
      <Route path="/track" element={<TrackRouteWrapper />} />
      <Route path="/track/:jobNumber" element={<TrackRouteWrapper />} />

      {/* ─────────────────────────────────────────────────────────────
          1. Public Marketing Site (On Hold - Available under /site)
          ───────────────────────────────────────────────────────────── */}
      <Route path="/site" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="features" element={<FeaturesPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="demo" element={<DemoPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="privacy" element={<PrivacyPolicyPage />} />
        <Route path="terms" element={<TermsOfServicePage />} />
        <Route path="refund-policy" element={<RefundPolicyPage />} />
      </Route>

      {/* ─────────────────────────────────────────────────────────────
          2. The Standalone Auth Flow (Clean & Centered, No Sidebar)
          ───────────────────────────────────────────────────────────── */}
      <Route
        path="/login"
        element={
          currentUser ? (
            currentUser.roleId === 'ROLE_SUPER_ADMIN' ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/app" replace />
            )
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/signup"
        element={
          currentUser ? (
            <Navigate to="/app" replace />
          ) : (
            <SignupPage />
          )
        }
      />
      <Route path="/onboarding" element={<OnboardingWizard />} />

      {/* ─────────────────────────────────────────────────────────────
          3. The SaaS App (Protected, ChatGPT-Style Sidebar Layout)
          ───────────────────────────────────────────────────────────── */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />

      {/* Annual Checkout / Subscription Upgrade */}
      <Route
        path="/checkout/annual"
        element={
          <ProtectedRoute>
            <AnnualCheckoutPage />
          </ProtectedRoute>
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          4. Platform Super Admin Control Center
          ───────────────────────────────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          currentUser?.roleId === 'ROLE_SUPER_ADMIN' ? (
            <SuperAdminDashboard />
          ) : (
            <Navigate to="/login?admin=1" replace />
          )
        }
      />
      <Route
        path="/admin/*"
        element={
          currentUser?.roleId === 'ROLE_SUPER_ADMIN' ? (
            <SuperAdminDashboard />
          ) : (
            <Navigate to="/login?admin=1" replace />
          )
        }
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
