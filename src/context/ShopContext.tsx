import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext.tsx';
import { saasApi } from '../api/client.ts';

export interface ShopSettings {
  shopName: string;
  tagline: string;
  phone: string;
  address: string;
  gstin: string;
  upiId: string;
}

interface ShopContextType {
  shopSettings: ShopSettings;
  updateShopSettings: (settings: Partial<ShopSettings>) => void;
  refreshShopSettings: () => Promise<void>;
}

const DEFAULT_SHOP_TAGLINE = 'Chip-Level Laptop, Desktop & Mobile Repair Lab';

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  let currentUser: any = null;
  try {
    const auth = useAuth();
    currentUser = auth.currentUser;
  } catch {
    // Graceful fallback if rendered outside AuthProvider
  }

  const shopId = currentUser?.shopId || 'default';
  const fallbackName = currentUser?.shopName || '';

  const loadStoredSettings = useCallback((sid: string, defaultName = ''): ShopSettings => {
    const p = `ktech_${sid}_`;
    return {
      shopName: localStorage.getItem(`${p}shop_name`) || defaultName || '',
      tagline: localStorage.getItem(`${p}shop_tagline`) || DEFAULT_SHOP_TAGLINE,
      phone: localStorage.getItem(`${p}shop_phone`) || '',
      address: localStorage.getItem(`${p}shop_address`) || '',
      gstin: localStorage.getItem(`${p}shop_gstin`) || '',
      upiId: localStorage.getItem(`${p}shop_upi`) || '',
    };
  }, []);

  const [shopSettings, setShopSettings] = useState<ShopSettings>(() =>
    loadStoredSettings(shopId, fallbackName)
  );

  // Sync state whenever the authenticated tenant changes
  useEffect(() => {
    if (currentUser?.shopId) {
      setShopSettings(loadStoredSettings(currentUser.shopId, currentUser.shopName));
    }
  }, [currentUser?.shopId, currentUser?.shopName, loadStoredSettings]);

  const fetchDbSettings = useCallback(async () => {
    try {
      // 1. Try fetching from Cloud /api/shops/me
      if (saasApi.shops?.getMe) {
        const res = await saasApi.shops.getMe();
        if (res.success && res.data) {
          const s = res.data;
          const settings = s.settings || {};
          const currentShopId = currentUser?.shopId || s.id || 'default';
          const p = `ktech_${currentShopId}_`;

          const updated: ShopSettings = {
            shopName: s.name || currentUser?.shopName || '',
            tagline: s.tagline || settings['shop.tagline'] || DEFAULT_SHOP_TAGLINE,
            phone: s.phone || '',
            address: s.address || (s.city ? `${s.city}${s.state ? ', ' + s.state : ''}` : ''),
            gstin: s.gstin || '',
            upiId: s.upi_id || '',
          };

          setShopSettings(updated);

          // Keep scoped localStorage updated
          if (updated.shopName) localStorage.setItem(`${p}shop_name`, updated.shopName);
          if (updated.tagline) localStorage.setItem(`${p}shop_tagline`, updated.tagline);
          if (updated.phone) localStorage.setItem(`${p}shop_phone`, updated.phone);
          if (updated.address) localStorage.setItem(`${p}shop_address`, updated.address);
          if (updated.gstin) localStorage.setItem(`${p}shop_gstin`, updated.gstin);
          if (updated.upiId) localStorage.setItem(`${p}shop_upi`, updated.upiId);

          return;
        }
      }

      // 2. Fallback to electronAPI.system.getSettings
      if (window.electronAPI?.system?.getSettings) {
        const res = await window.electronAPI.system.getSettings();
        if (res.success && res.data) {
          const dbSettings = res.data;
          const currentShopId = currentUser?.shopId || 'default';
          const p = `ktech_${currentShopId}_`;

          setShopSettings((prev) => {
            const updated: ShopSettings = {
              shopName: dbSettings['shop.name'] || prev.shopName || fallbackName,
              tagline: dbSettings['shop.tagline'] || prev.tagline || DEFAULT_SHOP_TAGLINE,
              phone: dbSettings['shop.phone'] || prev.phone,
              address: dbSettings['shop.address'] || prev.address,
              gstin: dbSettings['shop.gstin'] || prev.gstin,
              upiId: dbSettings['shop.upi_id'] || prev.upiId,
            };

            if (updated.shopName) localStorage.setItem(`${p}shop_name`, updated.shopName);
            if (updated.tagline) localStorage.setItem(`${p}shop_tagline`, updated.tagline);
            if (updated.phone) localStorage.setItem(`${p}shop_phone`, updated.phone);
            if (updated.address) localStorage.setItem(`${p}shop_address`, updated.address);
            if (updated.gstin) localStorage.setItem(`${p}shop_gstin`, updated.gstin);
            if (updated.upiId) localStorage.setItem(`${p}shop_upi`, updated.upiId);

            return updated;
          });
        }
      }
    } catch (err) {
      console.warn('Could not load shop settings from DB:', err);
    }
  }, [currentUser?.shopId, currentUser?.shopName, fallbackName]);

  // Sync with DB settings on mount and whenever tenant user logs in or changes
  useEffect(() => {
    fetchDbSettings();
  }, [fetchDbSettings, currentUser?.shopId]);

  const updateShopSettings = useCallback(
    (newSettings: Partial<ShopSettings>) => {
      setShopSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        const p = `ktech_${shopId}_`;
        if (newSettings.shopName !== undefined) localStorage.setItem(`${p}shop_name`, newSettings.shopName);
        if (newSettings.tagline !== undefined) localStorage.setItem(`${p}shop_tagline`, newSettings.tagline);
        if (newSettings.phone !== undefined) localStorage.setItem(`${p}shop_phone`, newSettings.phone);
        if (newSettings.address !== undefined) localStorage.setItem(`${p}shop_address`, newSettings.address);
        if (newSettings.gstin !== undefined) localStorage.setItem(`${p}shop_gstin`, newSettings.gstin);
        if (newSettings.upiId !== undefined) localStorage.setItem(`${p}shop_upi`, newSettings.upiId);

        // 1. Persist directly to Cloud database via REST PUT /api/shops/me
        if (saasApi.shops?.updateMe) {
          saasApi.shops
            .updateMe({
              name: newSettings.shopName,
              tagline: newSettings.tagline,
              phone: newSettings.phone,
              address: newSettings.address,
              gstin: newSettings.gstin,
              upiId: newSettings.upiId,
            })
            .catch((err) => console.warn('Could not persist shop settings to Cloud DB:', err));
        }

        // 2. Also persist to electron desktop offline SQLite if running
        if (window.electronAPI?.system?.updateSetting) {
          const promises: Promise<unknown>[] = [];
          if (newSettings.shopName !== undefined) {
            promises.push(window.electronAPI.system.updateSetting({ key: 'shop.name', value: newSettings.shopName }));
          }
          if (newSettings.tagline !== undefined) {
            promises.push(window.electronAPI.system.updateSetting({ key: 'shop.tagline', value: newSettings.tagline }));
          }
          if (newSettings.phone !== undefined) {
            promises.push(window.electronAPI.system.updateSetting({ key: 'shop.phone', value: newSettings.phone }));
          }
          if (newSettings.address !== undefined) {
            promises.push(window.electronAPI.system.updateSetting({ key: 'shop.address', value: newSettings.address }));
          }
          if (newSettings.gstin !== undefined) {
            promises.push(window.electronAPI.system.updateSetting({ key: 'shop.gstin', value: newSettings.gstin }));
          }
          if (newSettings.upiId !== undefined) {
            promises.push(window.electronAPI.system.updateSetting({ key: 'shop.upi_id', value: newSettings.upiId }));
          }
          Promise.all(promises).catch((err) => console.warn('Could not persist shop settings to DB:', err));
        }

        // Notify any listeners
        window.dispatchEvent(new CustomEvent('ktech:shop-settings-updated', { detail: updated }));

        return updated;
      });
    },
    [shopId]
  );

  return (
    <ShopContext.Provider value={{ shopSettings, updateShopSettings, refreshShopSettings: fetchDbSettings }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = (): ShopContextType => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
