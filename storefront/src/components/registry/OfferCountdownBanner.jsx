import React, { useEffect, useState } from 'react';
import './OfferCountdownBanner.css';

const STORAGE_KEY = 'launchOfferCountdown';
const DURATION_MS = (7 * 3600 + 56 * 60 + 40) * 1000;

const getTodayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
};

const getEndTime = () => {
  const today = getTodayKey();
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && stored.date === today && typeof stored.endTime === 'number') {
      return stored.endTime;
    }
  } catch {
    // fall through to reset
  }
  const endTime = Date.now() + DURATION_MS;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, endTime }));
  return endTime;
};

const formatRemaining = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const OfferCountdownBanner = () => {
  const [endTime, setEndTime] = useState(getEndTime);
  const [remainingMs, setRemainingMs] = useState(() => endTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const today = getTodayKey();
      let stored = null;
      try {
        stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      } catch {
        // ignore
      }
      if (!stored || stored.date !== today) {
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
    <div className="offer-countdown-banner">
      Offer ends in: <span className="offer-countdown-banner__timer">{formatRemaining(remainingMs)}</span>
    </div>
  );
};

export default OfferCountdownBanner;
