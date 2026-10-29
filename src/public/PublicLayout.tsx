import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar.tsx';
import { PublicFooter } from './PublicFooter.tsx';

interface PublicLayoutProps {
  children?: React.ReactNode;
}

/**
 * Decoupled Public Marketing Layout (Unprotected)
 * Zero app sidebar, zero internal app top navigation.
 * Standard marketing navbar + footer.
 */
export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#212121] text-[#0d0d0d] dark:text-[#ececec] transition-colors duration-200">
      <PublicNavbar />
      <main className="flex-1">
        {children || <Outlet />}
      </main>
      <PublicFooter />
    </div>
  );
};
