import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
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
          <Button to="/" variant="primary">Go back to the nursery</Button>
          <Button to="/category/all" variant="ghost">Browse all products</Button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

