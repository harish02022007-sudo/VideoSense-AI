import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("videosense_auth_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("videosense_auth_token") || null;
    } catch (e) {
      return null;
    }
  });

  const [refreshToken, setRefreshToken] = useState(() => {
    try {
      return localStorage.getItem("videosense_refresh_token") || null;
    } catch (e) {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  // Synchronize authentication session with backend on initial load
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem("videosense_auth_token");
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      try {
        const userProfile = await api.auth.getMe();
        setUser(userProfile);
        localStorage.setItem("videosense_auth_user", JSON.stringify(userProfile));
      } catch (err) {
        // If access token expired, try refreshing
        const storedRefreshToken = localStorage.getItem("videosense_refresh_token");
        if (storedRefreshToken) {
          try {
            const tokenData = await api.auth.refreshToken(storedRefreshToken);
            setToken(tokenData.access_token);
            setRefreshToken(tokenData.refresh_token);
            localStorage.setItem("videosense_auth_token", tokenData.access_token);
            localStorage.setItem("videosense_refresh_token", tokenData.refresh_token);
            const userProfile = await api.auth.getMe();
            setUser(userProfile);
            localStorage.setItem("videosense_auth_user", JSON.stringify(userProfile));
            setIsLoading(false);
            return;
          } catch (refreshErr) {
            // Refresh failed, clear session
            clearAuthData();
          }
        } else {
          clearAuthData();
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, []);

  const clearAuthData = useCallback(() => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    try {
      localStorage.removeItem("videosense_auth_token");
      localStorage.removeItem("videosense_refresh_token");
      localStorage.removeItem("videosense_auth_user");
      localStorage.removeItem("videosense_unread_count");
      localStorage.removeItem("videosense_notifications_v3");
      localStorage.removeItem("videosense_notif_prefs");
      localStorage.removeItem("videosense_selected_video");
      localStorage.removeItem("videosense_active_video");
      sessionStorage.clear();
    } catch (e) {}
  }, []);

  const saveAuthSession = useCallback((authData) => {
    const { user: userData, tokens } = authData;

    // Purge any stale cache from a previous user session
    try {
      localStorage.removeItem("videosense_unread_count");
      localStorage.removeItem("videosense_notifications_v3");
      localStorage.removeItem("videosense_selected_video");
      localStorage.removeItem("videosense_active_video");
    } catch (e) {}

    setUser(userData);
    setToken(tokens.access_token);
    setRefreshToken(tokens.refresh_token);

    try {
      localStorage.setItem("videosense_auth_token", tokens.access_token);
      localStorage.setItem("videosense_refresh_token", tokens.refresh_token);
      localStorage.setItem("videosense_auth_user", JSON.stringify(userData));
    } catch (e) {}
  }, []);

  const login = async (identifier, password, rememberMe = false) => {
    const response = await api.auth.login(identifier, password, rememberMe);
    if (response.data) {
      saveAuthSession(response.data);
    }
    return response;
  };

  const register = async (userData) => {
    const response = await api.auth.register(userData);
    return response;
  };

  const verifyEmail = async (email, otpCode) => {
    const response = await api.auth.verifyEmail(email, otpCode);
    if (response.data) {
      saveAuthSession(response.data);
    }
    return response;
  };

  const resendEmailOTP = async (email) => {
    return await api.auth.resendEmailOTP(email);
  };

  const forgotPassword = async (email) => {
    return await api.auth.forgotPassword(email);
  };

  const resetPassword = async (payload) => {
    return await api.auth.resetPassword(payload);
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    return await api.auth.changePassword(currentPassword, newPassword, confirmPassword);
  };

  const logout = async () => {
    try {
      if (token) {
        await api.auth.logout();
      }
    } catch (e) {
      // Best-effort logout on server
    } finally {
      clearAuthData();
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedFields };
      try {
        localStorage.setItem("videosense_auth_user", JSON.stringify(merged));
      } catch (e) {}
      return merged;
    });
  };

  const value = {
    user,
    token,
    refreshToken,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    verifyEmail,
    resendEmailOTP,
    forgotPassword,
    resetPassword,
    changePassword,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;

