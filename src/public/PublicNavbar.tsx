import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';

export const PublicNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  const navLinks = [
    { label: 'Features', path: '/features' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Live Demo', path: '/demo' },
    { label: 'FAQ', path: '/faq' },
    { label: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[#212121]/80 backdrop-blur-md border-b border-[#e5e5e5] dark:border-[#2f2f2f] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo - Minimal ChatGPT / Anthropic Style */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-inherit no-underline group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0d0d0d] dark:bg-white flex items-center justify-center text-white dark:text-[#0d0d0d] transition-transform duration-150 group-hover:scale-105">
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2L14.39 8.26L21 9.27L16.27 13.88L17.38 20.46L12 17.63L6.62 20.46L7.73 13.88L3 9.27L9.61 8.26L12 2Z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight text-[#0d0d0d] dark:text-[#ececec]">
              K-Connect
            </span>
            <span className="hidden sm:inline-block text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full border border-[#e5e5e5] dark:border-[#2f2f2f] text-[#676767] dark:text-[#b4b4b4]">
              Public
            </span>
          </div>
        </Link>

        {/* Marketing Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors duration-150 no-underline ${
                isActive(link.path)
                  ? 'text-[#0d0d0d] dark:text-white font-medium bg-black/5 dark:bg-white/10'
                  : 'text-[#676767] dark:text-[#b4b4b4] hover:text-[#0d0d0d] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 font-normal'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action CTAs: Clean Marketing Sign In & Sign Up */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title="Toggle theme"
            className="p-2 rounded-full text-[#676767] dark:text-[#b4b4b4] hover:text-[#0d0d0d] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Marketing Auth Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/login"
              className="px-3.5 py-2 text-sm font-medium text-[#0d0d0d] dark:text-[#ececec] hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors no-underline"
            >
              Sign In
            </Link>

            <Link
              to="/signup"
              className="px-4 py-2 text-sm font-medium bg-[#0d0d0d] hover:bg-[#262626] text-white dark:bg-[#ececec] dark:hover:bg-white dark:text-[#0d0d0d] rounded-full flex items-center gap-1.5 transition-colors no-underline shadow-none"
            >
              <span>Sign Up</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#0d0d0d] dark:text-[#ececec] hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-5 bg-white dark:bg-[#212121] border-t border-[#e5e5e5] dark:border-[#2f2f2f] flex flex-col gap-1 transition-colors">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors no-underline ${
                isActive(link.path)
                  ? 'text-[#0d0d0d] dark:text-white font-medium bg-black/5 dark:bg-white/10'
                  : 'text-[#676767] dark:text-[#b4b4b4] hover:text-[#0d0d0d] dark:hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-2 mt-3 pt-3 border-t border-[#e5e5e5] dark:border-[#2f2f2f]">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 py-2 text-center text-sm font-medium text-[#0d0d0d] dark:text-[#ececec] border border-[#e5e5e5] dark:border-[#2f2f2f] rounded-xl hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-colors no-underline"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 py-2 text-center text-sm font-medium bg-[#0d0d0d] text-white dark:bg-white dark:text-[#0d0d0d] rounded-xl hover:bg-[#262626] dark:hover:bg-gray-200 transition-colors no-underline"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
