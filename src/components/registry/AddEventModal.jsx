import React, { useState, useEffect } from 'react';
import { X, Cake, Droplets, Baby, Heart, GraduationCap } from 'lucide-react';
import Button from '../ui/Button';
import './AddEventModal.css';

const EVENT_SUGGESTIONS = [
  { label: 'Birthday',    Icon: Cake },
  { label: 'Christening', Icon: Droplets },
  { label: 'Baby Shower', Icon: Baby },
  { label: 'Anniversary', Icon: Heart },
  { label: 'Graduation',  Icon: GraduationCap },
];

const AddEventModal = ({ isOpen, onClose, onConfirm }) => {
  const [value, setValue] = useState('');
  const [activeChip, setActiveChip] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Mount / animate lifecycle
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const t = setTimeout(() => setIsActive(true), 10);
      document.body.style.overflow = 'hidden';
      return () => clearTimeout(t);
    } else {
      setIsActive(false);
      const t = setTimeout(() => {
        setIsMounted(false);
        setValue('');
        setActiveChip(null);
      }, 300);
      document.body.style.overflow = '';
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isMounted) return null;

  const handleChipClick = (label) => {
    setActiveChip(label);
    setValue(label);
  };

  const handleInputChange = (e) => {
    setValue(e.target.value);
    // Deselect chip if the user types something different
    if (activeChip && e.target.value !== activeChip) {
      setActiveChip(null);
    }
  };

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div
      className={`add-event-overlay${isActive ? ' is-open' : ''}`}
      onClick={onClose}
    >
      <div
        className="add-event-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="add-event-inner">

          {/* Header */}
          <div className="add-event-top">
            <div className="add-event-titles">
              <span className="add-event-eyebrow">New Event</span>
              <h2 className="add-event-headline">What are you celebrating?</h2>
              <p className="add-event-subtext">
                Pick a suggestion or type your own event name.
              </p>
            </div>
            <button
              className="add-event-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Suggestion Chips */}
          <div className="event-chips">
            {EVENT_SUGGESTIONS.map(({ label, Icon }) => (
              <button
                key={label}
                className={`event-chip${activeChip === label ? ' is-active' : ''}`}
                onClick={() => handleChipClick(label)}
                type="button"
              >
                <Icon size={15} strokeWidth={1.8} />
                {label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="event-divider">or type your own</div>

          {/* Custom input */}
          <input
            className="event-input"
            type="text"
            placeholder="e.g. Gender Reveal, Naming Ceremony…"
            value={value}
            onChange={handleInputChange}
            autoComplete="off"
          />

          {/* CTA */}
          <div className="add-event-actions">
            <Button
              variant="primary"
              fullWidth
              disabled={!value.trim()}
              onClick={handleConfirm}
            >
              Create Registry
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AddEventModal;
