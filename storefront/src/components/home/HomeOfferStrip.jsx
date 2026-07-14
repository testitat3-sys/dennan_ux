import React, { useEffect, useState } from 'react';
import Button from '../ui/Button';
import './HomeOfferStrip.css';

const STORAGE_KEY = 'launchOfferCountdown';
const DURATION_MS = (7 * 3600 + 56 * 60 + 40) * 1000;

const getEndTime = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && typeof stored.endTime === 'number' && stored.endTime > Date.now()) {
      return stored.endTime;
    }
  } catch {
    // fall through to reset
  }
  const endTime = Date.now() + DURATION_MS;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ endTime }));
  return endTime;
};

const formatRemaining = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const HomeOfferStrip = () => {
  const [endTime, setEndTime] = useState(getEndTime);
  const [remainingMs, setRemainingMs] = useState(() => endTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() >= endTime) {
        const newEndTime = getEndTime();
        setEndTime(newEndTime);
        setRemainingMs(newEndTime - Date.now());
      } else {
        setRemainingMs(endTime - Date.now());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="home-offer-strip">
      <span className="home-offer-strip__text">
        Get up to UGX 190,000 off. Ends in: <span className="home-offer-strip__timer">{formatRemaining(remainingMs)}</span>
      </span>
      <Button to="/launch" variant="primary" size="sm">
        Get Discount
      </Button>
    </div>
  );
};

export default HomeOfferStrip;
