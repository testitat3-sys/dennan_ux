import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from '../../convex/_generated/api';
import { useUser } from '../context/UserContext';
import { Loader2, Calendar, Baby, User, Sparkles, AlertCircle, Plus, Trash2 } from 'lucide-react';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Toast from '../components/ui/Toast';
import LocationModal from '../components/checkout/LocationModal';
import { getCheckoutData } from '../services/api';
import './ProfilePage.css';

export default function ProfilePage() {
  const user = useQuery(api.users.viewer);
  const updateProfileMutation = useMutation(api.users.updateProfile);
  const { updateProfile, logout } = useUser();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      console.log("[ProfilePage] Initiating sign out...");
      logout();
      await signOut();
    } catch (error) {
      console.error("Failed to sign out from Convex:", error);
    } finally {
      navigate('/');
    }
  };

  // ── Form and UI States ──────────────────────────────────────────────────────
  const [formInitialized, setFormInitialized] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('expecting');
  const [dueDate, setDueDate] = useState('');
  const [children, setChildren] = useState([{ id: Date.now(), dob: '' }]);

  // Payment and Delivery States
  const [momoPhone, setMomoPhone] = useState('');
  const [deliveryLocations, setDeliveryLocations] = useState([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocationIndex, setEditingLocationIndex] = useState(null);
  const [checkoutConfig, setCheckoutConfig] = useState(null);

  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch Delivery Zones and Landmarks for modal on mount
  useEffect(() => {
    const fetchCheckoutConfig = async () => {
      try {
        const config = await getCheckoutData();
        setCheckoutConfig(config);
      } catch (err) {
        console.error("Failed to load checkout/delivery data:", err);
      }
    };
    fetchCheckoutConfig();
  }, []);

  const normalizeUGPhone = (num) => {
    let clean = num.replace(/[^0-9+]/g, ''); // keep numbers and +
    if (clean.startsWith('+256')) {
      clean = clean.slice(4);
    } else if (clean.startsWith('256')) {
      clean = clean.slice(3);
    } else if (clean.startsWith('0')) {
      clean = clean.slice(1);
    }
    return clean;
  };

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
      setMomoPhone(user.momoPhone || '');
      setDeliveryLocations(user.deliveryLocations || []);
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

  // ── Delivery Location Handlers ─────────────────────────────────────────────
  const handleAddNewLocation = () => {
    setEditingLocationIndex(-1);
    setShowLocationModal(true);
  };

  const handleEditLocation = (idx) => {
    setEditingLocationIndex(idx);
    setShowLocationModal(true);
  };

  const handleRemoveLocation = (idx) => {
    setDeliveryLocations(deliveryLocations.filter((_, i) => i !== idx));
  };

  const handleConfirmLocation = (address) => {
    const newLoc = { name: address.name, zone: address.zone };
    if (editingLocationIndex === -1) {
      setDeliveryLocations([...deliveryLocations, newLoc]);
    } else {
      setDeliveryLocations(deliveryLocations.map((loc, idx) => idx === editingLocationIndex ? newLoc : loc));
    }
    setEditingLocationIndex(null);
    setShowLocationModal(false);
  };

  // ── Constraint Validation ──────────────────────────────────────────────────
  const validateForm = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = "Full name is required.";
    }

    if (momoPhone.trim()) {
      const cleanNum = normalizeUGPhone(momoPhone);
      const isValidUG = /^(77|78|76|70|75|74)\d{7}$/.test(cleanNum);
      if (!isValidUG) {
        errors.momoPhone = "Must start with 77, 78, 76 (MTN) or 70, 75, 74 (Airtel), followed by 7 digits.";
      }
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
      const cleanPhone = momoPhone.trim() ? normalizeUGPhone(momoPhone) : null;
      const payload = {
        name: name.trim(),
        username: username.trim() || undefined,
        role,
        dueDate: role === 'expecting' ? dueDate : undefined,
        children: role === 'parent' ? children.map(c => ({ dob: c.dob })) : undefined,
        momoPhone: cleanPhone,
        deliveryLocations,
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
        momoPhone: payload.momoPhone,
        deliveryLocations: payload.deliveryLocations,
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
    const isMomoDiff = (momoPhone.trim() ? normalizeUGPhone(momoPhone) : '') !== (user.momoPhone || '');

    let isLocationsDiff = false;
    const origLocations = user.deliveryLocations || [];
    if (deliveryLocations.length !== origLocations.length) {
      isLocationsDiff = true;
    } else {
      isLocationsDiff = deliveryLocations.some((loc, idx) => 
        loc.name !== origLocations[idx]?.name || loc.zone !== origLocations[idx]?.zone
      );
    }
    
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

    return isNameDiff || isUsernameDiff || isRoleDiff || isJourneyDiff || isMomoDiff || isLocationsDiff;
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
          
          <div className="profile-header-actions">
            <Button 
              id="profile-header-signout-btn"
              type="button" 
              variant="outline-brand" 
              onClick={handleSignOut}
              className="profile-logout-btn"
            >
              Sign Out
            </Button>
          </div>
        </header>

        {formError && (
          <div className="profile-error-banner">
            <AlertCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form-grid">
          
          {/* Section 1: Account Details */}
          <Card variant="section">
            <Card.Header>
              <h2 className="profile-card-title">Personal Identity</h2>
            </Card.Header>
            <Card.Body>
            
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
            </Card.Body>
          </Card>

          {/* Section 2: Parenting Stage Details */}
          {!user.isAdmin && (
            <Card variant="section">
              <Card.Header>
                <h2 className="profile-card-title">Parenting Journey</h2>
              </Card.Header>
              <Card.Body>
              
              {/* Stage Role Selector Tabs */}
              <div className="profile-field-group">
                <label className="profile-field-label" style={{ marginBottom: '8px' }}>Your Current Stage</label>
                <div className="profile-segment-selector">
                  <Button
                    type="button"
                    variant={role === 'expecting' ? 'segment-active' : 'segment'}
                    size="sm"
                    onClick={() => { setRole('expecting'); setValidationErrors({}); }}
                  >
                    Expecting Parent
                  </Button>
                  <Button
                    type="button"
                    variant={role === 'parent' ? 'segment-active' : 'segment'}
                    size="sm"
                    onClick={() => { setRole('parent'); setValidationErrors({}); }}
                  >
                    Parent
                  </Button>
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
                          <Button 
                            variant="remove"
                            size="sm"
                            type="button" 
                            onClick={() => removeChild(child.id)}
                            title="Remove child"
                            icon={<Trash2 size={18} />}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {children.length < 5 && (
                    <Button 
                      variant="add-dashed"
                      size="sm"
                      type="button" 
                      onClick={addChild}
                      icon={<Plus size={16} />}
                      iconPosition="left"
                    >
                      Add another child
                    </Button>
                  )}
                </div>
              )}
              </Card.Body>
            </Card>
          )}

          {/* Section 3: Saved Payment & Shipping Details */}
          {!user.isAdmin && (
            <Card variant="section">
              <Card.Header>
                <h2 className="profile-card-title">Saved Payment & Shipping</h2>
              </Card.Header>
              <Card.Body>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
                {/* Ugandan Mobile Money Number */}
                <div className="profile-field-group">
                  <label className="profile-field-label">Mobile Money Number</label>
                  <div className="profile-field-input-wrap">
                    <input 
                      type="tel" 
                      value={momoPhone} 
                      onChange={(e) => { setMomoPhone(e.target.value.replace(/[^0-9\s]/g, '')); setValidationErrors(prev => ({ ...prev, momoPhone: null })); }} 
                      placeholder="e.g. 772 123456"
                      className="profile-field-input"
                    />
                  </div>
                  {validationErrors.momoPhone ? (
                    <span className="profile-validation-error">{validationErrors.momoPhone}</span>
                  ) : (
                    <span className="profile-field-input-disabled-text">Ugandan format (starts with 77, 78, 76 or 70, 75, 74).</span>
                  )}
                </div>
              </div>

              {/* Delivery Locations */}
              <div className="profile-field-group">
                <label className="profile-field-label" style={{ marginBottom: '8px' }}>Saved Delivery Locations</label>
                
                <div className="profile-delivery-locations-list">
                  {deliveryLocations.length > 0 ? (
                    deliveryLocations.map((loc, idx) => (
                      <Card variant="default" layout="horizontal" key={idx}>
                        <Card.Body>
                          <Card.Header>
                            <h3 className="delivery-name">{loc.name}</h3>
                          </Card.Header>
                          <p className="delivery-zone">Zone: {loc.zone}</p>
                        </Card.Body>
                        <Card.Actions>
                          <Button 
                            variant="outline-brand" 
                            size="sm"
                            type="button" 
                            onClick={() => handleEditLocation(idx)}
                          >
                            Change
                          </Button>
                          <Button 
                            variant="remove"
                            size="sm"
                            type="button" 
                            onClick={() => handleRemoveLocation(idx)}
                            title="Remove location"
                            icon={<Trash2 size={16} />}
                          />
                        </Card.Actions>
                      </Card>
                    ))
                  ) : (
                    <Card variant="default">
                      <Card.Body className="delivery-empty">
                        <p>Where should we deliver your orders?</p>
                        <Button 
                          variant="soft"
                          type="button" 
                          onClick={handleAddNewLocation}
                        >
                          Select Delivery Address
                        </Button>
                      </Card.Body>
                    </Card>
                  )}
                </div>

                {deliveryLocations.length > 0 && deliveryLocations.length < 5 && (
                  <Button 
                    variant="add-dashed"
                    size="sm"
                    type="button" 
                    onClick={handleAddNewLocation}
                    style={{ width: 'fit-content' }}
                    icon={<Plus size={16} />}
                    iconPosition="left"
                  >
                    Add another location
                  </Button>
                )}
              </div>
              </Card.Body>
            </Card>
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

      <LocationModal 
        isOpen={showLocationModal} 
        onClose={() => { setShowLocationModal(false); setEditingLocationIndex(null); }}
        onConfirm={handleConfirmLocation}
        deliveryData={checkoutConfig?.delivery}
        skipConfirmation={true}
      />

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
