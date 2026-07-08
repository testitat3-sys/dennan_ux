import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from "@convex/_generated/api";
import { Bike, Home, CheckCircle2, RotateCcw } from 'lucide-react';
import './RiderTracking.css';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Text from '../ui/Text';

const STAGES = [
  { id: 0, title: "Order Received", subtitle: "Confirmed at our warehouse" },
  { id: 1, title: "Packing", subtitle: "Checking quality of your items" },
  { id: 2, title: "On the way", subtitle: "The order is on the bike" },
  { id: 3, title: "Delivered", subtitle: "Success!" },
];

// Maps a real order status onto one of the 4 forward-progress stages. Statuses that
// aren't a forward step (failed/returned/cancelled) are handled separately by the
// caller via isTerminalIssue below, not forced onto this stepper.
function stageIndexForStatus(status) {
  switch (status) {
    case "pending_payment":
    case "preparing":
      return 0;
    case "packing":
      return 1;
    case "dispatched":
      return 2;
    case "delivered":
    case "returned":
    case "partially_returned":
      return 3;
    default:
      return 0;
  }
}

const RiderTracking = ({ orderId, location = "Kampala" }) => {
  const tracking = useQuery(
    api.orders.getOrderTrackingStatus,
    orderId ? { orderId } : "skip"
  );

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  if (tracking === undefined) {
    return (
      <Card className="rider-tracking" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
        <Card.Body align="center">
          <Text role="body-lg" color="secondary">Loading your order status...</Text>
        </Card.Body>
      </Card>
    );
  }

  const isFailed = tracking?.status === "failed" || tracking?.status === "cancelled";
  const currentStage = stageIndexForStatus(tracking?.status);

  const remainingMinutes = tracking?.expectedDeliveryTime
    ? Math.max(0, Math.round((tracking.expectedDeliveryTime - now) / 60000))
    : null;

  const rider = {
    name: tracking?.deliveryPersonName,
    phone: tracking?.riderPhone,
  };

  if (isFailed) {
    return (
      <Card className="rider-tracking" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
        <Card.Body align="center" className="tracking-issue-card">
          <RotateCcw size={32} color="var(--color-support-red, #ef4444)" />
          <Text role="headline-sm" as="h3" style={{ marginTop: 'var(--space-3)' }}>Delivery unsuccessful</Text>
          <Text role="body-md" color="secondary" style={{ marginTop: 'var(--space-2)' }}>
            We weren't able to complete this delivery. Our team will reach out to you shortly to resolve it.
          </Text>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="rider-tracking" hasBorder={false} hasShadow={false} hasBackground={false} removePadding={true}>
      <Card.Header align="center" className="tracking-header">
        <div className="countdown-container">
          {remainingMinutes !== null ? (
            <>
              <Text role="label-sm" as="span" color="brand-primary" className="countdown-label">Arriving in</Text>
              <Text role="display-lg" as="div" color="anchor" className="countdown-display pulsing">
                {remainingMinutes} <Text role="headline-sm" as="span" color="secondary" className="unit">minutes</Text>
              </Text>
            </>
          ) : (
            <Text role="headline-sm" as="div" color="anchor">
              {STAGES[currentStage]?.title}
            </Text>
          )}
          <Text role="body-sm" color="secondary" className="traffic-note">
            {currentStage >= 2 ? `On the way to ${location}` : "We'll update this as your order progresses"}
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
              {STAGES.map((stage, index) => (
                <div
                  key={stage.id}
                  className={`step-item ${index <= currentStage ? 'active' : ''} ${index === currentStage ? 'current' : ''}`}
                >
                  <div className="step-line"></div>
                  <div className="step-dot">
                    {index < currentStage && (
                      <CheckCircle2 size={12} />
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
                    <div className="marker-icon"><Bike size={18} /></div>
                    <Text role="label-sm" as="div" className="marker-label">{rider.name ? rider.name.split(' ')[0] : "Rider"}</Text>
                  </div>
                  <div className="map-marker destination">
                    <div className="marker-icon"><Home size={18} /></div>
                    <Text role="label-sm" as="div" className="marker-label">You</Text>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {currentStage >= 2 && rider.name && (
            <Card className="rider-card">
              <Card.Body style={{ padding: 0 }}>
                <div className="rider-info-grid">
                  <div className="rider-details">
                    <Text role="label-sm" as="span" color="tertiary" className="rider-label">Your Rider</Text>
                    <Text role="title-lg" as="h4" className="rider-name">{rider.name}</Text>
                  </div>
                </div>

                {rider.phone && (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => window.location.href = `tel:${rider.phone}`}
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
                    iconPosition="left"
                  >
                    Call Rider
                  </Button>
                )}

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
          )}
        </Card>
      </Card.Body>
    </Card>
  );
};

export default RiderTracking;
