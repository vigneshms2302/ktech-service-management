import React, { createContext, useContext, useState, useCallback } from 'react';

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

  const updateShopSettings = useCallback((newSettings: Partial<ShopSettings>) => {
    setShopSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.shopName !== undefined) localStorage.setItem('ktech_shop_name', newSettings.shopName);
      if (newSettings.tagline !== undefined) localStorage.setItem('ktech_shop_tagline', newSettings.tagline);
      if (newSettings.phone !== undefined) localStorage.setItem('ktech_shop_phone', newSettings.phone);
      if (newSettings.address !== undefined) localStorage.setItem('ktech_shop_address', newSettings.address);
      if (newSettings.gstin !== undefined) localStorage.setItem('ktech_shop_gstin', newSettings.gstin);
      if (newSettings.upiId !== undefined) localStorage.setItem('ktech_shop_upi', newSettings.upiId);
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
