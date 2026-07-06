import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

const StaffAuthContext = createContext(null);

export function StaffAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("staffToken") || "");
  const [user, setUser] = useState(null);
  
  // Call verifyToken query reactively
  const verifyTokenResult = useQuery(api.staffAuth.verifyToken, { token: token || "" });
  
  const loginMutation = useMutation(api.staffAuth.login);
  const logoutMutation = useMutation(api.staffAuth.logout);

  // Sync query results to user state
  useEffect(() => {
    if (token === "") {
      setUser(null);
      return;
    }
    if (verifyTokenResult !== undefined) {
      setUser(verifyTokenResult);
    }
  }, [verifyTokenResult, token]);

  const login = async (email, password) => {
    try {
      const result = await loginMutation({ email, password });
      if (result && result.token) {
        localStorage.setItem("staffToken", result.token);
        setToken(result.token);
        setUser(result.user);
        return { success: true, user: result.user };
      }
      return { success: false, error: "Authentication failed" };
    } catch (err) {
      console.error("[useStaffAuth] Login error:", err);
      return { success: false, error: err.message || "Invalid credentials" };
    }
  };

  const logout = async () => {
    // Clear local session immediately so user is signed out instantly
    localStorage.removeItem("staffToken");
    setToken("");
    setUser(null);

    try {
      if (token) {
        await logoutMutation({ token });
      }
    } catch (err) {
      console.error("[useStaffAuth] Logout mutation error:", err);
    }
  };

  // isLoading is true only when we have a token but verifyTokenResult is still in-flight (undefined)
  const isLoading = token !== "" && verifyTokenResult === undefined;

  return (
    <StaffAuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);
  if (!context) {
    throw new Error("useStaffAuth must be used within a StaffAuthProvider");
  }
  return context;
}
