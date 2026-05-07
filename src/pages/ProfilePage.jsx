import React from 'react';
import { User, Settings, Bell, Shield, LogOut, Loader2 } from 'lucide-react';
import { useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../convex/_generated/api';

export default function ProfilePage() {
  const user = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      console.log("[ProfilePage.jsx] Initiating logout...");
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (user === undefined) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  // If not logged in, we should probably redirect, but for now we'll show a message
  if (user === null) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
        <div className="card glass">
          <h2 className="title-xl text-gradient">Not authenticated</h2>
          <p style={{ margin: 'var(--space-md) 0' }}>Please sign in to view your profile.</p>
          <button className="btn btn-primary" onClick={() => navigate('/auth')}>Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'var(--space-xl) 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 3fr', gap: 'var(--space-xl)' }}>
        {/* Sidebar */}
        <div>
          <div className="card glass" style={{ padding: 'var(--space-md)' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', margin: '0 auto var(--space-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={40} color="white" />
              </div>
              <h3 className="text-gradient" style={{ wordBreak: 'break-word' }}>{user.name || 'Anonymous User'}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user.isAdmin ? 'Administrator' : 'Member'}</p>
            </div>
            
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button className="btn" style={{ justifyContent: 'flex-start', background: 'var(--glass-bg)', gap: '12px' }}>
                <User size={18} /> Profile
              </button>
              <button className="btn" style={{ justifyContent: 'flex-start', background: 'transparent', gap: '12px', color: 'var(--text-muted)' }}>
                <Settings size={18} /> Settings
              </button>
              <button className="btn" style={{ justifyContent: 'flex-start', background: 'transparent', gap: '12px', color: 'var(--text-muted)' }}>
                <Bell size={18} /> Notifications
              </button>
              <button 
                className="btn" 
                onClick={handleLogout}
                style={{ justifyContent: 'flex-start', background: 'transparent', gap: '12px', color: 'var(--accent-red, #ff4d4f)' }}
              >
                <LogOut size={18} /> Logout
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="card glass">
            <h2 className="title-xl text-gradient" style={{ fontSize: '1.5rem' }}>Account Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label className="input-label">Email</label>
                <div className="input-field" style={{ background: 'transparent' }}>{user.email || 'No email provided'}</div>
              </div>
              <div className="input-group">
                <label className="input-label">Role</label>
                <div className="input-field" style={{ background: 'transparent' }}>{user.isAdmin ? 'Admin' : 'Customer'}</div>
              </div>
            </div>
          </div>

          <div className="card glass">
            <h2 className="title-xl text-gradient" style={{ fontSize: '1.5rem' }}>Recent Activity</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {[1].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border-color)' }}>
                  <div className="glass" style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={20} color="var(--primary)" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600 }}>Account Active</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>You are currently signed in.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
