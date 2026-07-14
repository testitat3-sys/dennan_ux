import React, { useState } from "react";
import { ChevronDown, ChevronRight, LogOut } from "lucide-react";
import sosLogo from "../assets/SOS.png";
import profileImg from "../assets/about-dennan.png";

/**
 * Shared admin/staff sidebar. Nav is organized into collapsible groups so
 * the list stays scannable as more tabs get added - the group containing
 * the active tab always starts expanded, everything else remembers the
 * user's last collapsed/expanded choice via localStorage.
 *
 * groups: [{ id, label, items: [{ key, label, icon: Component, badge, onClick, isActive }] }]
 */
export default function Sidebar({ groups, brandSub, user, onLogout, storageKey = "dennan_sidebar_collapsed" }) {
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try {
      const activeGroupId = groups.find((g) => g.items.some((i) => i.isActive))?.id;
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return new Set(stored.filter((id) => id !== activeGroupId));
    } catch {
      return new Set();
    }
  });

  const toggleGroup = (groupId) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={sosLogo} alt="Dennan" className="sidebar-logo" />
        <span className="sidebar-brand-sub">{brandSub}</span>
      </div>

      <nav className="sidebar-nav">
        {groups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.id);
          return (
            <div key={group.id} className="sidebar-nav-group">
              <button
                type="button"
                className="sidebar-nav-group-header"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={!isCollapsed}
              >
                <span className="sidebar-nav-group-label">{group.label}</span>
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
