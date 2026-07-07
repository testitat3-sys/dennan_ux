import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import './NotFoundPage.css';

const NotFoundPage = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`nfp ${visible ? 'nfp--visible' : ''}`}>
      {/* Decorative background blobs */}
      <div className="nfp__blob nfp__blob--1" aria-hidden="true" />
      <div className="nfp__blob nfp__blob--2" aria-hidden="true" />
      <div className="nfp__blob nfp__blob--3" aria-hidden="true" />

      <div className="nfp__content">
        {/* Giant 404 number */}
        <div className="nfp__number" aria-hidden="true">404</div>

        {/* Eyebrow tag */}
        <span className="nfp__eyebrow">Page not found</span>

        <h1 className="nfp__title">
          Oops, this little one<br />
          wandered off&hellip;
        </h1>

        <p className="nfp__description">
          The page you're looking for doesn't exist or has been moved to a new home.
          Don't worry — there's plenty to explore!
        </p>

        {/* CTA buttons */}
        <div className="nfp__actions">
          <Button to="/" variant="primary">Back to home</Button>
          <Button to="/category/all" variant="ghost">Browse all products</Button>
        </div>

        {/* Quick links */}
        <div className="nfp__quick-links">
          <span className="nfp__quick-links-label">Popular pages:</span>
          <Link to="/dashboard" className="nfp__quick-link">My Dashboard</Link>
          <span className="nfp__divider" aria-hidden="true">·</span>
          <Link to="/registry" className="nfp__quick-link">Registry</Link>
          <span className="nfp__divider" aria-hidden="true">·</span>
          <Link to="/wishlist" className="nfp__quick-link">Wishlist</Link>
          <span className="nfp__divider" aria-hidden="true">·</span>
          <Link to="/about" className="nfp__quick-link">About Us</Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
