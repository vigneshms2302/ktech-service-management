import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { ShopProvider } from './context/ShopContext.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ShopProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ShopProvider>
    </ThemeProvider>
  </React.StrictMode>
);
