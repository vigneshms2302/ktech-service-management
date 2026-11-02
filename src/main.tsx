import './api/client.ts';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { App } from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { ShopProvider } from './context/ShopContext.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import './index.css';

// In Electron / desktop packaged applications loaded via file://, HashRouter is required.
// In standard web browsers running over http:// or https://, BrowserRouter is used for clean URLs.
const isFileProtocol = typeof window !== 'undefined' && (
  window.location.protocol === 'file:' ||
  Boolean((window as any).desktopBridge) ||
  Boolean((window as any).electronAPI?.isDesktop)
);
const Router = isFileProtocol ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ShopProvider>
          <AuthProvider>
            <Router>
              <App />
            </Router>
          </AuthProvider>
        </ShopProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
