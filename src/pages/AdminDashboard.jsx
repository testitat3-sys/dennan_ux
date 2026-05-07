import React from 'react';
import { Users, TrendingUp, DollarSign, Activity, Search, Filter } from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Users', value: '12,842', icon: <Users size={24} />, color: '#6366f1' },
    { label: 'Active Sessions', value: '1,429', icon: <Activity size={24} />, color: '#10b981' },
    { label: 'Revise Growth', value: '+14.2%', icon: <TrendingUp size={24} />, color: '#8b5cf6' },
    { label: 'Total Revenue', value: '$42,500', icon: <DollarSign size={24} />, color: '#f59e0b' },
  ];

  return (
    <div className="container" style={{ padding: 'var(--space-xl) 0' }}>
      <h1 className="title-xl text-gradient">Admin Dashboard</h1>
      
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        {stats.map((stat, i) => (
          <div key={i} className="card glass" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{ padding: 'var(--space-md)', borderRadius: '12px', background: `${stat.color}15`, color: stat.color }}>
              {stat.icon}
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{stat.label}</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="card glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: '1.25rem' }}>User Management</h2>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="input-field" placeholder="Search users..." style={{ paddingLeft: '40px', width: '240px', fontSize: '0.875rem' }} />
            </div>
            <button className="btn glass" style={{ gap: '8px', fontSize: '0.875rem' }}>
              <Filter size={16} /> Filter
            </button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th style={{ padding: '12px' }}>USER</th>
              <th style={{ padding: '12px' }}>STATUS</th>
              <th style={{ padding: '12px' }}>JOINED</th>
              <th style={{ padding: '12px' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Alice Smith', email: 'alice@example.com', status: 'Active', date: 'Oct 24, 2025' },
              { name: 'Bob Johnson', email: 'bob@example.com', status: 'Pending', date: 'Oct 25, 2025' },
              { name: 'Charlie Brown', email: 'charlie@example.com', status: 'Inactive', date: 'Oct 26, 2025' }
            ].map((user, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', height: '60px' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 600 }}>{user.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    fontSize: '0.75rem', 
                    background: user.status === 'Active' ? '#10b98120' : user.status === 'Pending' ? '#f59e0b20' : '#ef444420',
                    color: user.status === 'Active' ? '#10b981' : user.status === 'Pending' ? '#f59e0b' : '#ef4444'
                  }}>
                    {user.status}
                  </span>
                </td>
                <td style={{ padding: '12px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{user.date}</td>
                <td style={{ padding: '12px' }}>
                  <button className="btn" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
