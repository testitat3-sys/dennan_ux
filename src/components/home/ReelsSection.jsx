import React from 'react';
import './ReelsSection.css';
import ReelCard from '../ui/ReelCard';

const ReelsSection = ({ reels }) => {
  if (!reels) return null;

  return (
    <section className="section reels-section" aria-labelledby="reels-heading">
      <div className="reels-section__header-row">
        <div className="section__header">
          <h2 className="section__title" id="reels-heading">Reel fans, reel vibes</h2>
          <p className="section__subtitle">Watch it, love it, buy it in one tap.</p>
        </div>
        <a href="/reels" className="reels-section__view-all">See more reels</a>
      </div>

      <div className="reels-carousel-container">
        <div className="reels-carousel">
          {reels.map((reel, i) => (
            <ReelCard key={i} reel={reel} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReelsSection;

