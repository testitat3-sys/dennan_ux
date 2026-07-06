import React from 'react';
import PLPSkeleton from './PLPSkeleton';
import './BrandPageSkeleton.css';

const BrandPageSkeleton = () => {
  // BrandPage layout is now identical to PLP, so we can simply render PLPSkeleton 
  // with a class scope or custom overrides if needed in the future.
  return (
    <div className="brand-page-skel">
      <PLPSkeleton />
    </div>
  );
};

export default BrandPageSkeleton;
