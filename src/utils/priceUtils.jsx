import React from 'react';

/**
 * Formats a UGX price into premium JSX with smaller last three digits.
 * e.g. 150000 -> "UGX 150" with smaller "000"
 */
export const formatPrice = (priceVal) => {
  if (priceVal === null || priceVal === undefined) return '';

  // 1. Handle numeric values (from Convex backend database)
  if (typeof priceVal === 'number') {
    if (priceVal > 999) {
      const formatted = priceVal.toLocaleString(); // e.g., "150,000"
      const mainPart = formatted.slice(0, -3).replace(/,/g, ''); // "150"
      const lastThree = formatted.slice(-3).replace(/,/g, ''); // "000"
      return (
        <>
          UGX {mainPart}
          <span className="price-small-digits">{lastThree}</span>
        </>
      );
    }
    return `UGX ${priceVal}`;
  }

  // 2. Handle string values (from local JSON mock servers/mock data)
  if (typeof priceVal === 'string') {
    const isUgx = /ugx/i.test(priceVal) || /^\d[\d,]*$/.test(priceVal.trim());
    
    if (isUgx) {
      const cleanStr = priceVal.replace(/ugx/i, '').trim();
      const numVal = parseInt(cleanStr.replace(/,/g, ''), 10);
      
      if (!isNaN(numVal) && numVal > 999) {
        const formatted = numVal.toLocaleString(); // e.g., "150,000"
        const mainPart = formatted.slice(0, -3).replace(/,/g, ''); // "150"
        const lastThree = formatted.slice(-3).replace(/,/g, ''); // "000"
        return (
          <>
            UGX {mainPart}
            <span className="price-small-digits">{lastThree}</span>
          </>
        );
      }
    } else if (priceVal.includes('£')) {
      // Legacy conversion for pounds to UGX
      const cleanStr = priceVal.replace(/£/g, '').trim();
      const numVal = parseFloat(cleanStr.replace(/,/g, ''));
      if (!isNaN(numVal)) {
        const ugxVal = Math.round(numVal * 4800);
        return formatPrice(ugxVal);
      }
    }
    return priceVal; // Fallback for other strings
  }

  return priceVal;
};

/**
 * Formats a price into a simple, plain string format (e.g. "UGX 150,000").
 */
export const formatPriceString = (priceVal) => {
  if (priceVal === null || priceVal === undefined) return '';
  if (typeof priceVal === 'number') {
    return `UGX ${priceVal.toLocaleString()}`;
  }
  if (typeof priceVal === 'string') {
    if (/ugx/i.test(priceVal)) return priceVal;
    const cleanStr = priceVal.replace(/£/g, '').trim();
    const numVal = parseFloat(cleanStr.replace(/,/g, ''));
    if (!isNaN(numVal)) {
      if (priceVal.includes('£')) {
        return `UGX ${Math.round(numVal * 4800).toLocaleString()}`;
      }
      return `UGX ${numVal.toLocaleString()}`;
    }
    return priceVal;
  }
  return String(priceVal);
};
