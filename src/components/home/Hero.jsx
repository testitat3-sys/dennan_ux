import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Hero.css';
import Button from '../ui/Button';
import { useUser } from '../../context/UserContext';

const heritageCards = [
  {
    icon: <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>,
    stat: '12+',
    statClass: 'orchid',
    label: 'years',
    desc: 'Supporting parents since 2013.'
  },
  {
    icon: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.9A8.38 8.38 0 0 1 4 11.3a8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>,
    stat: '1M+',
    statClass: 'plum',
    label: 'likes on tiktok',
    desc: 'Sharing moments with parents.'
  },
  {
    icon: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>,
    stat: '267k+',
    statClass: 'green',
    label: 'Parents',
    desc: 'Growing daily community.'
  }
];

const Hero = () => {
  const { user, setShowOnboarding } = useUser();
  const navigate = useNavigate();

  const handleStartJourney = (e) => {
    if (!user) {
      e.preventDefault();
      setShowOnboarding(true);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <section className="hero" aria-label="Hero">
      <div className="hero__content">
        <div className="hero__eyebrow">
          <span className="hero__eyebrow-dot"></span>
        </div>

        <h1 className="hero__headline">
          Curated essentials<br />
          for your baby's<br />
          <em>first years.</em>
        </h1>

        <p className="hero__subcopy">
          Curated checklists and essentials for expectant and new mothers — thoughtfully tiered so you always know what truly matters.
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
        
        <div className="hero__heritage">
          {heritageCards.map((card, i) => (
            <article key={i} className="heritage-mini-card">
              <div className="heritage-mini-card__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  {card.icon}
                </svg>
              </div>
              <div className={`heritage-mini-card__stat heritage-mini-card__stat--${card.statClass}`}>{card.stat}</div>
              <div className="heritage-mini-card__label">{card.label}</div>
              <p className="heritage-mini-card__desc">{card.desc}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="hero__image-wrap" aria-hidden="true">
        <div className="hero__accent"></div>
        <img src="/assets/hero.webp" alt="Premium nursery" className="hero__image-inner" />
        <div className="hero__image-tag">
          <span className="hero__image-tag-label">Trending now</span>
          <span className="hero__image-tag-value">Newborn Starter Set</span>
        </div>
      </div>
    </section>
  );
};

export default Hero;

