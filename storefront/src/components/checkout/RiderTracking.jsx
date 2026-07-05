import React, { useState, useEffect } from 'react';
import './RiderTracking.css';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Text from '../ui/Text';

const RiderTracking = ({ initialETA = 18, location = "Kampala", trackingData = null }) => {
  const [remainingTime, setRemainingTime] = useState(initialETA);
  const [currentStage, setCurrentStage] = useState(2); // Mock: Starting at "Rider Dispatched"

  const stages = trackingData?.stages || [
    { id: 0, title: "Order Received", subtitle: "Confirmed at our warehouse" },
    { id: 1, title: "Packing your Gear", subtitle: "Checking quality of your items" },
    { id: 2, title: "Rider Dispatched", subtitle: "The order is on the bike" },
    { id: 3, title: "Nearby", subtitle: "Rider is within 2–5km of you" },
    { id: 4, title: "Delivered", subtitle: "Success!" }
  ];
  
  const rider = trackingData?.rider || {
    name: "Moses K.",
    photo: "/assets/rider_moses.png",
    bike: "Yamaha FZ (UFE 452C)",
    rating: 4.9,
    phone: "+256700000000"
  };

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
    <Card className="rider-tracking" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
      <Card.Header align="center" className="tracking-header">
        <div className="countdown-container">
          <Text role="label-sm" as="span" color="brand-primary" className="countdown-label">Arriving in</Text>
          <Text role="display-lg" as="div" color="anchor" className="countdown-display pulsing">
            {remainingTime} <Text role="headline-sm" as="span" color="secondary" className="unit">minutes</Text>
          </Text>
          <Text role="body-sm" color="secondary" className="traffic-note">
            {remainingTime > 15 ? "Heavy traffic near Northern Bypass" : "Roads are clear, making good progress"}
          </Text>
        </div>
      </Card.Header>

      <Card.Body className="tracking-body" style={{ padding: 0 }}>
        <Card className="roadmap-section" variant="section">
          <Card.Header>
            <Text role="headline-sm" as="h3" className="roadmap-title">Delivery Progress</Text>
          </Card.Header>
          <Card.Body style={{ padding: 0 }}>
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
                    <Text role="body-lg" as="span" color={index === currentStage ? "primary" : "tertiary"} className="step-title">{stage.title}</Text>
                    <Text role="body-sm" as="span" color={index === currentStage ? "secondary" : "tertiary"} className="step-subtitle">{stage.subtitle}</Text>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>

        <Card hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {currentStage >= 2 && (
            <Card className="map-widget-container" removePadding={true}>
              <div className="map-badge"></div>
              <div className="tracking-map">
                <div className="map-canvas">
                  <div className="map-route-line"></div>
                  <div className="map-marker rider pulse">
                    <div className="marker-icon">🏍️</div>
                    <Text role="label-sm" as="div" className="marker-label">{rider.name.split(' ')[0]}</Text>
                  </div>
                  <div className="map-marker destination">
                    <div className="marker-icon">🏠</div>
                    <Text role="label-sm" as="div" className="marker-label">You</Text>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="rider-card">
            <Card.Body style={{ padding: 0 }}>
              <div className="rider-info-grid">
                <div className="rider-photo-wrapper">
                  <img src={rider.photo} alt={`Rider ${rider.name}`} className="rider-photo" />
                  <div className="rider-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                    <Text role="label-sm" as="span" color="white">{rider.rating}</Text>
                  </div>
                </div>
                <div className="rider-details">
                  <Text role="label-sm" as="span" color="tertiary" className="rider-label">Your Rider</Text>
                  <Text role="title-lg" as="h4" className="rider-name">{rider.name}</Text>
                  <Text role="body-sm" as="p" color="secondary" className="rider-meta">On a {rider.bike}</Text>
                </div>
              </div>

              <Button 
                variant="secondary"
                fullWidth
                onClick={() => window.location.href = `tel:${rider.phone}`}
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
                iconPosition="left"
              >
                Call Rider
              </Button>

              <div className="safety-note">
                <div className="safety-icon">
                  <Text role="label-sm" as="span" color="white">i</Text>
                </div>
                <Text role="body-sm" color="brand-primary-dark">
                  For your safety, please ensure the rider is wearing the Dennan uniform/badge.
                </Text>
              </div>
            </Card.Body>
          </Card>
        </Card>
      </Card.Body>
    </Card>
  );
};

export default RiderTracking;

