import React, { useState } from 'react';
import './GroupGiftingModal.css';

const GroupGiftingModal = ({ item, isOpen, onClose, onConfirm }) => {
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (amount && name) {
      onConfirm(item.id, { name, amount: parseFloat(amount) });
      onClose();
    }
  };

  const totalContributed = item.contributions.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining = item.price - totalContributed;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        
        <div className="modal-header">
          <span className="label-md">Group Gifting</span>
          <h2 className="headline-md">Contribute to {item.name}</h2>
          <p className="body-sm text-secondary">Help Sarah & Mike get this item by contributing any amount.</p>
        </div>

        <div className="contribution-summary">
          <div className="summary-row">
            <span>Item Price</span>
            <span>£{item.price.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Already Contributed</span>
            <span className="text-brand">£{totalContributed.toFixed(2)}</span>
          </div>
          <div className="summary-row remaining">
            <span>Remaining</span>
            <span className="title-sm">£{remaining.toFixed(2)}</span>
          </div>
        </div>

        <div className="input-group">
          <label className="label-md">Your Name</label>
          <input 
            type="text" 
            placeholder="e.g. Grandma Betty" 
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="label-md">Contribution Amount (£)</label>
          <input 
            type="number" 
            placeholder="0.00" 
            max={remaining}
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        <button 
          className="btn-primary full-width" 
          disabled={!amount || !name}
          onClick={handleConfirm}
        >
          Confirm Contribution
        </button>

        <p className="label-md text-tertiary text-center">
          Contributions are non-refundable and will be applied directly to this item.
        </p>
      </div>
    </div>
  );
};

export default GroupGiftingModal;

