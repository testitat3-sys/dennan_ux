import React from 'react';
import './BrandStory.css';

const BrandStory = ({ story }) => {
  return (
    <section className="brand-story">
      <div className="brand-story__container">
        <div className="brand-story__image-column">
          <div className="brand-story__video-placeholder">
            <div className="brand-story__play-btn">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <img 
              src="https://images.unsplash.com/photo-1544126592-807daa215a05?auto=format&fit=crop&q=80&w=1200" 
              alt="Brand Story" 
              className="brand-story__img" 
            />
          </div>
        </div>
        
        <div className="brand-story__text-column">
          <span className="label-sm brand-story__eyebrow">Our Heritage</span>
          <h2 className="brand-story__title">{story.title}</h2>
          <p className="brand-story__content">{story.content}</p>
          
          <div className="brand-story__stats">
            <div className="brand-story__stat">
              <span className="brand-story__stat-value">50+</span>
              <span className="brand-story__stat-label">Years of Care</span>
            </div>
            <div className="brand-story__stat">
              <span className="brand-story__stat-value">100%</span>
              <span className="brand-story__stat-label">Safety Tested</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandStory;
