import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CartProvider } from './context/CartContext'
import { UserProvider } from './context/UserContext'
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Log the auth code if it's present in the URL
const params = new URLSearchParams(window.location.search);
const code = params.get("code");
if (code) {
  console.log("%c[AUTH-DEBUG] Browser sending code to Convex:", "color: #4CAF50; font-weight: bold;", code);
}

createRoot(document.getElementById('root')).render(
  <ConvexAuthProvider client={convex}>
    <UserProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </UserProvider>
  </ConvexAuthProvider>
);

