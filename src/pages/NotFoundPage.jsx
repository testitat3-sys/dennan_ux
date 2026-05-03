import React from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.css';

const NotFoundPage = () => {
  return (
    <div className="not-found">
      <div className="not-found__content">
        <h1 className="not-found__code">404</h1>
        <h2 className="not-found__title">Oops! You've wandered off the trail.</h2>
        <p className="not-found__description">
          The page you're looking for doesn't exist or has been moved to a new home.
        </p>
        
        <div className="not-found__cta">
          <Link to="/" className="btn-primary">Go back to the nursery</Link>
          <Link to="/category/all" className="btn-ghost">Browse all products</Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

