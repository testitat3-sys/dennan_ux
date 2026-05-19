import React from 'react';
import Text from '../ui/Text';
import Card from '../ui/Card';
import './BrandStory.css';

const BrandStory = ({ story = {}, banner }) => {
  if (!story || !story.title) return null;

  const imageUrl = banner || "https://images.unsplash.com/photo-1544126592-807daa215a05?auto=format&fit=crop&q=80&w=1200";

  return (
    <Card 
      variant="section"
      hasBorder={false}
      hasShadow={false}
      hasBackground={true}
      className="brand-story"
    >
      <div className="brand-story__container">
        <div className="brand-story__image-column">
          <div className="brand-story__video-placeholder">
            <div className="brand-story__play-btn">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <img 
              src={imageUrl} 
              alt={story.title || "Brand Story"} 
              className="brand-story__img" 
            />
          </div>
        </div>
        
        <div className="brand-story__text-column">
          <Text variant="label-md" className="brand-story__eyebrow">Our Heritage</Text>
          <Text variant="display-lg" as="h2" className="brand-story__title">{story.title}</Text>
          <Text variant="title-sm" as="p" className="brand-story__content">{story.content}</Text>
          
          <div className="brand-story__stats">
            <div className="brand-story__stat">
              <Text variant="headline-md" as="span" className="brand-story__stat-value">50+</Text>
              <Text variant="label-md" className="brand-story__stat-label">Years of Care</Text>
            </div>
            <div className="brand-story__stat">
              <Text variant="headline-md" as="span" className="brand-story__stat-value">100%</Text>
              <Text variant="label-md" className="brand-story__stat-label">Safety Tested</Text>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default BrandStory;

