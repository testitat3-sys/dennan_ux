import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { UserProvider } from './context/UserContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { RegistryProvider } from './context/RegistryContext';
import './index.css'
import App from './App.jsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Log the auth code if it's present in the URL
const params = new URLSearchParams(window.location.search);
const code = params.get("code");
if (code) {
  console.log("%c[AUTH-DEBUG] Browser sending code to Convex:", "color: #4CAF50; font-weight: bold;", code);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <UserProvider>
        <CartProvider>
          <WishlistProvider>
            <RegistryProvider>
              <App />
            </RegistryProvider>
          </WishlistProvider>
        </CartProvider>
      </UserProvider>
    </ConvexAuthProvider>
  </StrictMode>,
)
