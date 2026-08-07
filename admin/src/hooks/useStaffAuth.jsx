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
      const cleanEmail = (email || "").trim().toLowerCase();
      const result = await loginMutation({ email: cleanEmail, password });
      if (result && result.token) {
        localStorage.setItem("staffToken", result.token);
        setToken(result.token);
        setUser(result.user);
        return { success: true, user: result.user };
      }
      return { success: false, error: "Invalid email or password. Please check your credentials." };
    } catch (err) {
      console.error("[useStaffAuth] Login error:", err);
      let errorMessage = err?.data || err?.message || "";
      if (typeof errorMessage !== "string") {
        errorMessage = err?.message || "";
      }
      if (errorMessage.includes("Uncaught Error:")) {
        errorMessage = errorMessage.split("Uncaught Error:")[1];
      }
      if (errorMessage.includes("Error:")) {
        errorMessage = errorMessage.split("Error:")[1];
      }
      errorMessage = errorMessage.split("\n")[0].trim();

      if (!errorMessage || errorMessage.toLowerCase().includes("server error")) {
        errorMessage = "Invalid email or password. Please check your credentials.";
      }
      return { success: false, error: errorMessage };
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
