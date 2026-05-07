import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function AuthPage() {
  const navigate = useNavigate();
  const { setShowOnboarding } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const convexUser = useQuery(api.users.viewer);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      if (convexUser === undefined) return; // Still loading user data
      
      if (convexUser && convexUser.isOnboarded) {
        console.log(`[AuthPage.jsx] User is onboarded. Redirecting to /dashboard`);
        navigate('/dashboard', { replace: true });
      } else {
        console.log(`[AuthPage.jsx] User missing details. Redirecting to /onboarding`);
        navigate('/onboarding', { replace: true });
      }
    } else {
      console.log(`[AuthPage.jsx] Not authenticated. Redirecting to home and opening OnboardingModal`);
      setShowOnboarding(true);
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, convexUser, navigate, setShowOnboarding]);

  return null;
}
