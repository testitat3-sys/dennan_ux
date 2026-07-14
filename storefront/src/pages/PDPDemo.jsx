import React, { useState } from 'react';
import Page from '../components/ui/Page';
import { sampleProduct, sampleReviews } from './pdpDemo.sampleProduct';
import PDPOptionA from './pdp-options/PDPOptionA';
import PDPOptionB from './pdp-options/PDPOptionB';
import PDPOptionC from './pdp-options/PDPOptionC';
import './PDPDemo.css';

const OPTIONS = [
  { key: 'a', label: 'Option A · Refined', component: PDPOptionA },
  { key: 'b', label: 'Option B · Editorial', component: PDPOptionB },
  { key: 'c', label: 'Option C · Conversion-focused', component: PDPOptionC },
];

// Dev-only page for comparing PDP redesign directions against one shared,
// fully-populated sample product. Not linked from production navigation.
const PDPDemo = () => {
  const [activeKey, setActiveKey] = useState('a');
  const [simulateInStock, setSimulateInStock] = useState(false);
  const ActiveComponent = OPTIONS.find((o) => o.key === activeKey).component;

  const demoProduct = simulateInStock ? { ...sampleProduct, inventory: 25 } : sampleProduct;

  return (
    <Page className="pdp-demo" noPaddingTop={false}>
      <div className="pdp-demo__switcher">
        {OPTIONS.map((option) => (
          <button
            key={option.key}
            className={`pdp-demo__tab ${activeKey === option.key ? 'is-active' : ''}`}
            onClick={() => setActiveKey(option.key)}
          >
            {option.label}
          </button>
        ))}
        <label className="pdp-demo__stock-toggle">
          <input
            type="checkbox"
            checked={simulateInStock}
            onChange={(e) => setSimulateInStock(e.target.checked)}
          />
          Simulate in stock
        </label>
      </div>

      <ActiveComponent product={demoProduct} reviews={sampleReviews} />
    </Page>
  );
};

export default PDPDemo;
