import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('dennan_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (user) {
      console.log(`[UserContext.jsx] Local user session active:`, user.email || user);
      localStorage.setItem('dennan_user', JSON.stringify(user));
    } else {
      console.log(`[UserContext.jsx] Local user session cleared.`);
      localStorage.removeItem('dennan_user');
    }
  }, [user]);

  const login = (userData) => {
    console.log(`[UserContext.jsx] User logged in successfully:`, userData.email || userData);
    setUser(userData);
  };

  const logout = () => {
    console.log(`[UserContext.jsx] User logged out locally.`);
    setUser(null);
  };

  const updateProfile = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  // Helper to calculate current stage info
  const getStageInfo = () => {
    if (!user) return null;

    const today = new Date();
    
    if (user.role === 'expecting' && user.dueDate) {
      const due = new Date(user.dueDate);
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const weeksToDue = Math.ceil(diffDays / 7);
      const currentWeek = 40 - weeksToDue;
      
      return {
        type: 'expecting',
        display: `${currentWeek} Weeks Pregnant`,
        progress: (currentWeek / 40) * 100,
        week: currentWeek,
        stageId: 'mother'
      };
    }

    if (user.role === 'parent' && user.children && user.children.length > 0) {
      // Use the youngest child for the main dashboard focus
      const birthdays = user.children.map(c => new Date(c.dob));
      const youngest = new Date(Math.max(...birthdays));
      
      const diffTime = today - youngest;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const monthsOld = Math.floor(diffDays / 30.44); // Average month length
      
      let stageId = 'newborn';
      if (monthsOld >= 6) stageId = 'kid';

      return {
        type: 'parent',
        display: monthsOld < 1 ? 'Newborn' : `${monthsOld} Months Old`,
        progress: Math.min((monthsOld / 24) * 100, 100), // Milestone up to 2 years
        months: monthsOld,
        stageId: stageId
      };
    }

    return null;
  };

  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <UserContext.Provider value={{ 
      user, 
      login, 
      logout, 
      updateProfile, 
      getStageInfo,
      showOnboarding,
      setShowOnboarding
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

