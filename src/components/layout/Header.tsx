import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Moon,
  Sun,
  LogOut,
  Plus,
  ChevronDown,
  Check,
  PanelLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { useShop } from '../../context/ShopContext.tsx';
import { PricingModal } from '../pricing/PricingModal.tsx';

interface HeaderProps {
  onOpenPinModal: () => void;
  onOpenLoginModal: () => void;
  onOpenSearch: () => void;
  onNewJob?: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPinModal: _onOpenPinModal,
  onOpenLoginModal: _onOpenLoginModal,
  onOpenSearch,
  onNewJob,
  onToggleSidebar,
  isSidebarOpen = true,
}) => {
  const { currentUser, logout, userList } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { shopSettings } = useShop();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setShowUserDropdown(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowUserDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const initials = currentUser?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <>
      <header className="h-14 bg-white dark:bg-[#212121] border-b border-[#e5e5e5] dark:border-[#2f2f2f] flex items-center justify-between px-4 select-none shrink-0 relative z-20 gap-2 transition-colors duration-200">
        {/* LEFT: Sidebar toggle + Shop name */}
        <div className="flex items-center gap-2 shrink-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#676767] dark:text-[#b4b4b4] hover:bg-gray-100 dark:hover:bg-[#2f2f2f] hover:text-[#0d0d0d] dark:hover:text-white transition-colors cursor-pointer"
            >
              <PanelLeft size={17} />
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#0d0d0d] dark:text-[#ececec] tracking-tight max-w-[180px] truncate">
              {shopSettings.shopName || 'K-Connect'}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#e5e5e5] dark:border-[#2f2f2f] text-[#676767] dark:text-[#b4b4b4]">
              Lab OS
            </span>
          </div>
        </div>

        {/* CENTER: Minimalist Search / Quick Action */}
        <div className="flex-1 max-w-md mx-3">
          <div
            onClick={onOpenSearch}
            className="flex items-center gap-2 bg-white dark:bg-[#282828] border border-[#e5e5e5] dark:border-[#2f2f2f] hover:border-gray-400 dark:hover:border-gray-500 rounded-xl px-3 py-1.5 cursor-pointer transition-colors shadow-none"
          >
            <Search size={14} className="text-[#676767] dark:text-[#b4b4b4]" />
            <span className="flex-1 text-xs text-[#676767] dark:text-[#b4b4b4] truncate font-normal">
              Search jobs, customers, invoices...
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[10px] text-[#676767] dark:text-[#b4b4b4] font-mono">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* New Job Button: ChatGPT Solid Button */}
          {onNewJob && (
            <button
              type="button"
              onClick={onNewJob}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d0d0d] text-white hover:bg-[#262626] dark:bg-[#ececec] dark:text-[#0d0d0d] dark:hover:bg-white text-xs font-medium transition-colors shadow-none cursor-pointer"
            >
              <Plus size={14} />
              <span>New Job</span>
            </button>
          )}

          {/* Upgrade Ghost Button */}
          <button
            type="button"
            onClick={() => setIsPricingOpen(true)}
            className="px-2.5 py-1.5 rounded-lg border border-[#e5e5e5] dark:border-[#2f2f2f] hover:bg-gray-100 dark:hover:bg-[#282828] text-xs font-medium text-[#676767] dark:text-[#b4b4b4] hover:text-[#0d0d0d] dark:hover:text-white transition-colors cursor-pointer"
          >
            Upgrade
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title="Toggle theme"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#676767] dark:text-[#b4b4b4] hover:bg-gray-100 dark:hover:bg-[#282828] hover:text-[#0d0d0d] dark:hover:text-white transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* User Avatar + Dropdown */}
          <div ref={userDropdownRef} className="relative ml-1">
            <button
              type="button"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-[#0d0d0d] dark:bg-white text-white dark:text-[#0d0d0d] flex items-center justify-center font-semibold text-xs shrink-0">
                {initials}
              </div>
              <ChevronDown size={12} className="text-[#676767] dark:text-[#b4b4b4]" />
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute top-11 right-0 w-56 bg-white dark:bg-[#212121] border border-[#e5e5e5] dark:border-[#2f2f2f] rounded-xl shadow-lg p-1.5 flex flex-col gap-1 z-50 animate-fade-in">
                {/* User Info */}
                <div className="px-2.5 py-2 border-b border-[#e5e5e5] dark:border-[#2f2f2f] mb-1">
                  <div className="text-xs font-semibold text-[#0d0d0d] dark:text-[#ececec]">
                    {currentUser?.fullName || 'User'}
                  </div>
                  <div className="text-[11px] text-[#676767] dark:text-[#b4b4b4] mt-0.5">
                    {currentUser?.roleName || 'Staff'}
                  </div>
                </div>

                {/* Switch User List */}
                {userList.length > 1 && (
                  <>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#676767] dark:text-[#b4b4b4] px-2 py-1">
                      Switch User
                    </div>
                    {userList.map((user) => {
                      const isCurrent = currentUser?.id === user.id;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => setShowUserDropdown(false)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left cursor-pointer transition-colors ${
                            isCurrent
                              ? 'bg-gray-100 dark:bg-[#2f2f2f] text-[#0d0d0d] dark:text-white font-medium'
                              : 'text-[#0d0d0d] dark:text-[#ececec] hover:bg-gray-100 dark:hover:bg-[#282828]'
                          }`}
                        >
                          <div>
                            <div>{user.fullName}</div>
                            <div className="text-[10px] text-[#676767] dark:text-[#b4b4b4]">{user.roleName}</div>
                          </div>
                          {isCurrent && <Check size={13} className="text-[#0d0d0d] dark:text-white" />}
                        </button>
                      );
                    })}
                    <div className="h-[1px] bg-[#e5e5e5] dark:bg-[#2f2f2f] my-1" />
                  </>
                )}

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={async () => {
                    setShowUserDropdown(false);
                    await logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
    </>
  );
};
