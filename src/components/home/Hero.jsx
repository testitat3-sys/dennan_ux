import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Hero.css';
import Button from '../ui/Button';
import { useUser } from '../../context/UserContext';

const Hero = ({ content }) => {
  const { user, setShowOnboarding } = useUser();
  const navigate = useNavigate();

  if (!content) return null;

  const { headline, subcopy, backgroundImage, trending, heritageCards } = content;

  const handleStartJourney = (e) => {
    if (!user) {
      e.preventDefault();
      setShowOnboarding(true);
    } else {
      navigate('/dashboard');
    }
  };

  const getIcon = (icon) => {
    if (icon === 'instagram') {
      return <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>;
    }
    return <path d={icon} />;
  };

  return (
    <section className="hero" aria-label="Hero">
      <div className="hero__content">
        <div className="hero__eyebrow">
          <span className="hero__eyebrow-dot"></span>
        </div>

        <h1 className="hero__headline" dangerouslySetInnerHTML={{ __html: headline }}>
        </h1>

        <p className="hero__subcopy">
          {subcopy}
        </p>

        <div className="hero__actions">
          <Button onClick={handleStartJourney} variant="primary">
            Start with your stage
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Button>
          <Button as={Link} to="/category/all" variant="ghost">
            Browse all
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Button>
        </div>
      </div>

      <div className="hero__image-wrap" aria-hidden="true">
        <div className="hero__accent"></div>
        <img src={backgroundImage} alt="Premium nursery" className="hero__image-inner" />
        <div className="hero__image-tag">
          <span className="hero__image-tag-label">{trending.label}</span>
          <span className="hero__image-tag-value">{trending.value}</span>
        </div>
      </div>

      <div className="hero__heritage">
        {heritageCards.map((card, i) => (
          <article key={i} className="heritage-mini-card">
            <div className="heritage-mini-card__left">
              <div className="heritage-mini-card__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  {getIcon(card.icon)}
                </svg>
              </div>
              <div className={`heritage-mini-card__stat heritage-mini-card__stat--${card.statClass}`}>{card.stat}</div>
              <div className="heritage-mini-card__label">{card.label}</div>
            </div>
            <div className="heritage-mini-card__right">
              <p className="heritage-mini-card__desc">{card.desc}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Hero;

