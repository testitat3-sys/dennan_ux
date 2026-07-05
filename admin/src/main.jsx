import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexReactClient, ConvexProvider } from "convex/react";
import './styles/tokens.css'
import './styles/Button.css'
import './styles/StaffPortal.css'
import App from './App.jsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
)

