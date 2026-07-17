import React, { useState } from "react";
import { ChevronDown, ChevronRight, LogOut } from "lucide-react";
import sosLogo from "../assets/SOS.png";
import profileImg from "../assets/about-dennan.png";

/**
 * Shared admin/staff sidebar. Nav is organized into collapsible groups,
 * accordion-style — opening one group closes any other that's open. The
 * group containing the active tab starts open; otherwise the last-opened
 * group is remembered via localStorage.
 *
 * groups: [{ id, label, items: [{ key, label, icon: Component, badge, onClick, isActive }] }]
 */
export default function Sidebar({ groups, user, onLogout, storageKey = "dennan_sidebar_collapsed" }) {
  const [openGroupId, setOpenGroupId] = useState(() => {
    const activeGroupId = groups.find((g) => g.items.some((i) => i.isActive))?.id;
    if (activeGroupId) return activeGroupId;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored || null;
    } catch {
      return null;
    }
  });

  const toggleGroup = (groupId) => {
    setOpenGroupId((prev) => {
      const next = prev === groupId ? null : groupId;
      localStorage.setItem(storageKey, next || "");
      return next;
    });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={sosLogo} alt="Dennan" className="sidebar-logo" />
      </div>

      <nav className="sidebar-nav">
        {groups.map((group) => {
          const isCollapsed = group.id !== openGroupId;
          const groupBadgeTotal = group.items.reduce((sum, i) => sum + (i.badge > 0 ? i.badge : 0), 0);
          return (
            <div key={group.id} className="sidebar-nav-group">
              <button
                type="button"
                className="sidebar-nav-group-header"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={!isCollapsed}
              >
                <span className="sidebar-nav-group-label-wrap">
                  <span className="sidebar-nav-group-label">{group.label}</span>
                  {isCollapsed && groupBadgeTotal > 0 && (
                    <span className="sidebar-nav-badge sidebar-nav-badge--group">{groupBadgeTotal}</span>
                  )}
                </span>
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
              {!isCollapsed && (
                <div className="sidebar-nav-group-items">
                  {group.items.map((item) => (
                    <button
                      key={item.key}
                      className={`sidebar-nav-item ${item.isActive ? "is-active" : ""}`}
                      onClick={item.onClick}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                      {item.badge > 0 && (
                        <span className="sidebar-nav-badge">{item.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">
            <img src={profileImg} alt={user?.name || "Profile"} className="avatar-img" />
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-role">{user?.accountRole?.toUpperCase()}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout} type="button">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
