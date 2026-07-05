import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import './ComingSoonPage.css';

const ComingSoonPage = () => {
  return (
    <div className="coming-soon">
      <div className="coming-soon__content">
        <div className="coming-soon__badge">In Development</div>
        <h1 className="coming-soon__title">Something beautiful is arriving soon.</h1>
        <p className="coming-soon__description">
          We're currently crafting an editorial experience for this section to help you navigate your parenting journey with even more clarity.
        </p>
        
        <div className="coming-soon__cta">
          <Button to="/" variant="primary">Return Home</Button>
          <Button variant="ghost">Notify Me</Button>
        </div>

        <div className="coming-soon__visual">
          <div className="coming-soon__circle coming-soon__circle--1"></div>
          <div className="coming-soon__circle coming-soon__circle--2"></div>
          <div className="coming-soon__circle coming-soon__circle--3"></div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;

