import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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
}

const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  shopName: 'KTech Computers',
  tagline: 'Chip-Level Laptop, Desktop & Mobile Repair Lab',
  phone: '+91 98400 12345',
  address: '1st Floor, Gandhi Road, Main Market',
  gstin: '33AAAAA0000A1Z5',
  upiId: 'ktech@upi',
};

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shopSettings, setShopSettings] = useState<ShopSettings>(() => {
    return {
      shopName: localStorage.getItem('ktech_shop_name') || DEFAULT_SHOP_SETTINGS.shopName,
      tagline: localStorage.getItem('ktech_shop_tagline') || DEFAULT_SHOP_SETTINGS.tagline,
      phone: localStorage.getItem('ktech_shop_phone') || DEFAULT_SHOP_SETTINGS.phone,
      address: localStorage.getItem('ktech_shop_address') || DEFAULT_SHOP_SETTINGS.address,
      gstin: localStorage.getItem('ktech_shop_gstin') || DEFAULT_SHOP_SETTINGS.gstin,
      upiId: localStorage.getItem('ktech_shop_upi') || DEFAULT_SHOP_SETTINGS.upiId,
    };
  });

  // Sync with DB settings if available
  useEffect(() => {
    const fetchDbSettings = async () => {
      try {
        if (window.electronAPI?.system?.getSettings) {
          const res = await window.electronAPI.system.getSettings();
          if (res.success && res.data) {
            const dbSettings = res.data;
            setShopSettings((prev) => {
              const updated: ShopSettings = {
                shopName: dbSettings['shop.name'] || localStorage.getItem('ktech_shop_name') || prev.shopName,
                tagline: dbSettings['shop.tagline'] || localStorage.getItem('ktech_shop_tagline') || prev.tagline,
                phone: dbSettings['shop.phone'] || localStorage.getItem('ktech_shop_phone') || prev.phone,
                address: dbSettings['shop.address'] || localStorage.getItem('ktech_shop_address') || prev.address,
                gstin: dbSettings['shop.gstin'] || localStorage.getItem('ktech_shop_gstin') || prev.gstin,
                upiId: dbSettings['shop.upi_id'] || localStorage.getItem('ktech_shop_upi') || prev.upiId,
              };

              // Keep localStorage updated with DB
              if (updated.shopName) localStorage.setItem('ktech_shop_name', updated.shopName);
              if (updated.tagline) localStorage.setItem('ktech_shop_tagline', updated.tagline);
              if (updated.phone) localStorage.setItem('ktech_shop_phone', updated.phone);
              if (updated.address) localStorage.setItem('ktech_shop_address', updated.address);
              if (updated.gstin) localStorage.setItem('ktech_shop_gstin', updated.gstin);
              if (updated.upiId) localStorage.setItem('ktech_shop_upi', updated.upiId);

              return updated;
            });
          }
        }
      } catch (err) {
        console.warn('Could not load shop settings from DB:', err);
      }
    };

    fetchDbSettings();
  }, []);

  const updateShopSettings = useCallback((newSettings: Partial<ShopSettings>) => {
    setShopSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.shopName !== undefined) localStorage.setItem('ktech_shop_name', newSettings.shopName);
      if (newSettings.tagline !== undefined) localStorage.setItem('ktech_shop_tagline', newSettings.tagline);
      if (newSettings.phone !== undefined) localStorage.setItem('ktech_shop_phone', newSettings.phone);
      if (newSettings.address !== undefined) localStorage.setItem('ktech_shop_address', newSettings.address);
      if (newSettings.gstin !== undefined) localStorage.setItem('ktech_shop_gstin', newSettings.gstin);
      if (newSettings.upiId !== undefined) localStorage.setItem('ktech_shop_upi', newSettings.upiId);

      // Async persist to SQLite backend
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
  }, []);

  return (
    <ShopContext.Provider value={{ shopSettings, updateShopSettings }}>
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
