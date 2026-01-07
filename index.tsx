import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Auth0 Configuration
// Domain: dev-ht1opj33lzf103ci.us.auth0.com
// Client ID: NeCOkSW3tJ6SdKHPpXgTvbCDdBirHeGR
root.render(
  <React.StrictMode>
    <Auth0Provider
      domain="dev-ht1opj33lzf103ci.us.auth0.com"
      clientId="NeCOkSW3tJ6SdKHPpXgTvbCDdBirHeGR"
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
      cacheLocation="localstorage"
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);