import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wrench, Menu, X, ArrowRight, Sun, Moon, LayoutDashboard } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

export const PublicNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { currentUser } = useAuth();
  const isLight = theme === 'light';

  const navLinks = [
    { label: 'Features', path: '/features' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Live Demo', path: '/demo' },
    { label: 'FAQ', path: '/faq' },
    { label: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(10, 10, 10, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${isLight ? '#e5e7eb' : '#222222'}`,
        transition: 'background-color 0.2s ease',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10a37f, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(16, 163, 127, 0.25)',
            }}
          >
            <Wrench size={20} />
          </div>
          <div>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '-0.3px',
                color: isLight ? '#111827' : '#ffffff',
              }}
            >
              K-Connect
            </span>
            <span
              style={{
                marginLeft: '6px',
                fontSize: '10.5px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 163, 127, 0.15)',
                color: '#10a37f',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
              }}
            >
              Cloud SaaS
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                padding: '8px 14px',
                fontSize: '13.5px',
                fontWeight: isActive(link.path) ? 600 : 500,
                color: isActive(link.path)
                  ? '#10a37f'
                  : isLight
                  ? '#4b5563'
                  : '#a1a1aa',
                textDecoration: 'none',
                borderRadius: '8px',
                transition: 'color 0.15s ease, background-color 0.15s ease',
                backgroundColor: isActive(link.path)
                  ? isLight
                    ? '#f0fdf4'
                    : 'rgba(16, 163, 127, 0.1)'
                  : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title="Toggle theme"
            style={{
              background: 'none',
              border: `1px solid ${isLight ? '#e5e7eb' : '#2a2a2a'}`,
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: isLight ? '#4b5563' : '#a1a1aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Dynamic Auth Action */}
          {currentUser ? (
            <Link
              to={currentUser.roleId === 'ROLE_SUPER_ADMIN' ? '/admin' : '/app'}
              style={{
                padding: '9px 18px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: '#10a37f',
                textDecoration: 'none',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: '0 4px 14px rgba(16, 163, 127, 0.3)',
              }}
            >
              <LayoutDashboard size={15} />
              {currentUser.roleId === 'ROLE_SUPER_ADMIN' ? 'Admin Panel' : 'Go to Workspace'}
              <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              {/* Login Link */}
              <Link
                to="/login"
                style={{
                  padding: '8px 16px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: isLight ? '#111827' : '#f9fafb',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  border: `1px solid ${isLight ? '#d1d5db' : '#333333'}`,
                  transition: 'background-color 0.15s ease',
                }}
              >
                Sign In
              </Link>

              {/* 14-Day Free Trial CTA */}
              <Link
                to="/signup"
                style={{
                  padding: '9px 18px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: '#10a37f',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(16, 163, 127, 0.3)',
                  transition: 'opacity 0.15s ease, transform 0.15s ease',
                }}
              >
                Start Free Trial <ArrowRight size={15} />
              </Link>
            </>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              padding: '8px',
              color: 'inherit',
              cursor: 'pointer',
            }}
            className="mobile-hamburger"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: isLight ? '#ffffff' : '#111111',
            borderTop: `1px solid ${isLight ? '#e5e7eb' : '#222222'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                fontWeight: 500,
                color: isActive(link.path) ? '#10a37f' : 'inherit',
                textDecoration: 'none',
                borderRadius: '8px',
              }}
            >
              {link.label}
            </Link>
          ))}
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                flex: 1,
                padding: '10px',
                textAlign: 'center',
                borderRadius: '8px',
                border: `1px solid ${isLight ? '#d1d5db' : '#333333'}`,
                textDecoration: 'none',
                color: 'inherit',
                fontWeight: 600,
                fontSize: '13.5px',
              }}
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                flex: 1,
                padding: '10px',
                textAlign: 'center',
                borderRadius: '8px',
                backgroundColor: '#10a37f',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '13.5px',
              }}
            >
              Start Trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
