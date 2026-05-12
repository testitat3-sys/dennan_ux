import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { useUser } from '../context/UserContext';
import { Loader2, Calendar, Baby, User, Sparkles, AlertCircle, Plus, Trash2 } from 'lucide-react';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import Button from '../components/ui/Button';
import Toast from '../components/ui/Toast';
import './ProfilePage.css';

export default function ProfilePage() {
  const user = useQuery(api.users.viewer);
  const updateProfileMutation = useMutation(api.users.updateProfile);
  const { updateProfile } = useUser();
  const navigate = useNavigate();

  // ── Form and UI States ──────────────────────────────────────────────────────
  const [formInitialized, setFormInitialized] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('expecting');
  const [dueDate, setDueDate] = useState('');
  const [children, setChildren] = useState([{ id: Date.now(), dob: '' }]);

  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // ── Date Boundary Calculations ─────────────────────────────────────────────
  const today = new Date();

  const formatDateString = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Expecting bounds: min = today, max = 10 months from now
  const minDueDate = formatDateString(today);
  const maxDueDateObj = new Date();
  maxDueDateObj.setMonth(today.getMonth() + 10);
  const maxDueDate = formatDateString(maxDueDateObj);

  // Parent bounds: min = 12 years ago, max = today
  const maxDobDate = formatDateString(today);
  const minDobDateObj = new Date();
  minDobDateObj.setFullYear(today.getFullYear() - 12);
  const minDobDate = formatDateString(minDobDateObj);

  // ── Redirect Unauthenticated ────────────────────────────────────────────────
  useEffect(() => {
    if (user === null) {
      console.log("[ProfilePage] User is not authenticated. Redirecting to /auth...");
      navigate('/auth');
    }
  }, [user, navigate]);

  // ── Hydrate Form Data from Convex User ──────────────────────────────────────
  useEffect(() => {
    if (user && !formInitialized) {
      setName(user.name || '');
      setUsername(user.username || '');
      setRole(user.role || 'expecting');
      setDueDate(user.dueDate || '');
      if (user.children && user.children.length > 0) {
        setChildren(user.children.map((c, idx) => ({ id: idx, dob: c.dob })));
      } else {
        setChildren([{ id: Date.now(), dob: '' }]);
      }
      setFormInitialized(true);
    }
  }, [user, formInitialized]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (user === undefined) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  if (user === null) {
    return null; // Redirecting in useEffect
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const addChild = () => {
    if (children.length < 5) {
      setChildren([...children, { id: Date.now(), dob: '' }]);
    }
  };

  const removeChild = (id) => {
    if (children.length > 1) {
      setChildren(children.filter(c => c.id !== id));
    } else {
      setChildren([{ id: Date.now(), dob: '' }]);
    }
  };

  const updateChildDob = (id, dob) => {
    setChildren(children.map(c => c.id === id ? { ...c, dob } : c));
  };

  const getInitials = (fullName) => {
    if (!fullName) return 'DN';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // ── Constraint Validation ──────────────────────────────────────────────────
  const validateForm = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = "Full name is required.";
    }

    if (role === 'expecting') {
      if (!dueDate) {
        errors.dueDate = "Expected due date is required.";
      } else if (dueDate < minDueDate || dueDate > maxDueDate) {
        errors.dueDate = `Due date must be between today and 10 months from now (by ${new Date(maxDueDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}).`;
      }
    } else if (role === 'parent') {
      if (children.length === 0) {
        errors.childrenGeneral = "Please add at least one child's birthday.";
      } else {
        children.forEach((child, idx) => {
          if (!child.dob) {
            errors[`child_${idx}`] = "Birthday is required.";
          } else if (child.dob < minDobDate || child.dob > maxDobDate) {
            errors[`child_${idx}`] = `Birthday must be within 12 years (born after ${new Date(minDobDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}).`;
          }
        });
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFormError('');
    setValidationErrors({});

    if (!validateForm()) {
      setFormError('Please resolve the validation errors below before saving.');
      return;
    }

    setPending(true);
    try {
      const payload = {
        name: name.trim(),
        username: username.trim() || undefined,
        role,
        dueDate: role === 'expecting' ? dueDate : undefined,
        children: role === 'parent' ? children.map(c => ({ dob: c.dob })) : undefined,
      };

      console.log("[ProfilePage] Submitting update mutation:", payload);
      await updateProfileMutation(payload);

      // Sync local context state so updates propagate everywhere
      updateProfile({
        name: payload.name,
        username: payload.username,
        role: payload.role,
        dueDate: payload.dueDate,
        children: payload.children,
      });

      setToastMessage("Your profile changes have been successfully saved.");
      setShowToast(true);
    } catch (err) {
      console.error("[ProfilePage] Save failed:", err);
      setFormError("An error occurred while saving your profile details. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const hasChanges = () => {
    const isNameDiff = name.trim() !== (user.name || '');
    const isUsernameDiff = username.trim() !== (user.username || '');
    const isRoleDiff = role !== (user.role || 'expecting');
    
    let isJourneyDiff = false;
    if (role === 'expecting') {
      isJourneyDiff = dueDate !== (user.dueDate || '');
    } else {
      const originalChildren = user.children || [];
      if (children.length !== originalChildren.length) {
        isJourneyDiff = true;
      } else {
        isJourneyDiff = children.some((c, idx) => c.dob !== (originalChildren[idx]?.dob || ''));
      }
    }

    return isNameDiff || isUsernameDiff || isRoleDiff || isJourneyDiff;
  };

  return (
    <div className="dashboard-container">
      {/* Persisted Dashboard Sidebar */}
      <DashboardSidebar />

      {/* Main Form Canvas */}
      <main className="dashboard-main">
        {/* Profile Header Block */}
        <header className="profile-header-card">
          <div className="profile-avatar-circle">
            {getInitials(user.username || user.name || user.email?.split('@')[0])}
          </div>
          {(user.username || user.name || user.isAdmin) && (
            <div className="profile-header-text">
              {(user.username || user.name) && (
                <h1 className="profile-header-name">
                  {user.username || user.name}
                </h1>
              )}
              {user.isAdmin && (
                <span className="profile-header-role">
                  Administrator
                </span>
              )}
            </div>
          )}
        </header>

        {formError && (
          <div className="profile-error-banner">
            <AlertCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form-grid">
          
          {/* Section 1: Account Details */}
          <section className="profile-card">
            <h2 className="profile-card-title">Personal Identity</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
              {/* Email (Read Only) */}
              <div className="profile-field-group">
                <label className="profile-field-label">Email Address</label>
                <div className="profile-field-input-wrap">
                  <input 
                    type="email" 
                    value={user.email || 'No email associated'} 
                    disabled 
                    className="profile-field-input"
                  />
                </div>
                <span className="profile-field-input-disabled-text">Your email address cannot be changed.</span>
              </div>

              {/* Username */}
              <div className="profile-field-group">
                <label className="profile-field-label">Username</label>
                <div className="profile-field-input-wrap">
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    placeholder="e.g. mommy_care"
                    className="profile-field-input"
                  />
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div className="profile-field-group">
              <label className="profile-field-label">Full Name</label>
              <div className="profile-field-input-wrap">
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => { setName(e.target.value); setValidationErrors(prev => ({ ...prev, name: null })); }} 
                  placeholder="Enter your full name"
                  className="profile-field-input"
                />
              </div>
              {validationErrors.name && (
                <span className="profile-validation-error">{validationErrors.name}</span>
              )}
            </div>
          </section>

          {/* Section 2: Parenting Stage Details */}
          {!user.isAdmin && (
            <section className="profile-card">
              <h2 className="profile-card-title">Parenting Journey</h2>
              
              {/* Stage Role Selector Tabs */}
              <div className="profile-field-group">
                <label className="profile-field-label" style={{ marginBottom: '8px' }}>Your Current Stage</label>
                <div className="profile-segment-selector">
                  <button
                    type="button"
                    onClick={() => { setRole('expecting'); setValidationErrors({}); }}
                    className={`profile-segment-btn ${role === 'expecting' ? 'profile-segment-btn--active' : ''}`}
                  >
                    Expecting Parent
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRole('parent'); setValidationErrors({}); }}
                    className={`profile-segment-btn ${role === 'parent' ? 'profile-segment-btn--active' : ''}`}
                  >
                    Parent
                  </button>
                </div>
              </div>

              {/* Conditional Journey Details */}
              {role === 'expecting' ? (
                <div className="profile-field-group">
                  <label className="profile-field-label">Expected Due Date</label>
                  <div className="profile-field-input-wrap" style={{ maxWidth: '350px' }}>
                    <input 
                      type="date" 
                      value={dueDate} 
                      min={minDueDate}
                      max={maxDueDate}
                      onChange={(e) => { setDueDate(e.target.value); setValidationErrors(prev => ({ ...prev, dueDate: null })); }} 
                      className="profile-field-input"
                    />
                  </div>
                  {validationErrors.dueDate ? (
                    <span className="profile-validation-error">{validationErrors.dueDate}</span>
                  ) : (
                    <span className="profile-field-input-disabled-text">Helping you structure nursery milestones.</span>
                  )}
                </div>
              ) : (
                <div className="profile-field-group">
                  <label className="profile-field-label" style={{ marginBottom: '8px' }}>Children's Birthdays</label>
                  
                  {validationErrors.childrenGeneral && (
                    <div className="profile-validation-error" style={{ marginBottom: '12px' }}>{validationErrors.childrenGeneral}</div>
                  )}

                  <div className="profile-children-list">
                    {children.map((child, idx) => (
                      <div key={child.id} className="profile-child-row">
                        <div className="profile-field-group" style={{ flex: 1 }}>
                          <label className="profile-field-label" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            Child {idx + 1} Date of Birth
                          </label>
                          <input 
                            type="date" 
                            value={child.dob} 
                            min={minDobDate}
                            max={maxDobDate}
                            onChange={(e) => { updateChildDob(child.id, e.target.value); setValidationErrors(prev => ({ ...prev, [`child_${idx}`]: null, childrenGeneral: null })); }} 
                            className="profile-field-input"
                          />
                          {validationErrors[`child_${idx}`] && (
                            <span className="profile-validation-error">{validationErrors[`child_${idx}`]}</span>
                          )}
                        </div>
                        {children.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeChild(child.id)}
                            className="profile-child-remove-btn"
                            title="Remove child"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {children.length < 5 && (
                    <button 
                      type="button" 
                      onClick={addChild}
                      className="profile-child-add-btn"
                    >
                      <Plus size={16} /> Add another child
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Form Actions Section */}
          <div className="profile-action-bar">
            <Button 
              as="button" 
              type="submit" 
              variant="primary" 
              disabled={pending || !hasChanges()}
              style={{ minWidth: '180px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {pending ? (
                <>Saving Changes… <Loader2 className="animate-spin" size={16} /></>
              ) : (
                'Save Profile'
              )}
            </Button>
          </div>
        </form>
      </main>

      {/* Success Notification */}
      <Toast 
        isOpen={showToast} 
        message={toastMessage} 
        onClose={() => setShowToast(false)} 
      />

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
