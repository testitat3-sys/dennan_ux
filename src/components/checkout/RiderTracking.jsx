import React, { useState, useEffect } from 'react';
import './RiderTracking.css';

const RiderTracking = ({ initialETA = 18, location = "Kampala" }) => {
  const [remainingTime, setRemainingTime] = useState(initialETA);
  const [currentStage, setCurrentStage] = useState(2); // Mock: Starting at "Rider Dispatched"

  const stages = [
    { id: 0, title: "Order Received", subtitle: "Confirmed at our warehouse" },
    { id: 1, title: "Packing your Gear", subtitle: "Checking quality of your items" },
    { id: 2, title: "Rider Dispatched", subtitle: "The order is on the bike" },
    { id: 3, title: "Nearby", subtitle: "Rider is within 2–5km of you" },
    { id: 4, title: "Delivered", subtitle: "Success!" }
  ];

  // Mock countdown and stage progression
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          if (currentStage < stages.length - 1) {
            setCurrentStage(prevStage => prevStage + 1);
            return 8; // Reset timer for next stage mock
          }
          return 0;
        }
        return prev - 1;
      });
    }, 10000); // 10 seconds for demo purposes

    return () => clearInterval(timer);
  }, [currentStage]);

  return (
    <div className="rider-tracking">
      <div className="tracking-header">
        <div className="countdown-container">
          <span className="countdown-label">Arriving in</span>
          <div className="countdown-display pulsing">
            {remainingTime} <span className="unit">minutes</span>
          </div>
          <p className="traffic-note">
            {remainingTime > 15 ? "Heavy traffic near Northern Bypass" : "Roads are clear, making good progress"}
          </p>
        </div>
      </div>

      <div className="tracking-body">
        <div className="roadmap-section">
          <h3 className="roadmap-title">Delivery Progress</h3>
          <div className="vertical-stepper">
            {stages.map((stage, index) => (
              <div 
                key={stage.id} 
                className={`step-item ${index <= currentStage ? 'active' : ''} ${index === currentStage ? 'current' : ''}`}
                onClick={() => setCurrentStage(index)}
                style={{ cursor: 'pointer' }}
              >
                <div className="step-line"></div>
                <div className="step-dot">
                  {index < currentStage && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="step-content">
                  <span className="step-title">{stage.title}</span>
                  <span className="step-subtitle">{stage.subtitle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rider-profile-section">
          {currentStage >= 2 && (
            <div className="map-widget-container">
              <div className="map-badge"></div>
              <div className="tracking-map">
                <div className="map-canvas">
                  <div className="map-route-line"></div>
                  <div className="map-marker rider pulse">
                    <div className="marker-icon">🏍️</div>
                    <div className="marker-label">Moses</div>
                  </div>
                  <div className="map-marker destination">
                    <div className="marker-icon">🏠</div>
                    <div className="marker-label">You</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rider-card">
            <div className="rider-info-grid">
              <div className="rider-photo-wrapper">
                <img src="/assets/rider_moses.png" alt="Rider Moses" className="rider-photo" />
                <div className="rider-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                  4.9
                </div>
              </div>
              <div className="rider-details">
                <span className="rider-label">Your Rider</span>
                <h4 className="rider-name">Moses K.</h4>
                <p className="rider-meta">On a Yamaha FZ (UFE 452C)</p>
              </div>
            </div>

            <button className="btn-call-rider" onClick={() => window.location.href = 'tel:+256700000000'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Call Rider
            </button>

            <div className="safety-note">
              <div className="safety-icon">i</div>
              <p>For your safety, please ensure the rider is wearing the Dennan uniform/badge.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderTracking;

