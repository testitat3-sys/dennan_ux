import React from 'react';
import ReelCard from '../ui/ReelCard';

const reels = [
  {
    image: '/assets/reel_1.png',
    label: '@dennan_curates',
    caption: 'Styling the Aurora Bedside Crib',
    badge: 'UGX 199,000 — Buy now',
    products: [{ image: '/new_assets/SnüzPod 4 Bedside Crib - White.jfif', title: 'SnüzPod 4 Bedside Crib', price: 'UGX 199,000', options: 'Color: White' }]
  },
  {
    image: '/assets/reel_2.png',
    label: '@mama_joy',
    caption: 'Everyday carry setup: Feeding edition',
    badge: 'UGX 45,000 — Buy now',
    products: [{ image: '/new_assets/Tommee Tippee Closer to Nature Starter Set.jfif', title: 'Closer to Nature Bottles', price: 'UGX 45,000' }]
  },
  {
    image: '/assets/reel_3.png',
    label: '@dennan_travel',
    caption: 'Unboxing the ProCarrier Max',
    badge: 'UGX 89,000 — Buy now',
    products: [{ image: '/new_assets/Skip Hop Forma Backpack Nappy Bag.jfif', title: 'ProCarrier Max', price: 'UGX 89,000' }]
  },
  {
    image: '/assets/reel_4.webp',
    label: '@playful_baby',
    caption: 'Desk vibes: Playroom edition',
    multiChip: '3 products',
    products: [
      { name: 'Wooden Blocks', price: '' },
      { name: 'Play Mat', price: '' },
      { name: 'Soft Toy', price: '' }
    ]
  }
];

const ReelsSection = () => {
  return (
    <section className="section reels-section" aria-labelledby="reels-heading">
      <div className="reels-section__header-row">
        <div className="section__header">
          <h2 className="section__title" id="reels-heading">Reel fans, reel vibes</h2>
          <p className="section__subtitle">Watch it, love it, buy it in one tap.</p>
        </div>
        <a href="/reels" className="reels-section__view-all">See more reels</a>
      </div>

      <div className="reels-carousel-container">
        <div className="reels-carousel">
          {reels.map((reel, i) => (
            <ReelCard key={i} reel={reel} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReelsSection;
