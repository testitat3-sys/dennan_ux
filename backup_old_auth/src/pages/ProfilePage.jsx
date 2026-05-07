import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.viewer);

  useEffect(() => {
    if (user === null) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (user === undefined) return <div className="profile-loading">Loading...</div>;
  if (user === null) return null;

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            {user.name ? user.name.charAt(0) : 'U'}
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{user.name || 'User'}</h1>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>

        <div className="profile-details">
          <div className="detail-item">
            <span className="detail-label">Username</span>
            <span className="detail-value">@{user.username || 'not set'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Journey Phase</span>
            <span className="detail-value">{user.role === 'expecting' ? 'Expecting' : 'Parent'}</span>
          </div>
          {user.role === 'expecting' && (
            <div className="detail-item">
              <span className="detail-label">Due Date</span>
              <span className="detail-value">{user.dueDate}</span>
            </div>
          )}
        </div>

        <div className="profile-actions">
          <button className="btn-sign-out" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
