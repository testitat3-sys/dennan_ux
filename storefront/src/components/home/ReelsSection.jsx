import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './ReelsSection.css';

const ReelsSection = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section className="section reels-section" aria-labelledby="reels-heading">
      <div className="reels-section__header-row">
        <div className="section__header">
          <h2 className="section__title" id="reels-heading">Reel fans, reel vibes</h2>
          <p className="section__subtitle">Watch it, love it, buy it in one tap.</p>
        </div>
      </div>

      <div className="reels-single-container">
        <div className="reel-single-wrapper">
          {!isPlaying ? (
            <>
              {/* Clicking anywhere on the preview/thumbnail background links to the brand page */}
              <Link 
                to="/brand/dalin" 
                className="reel-card-preview"
                aria-label="Go to Dalin brand page"
              >
                <img 
                  src="/new_assets/dalin_thumbnail.png" 
                  alt="Dalin baby care reel thumbnail" 
                  className="reel-card-preview__image" 
                />
                <div className="reel-card-preview__overlay" />
              </Link>

              {/* Centered controls overlay (Play and Shop Dalin button) */}
              <div className="reel-center-controls">
                <button 
                  className="reel-play-button" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsPlaying(true);
                  }}
                  aria-label="Play video reel"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
                
                <Link 
                  to="/brand/dalin" 
                  className="reel-center-shop-btn"
                  aria-label="Shop Dalin"
                >
                  Shop Dalin
                </Link>
              </div>
            </>
          ) : (
            <iframe
              src="https://player.cloudinary.com/embed/?cloud_name=vjngpdmd&public_id=dalin_video_mljelx&autoplay=true"
              width="360"
              height="640" 
              style={{ height: '100%', width: '100%' }}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              frameBorder="0"
              title="Dalin video reel player"
              className="reel-player-iframe"
            ></iframe>
          )}
        </div>
      </div>
    </section>
  );
};

export default ReelsSection;
