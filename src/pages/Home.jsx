import React, { useEffect, useState } from 'react';
import Hero from '../components/home/Hero';
import SearchStrip from '../components/home/SearchStrip';
import BrandsBanner from '../components/home/BrandsBanner';
import ProductSection from '../components/home/ProductSection';
import JourneySection from '../components/home/JourneySection';
import TierSection from '../components/home/TierSection';
import ReelsSection from '../components/home/ReelsSection';
import TrustStrip from '../components/home/TrustStrip';
import QuickViewModal from '../components/ui/QuickViewModal';
import Toast from '../components/ui/Toast';

const mostLovedProducts = [
  {
    image: '/new_assets/Tommee Tippee Closer to Nature Starter Set.jfif',
    name: 'Closer to Nature Baby Bottles',
    price: '£18.99',
    wasPrice: '£24.99',
    tier: 'Essentials',
    tags: [{ type: 'primary', text: '1k + sold' }, { type: 'accent', text: '25% OFF' }]
  },
  {
    image: '/new_assets/SnüzPod 4 Bedside Crib - White.jfif',
    name: 'SnüzPod 4 Bedside Crib - White',
    price: '£199.00',
    tier: 'Must-Haves',
    tags: [{ type: 'primary', text: 'Highly Rated' }]
  },
  {
    image: '/assets/skip_hop_bath_set.jpg',
    name: 'Skip Hop Moby Bath Set',
    price: '£45.00',
    tier: 'Essentials',
    tags: [{ type: 'primary', text: '500+ sold' }, { type: 'accent', text: 'BUNDLE DEAL' }]
  },
  {
    image: '/new_assets/BÉABA Babycook Solo.jfif',
    name: 'BÉABA Babycook Solo',
    price: '£120.00',
    tier: 'Luxuries',
    tags: [{ type: 'primary', text: 'Best of 2025' }]
  },
  {
    image: '/new_assets/Organic Cotton Starter Set.jfif',
    name: 'Organic Cotton Starter Set',
    price: '£65.00',
    tier: 'Essentials',
    tags: [{ type: 'primary', text: 'Community Pick' }]
  }
];

const curatedProducts = [
  {
    variant: 'p1',
    image: '/new_assets/Tommee Tippee Closer to Nature Starter Set.jfif',
    name: 'Tommee Tippee Closer to Nature Starter Set',
    price: '£44.99',
    wasPrice: '£59.99',
    tier: 'Essentials',
    badge: 'Essential'
  },
  {
    variant: 'p2',
    image: '/new_assets/SnüzPod 4 Bedside Crib - White.jfif',
    name: 'SnüzPod 4 Bedside Crib',
    price: '£229.00',
    tier: 'Must-Have',
    badge: 'Must-Have'
  },
  {
    variant: 'p3',
    image: '/new_assets/Skip Hop Forma Backpack Nappy Bag.jfif',
    name: 'Skip Hop Forma Backpack Nappy Bag',
    price: '£89.00',
    tier: 'Essentials',
    badge: 'Essential'
  },
  {
    variant: 'p4',
    image: '/new_assets/BÉABA Babycook Neo Food Blender.jfif',
    name: 'BÉABA Babycook Neo Food Blender',
    price: '£149.99',
    wasPrice: '£179.99',
    tier: 'Luxuries',
    badge: 'Luxury'
  }
];

const Home = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleAddToCart = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (product) => {
    setToastMessage(`${product.name} added to cart`);
    setShowToast(true);
  };
  useEffect(() => {
    // Stagger-in observer for below-fold sections
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.stagger-target').forEach((el, i) => {
            el.style.animationDelay = (i * 0.08) + 's';
            el.classList.add('stagger-in');
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.tier-grid, .journey-grid, .product-grid, .product-scroll').forEach((grid) => {
      Array.from(grid.children).forEach((child) => child.classList.add('stagger-target'));
      observer.observe(grid);
    });
  }, []);

  return (
    <>
      <Hero />
      <SearchStrip />
      <BrandsBanner />
      
      <ProductSection 
        title="Most Loved by Parents"
        eyebrow="Performance Picks"
        products={mostLovedProducts}
        viewAllLink="/category"
        viewAllText="View most loved"
        isScroll={true}
        onAddToCart={handleAddToCart}
      />
      
      <JourneySection />
      <TierSection />
      
      <ProductSection 
        title="Curated picks for your journey"
        eyebrow="AI-curated picks"
        products={curatedProducts}
        viewAllLink="/category"
        viewAllText="View all"
        onAddToCart={handleAddToCart}
      />
      
      <ReelsSection />
      <TrustStrip />

      {selectedProduct && (
        <QuickViewModal 
          product={selectedProduct} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={handleModalSuccess}
        />
      )}

      <Toast 
        isOpen={showToast} 
        message={toastMessage} 
        onClose={() => setShowToast(false)} 
      />
    </>
  );
};

export default Home;
