import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MegaMenu from './MegaMenu';
import OnboardingModal from '../ui/OnboardingModal';
import CartModal from '../ui/CartModal';
import { useUser } from '../../context/UserContext';
import { useCart } from '../../context/CartContext';


const navData = [
  {
    title: 'Mother',
    type: 'mother',
    icon: <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>,
    menu: {
      featured: { image: '/assets/maternity_essentials.png', alt: 'Maternity essentials', title: 'Motherhood Lookbook', link: '/category/mother', linkText: 'View Guide' },
      columns: [
        { title: 'Comfort', links: [{ text: 'Pregnancy Pillows', href: '#' }, { text: 'Support Belts', href: '#' }, { text: 'Sleep Aids', href: '#' }, { text: 'Relaxation Kits', href: '#' }] },
        { title: 'Apparel', links: [{ text: 'Nightdresses', href: '#' }, { text: 'Nursing Pajamas', href: '#' }, { text: 'Cozy Robes', href: '#' }, { text: 'Slippers & Footwear', href: '#' }] },
        { title: 'Nursing', links: [{ text: 'Nursing Bras', href: '#' }, { text: 'Breast Pads', href: '#' }, { text: 'Nipple Care', href: '#' }, { text: 'Breast Pumps', href: '#' }] },
        { title: 'Recovery', links: [{ text: 'Postpartum Care', href: '#' }, { text: 'Soothe & Heal', href: '#' }, { text: 'Wellness', href: '#' }] }
      ]
    }
  },
  {
    title: 'Newborn',
    type: 'newborn',
    icon: <><path d="M12 21a9 9 0 0 1 0-18c4.97 0 9 3.58 9 8 0 4.42-4.03 8-9 8Z"/><path d="M8 12h.01"/><path d="M16 12h.01"/><path d="M10 16c.5 1 1.5 1 2 1s1.5 0 2-1"/></>,
    menu: {
      featured: { image: '/assets/newborn_apparel.png', alt: 'Newborn Apparel', title: 'The Newborn Starter Kit', link: '/category/newborn', linkText: 'Explore' },
      columns: [
        { title: 'Clothing', links: [{ text: 'Sleepsuits', href: '#' }, { text: 'Bodysuits', href: '#' }, { text: 'Knitted Sets', href: '#' }, { text: 'Organic Cotton', href: '#' }] },
        { title: 'Sleep', links: [{ text: 'Swaddles', href: '#' }, { text: 'Sleeping Bags', href: '#' }, { text: 'Crib Bedding', href: '#' }, { text: 'Night Lights', href: '#' }] },
        { title: 'Bath & Care', links: [{ text: 'Baby Bathtubs', href: '#' }, { text: 'Grooming Kits', href: '#' }, { text: 'Skincare', href: '#' }, { text: 'Hooded Towels', href: '#' }] },
        { title: 'Essentials', links: [{ text: 'Bottle Feeding', href: '#' }, { text: 'Changing Mats', href: '#' }, { text: 'Nappy Caddies', href: '#' }, { text: 'First Gifts', href: '#' }] }
      ]
    }
  },
  {
    title: 'Toddler',
    type: 'kid',
    icon: <><rect width="8" height="8" x="2" y="14" rx="1"/><rect width="8" height="8" x="14" y="14" rx="1"/><rect width="8" height="8" x="8" y="2" rx="1"/></>,
    menu: {
      featured: { image: '/assets/play_safety.png', alt: 'Play & Safety', title: 'Playtime Curated', link: '/category/kid', linkText: 'Shop Play' },
      columns: [
        { title: 'Play & Learn', links: [{ text: 'Activity Mats', href: '#' }, { text: 'Wooden Toys', href: '#' }, { text: 'Educational', href: '#' }, { text: 'Board Books', href: '#' }] },
        { title: 'Weaning', links: [{ text: 'High Chairs', href: '#' }, { text: 'Bowls & Plates', href: '#' }, { text: 'Baby Spoons', href: '#' }, { text: 'Food Blenders', href: '#' }] },
        { title: 'On the Move', links: [{ text: 'Strollers', href: '#' }, { text: 'Car Seats', href: '#' }, { text: 'Baby Carriers', href: '#' }, { text: 'Travel Bags', href: '#' }] },
        { title: 'Safety', links: [{ text: 'Baby Monitors', href: '#' }, { text: 'Safety Gates', href: '#' }, { text: 'Corner Protectors', href: '#' }, { text: 'Socket Plugs', href: '#' }] }
      ]
    }
  },
  {
    title: 'Brands',
    type: 'brands',
    icon: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    menu: {
      featured: { image: '/assets/hero.webp', alt: 'Most Loved Brands', title: 'Most Loved Brands', link: '#', linkText: 'View All' },
      columns: [
        { title: 'Featured', links: [{ text: 'Tommee Tippee', href: '/brand/tommee-tippee' }, { text: 'Nuby', href: '#' }, { text: 'Philips Avent', href: '#' }, { text: 'Skip Hop', href: '#' }] },
        { title: 'Nursery', links: [{ text: 'Snuz', href: '#' }, { text: 'Mamas & Papas', href: '#' }, { text: 'Silver Cross', href: '#' }, { text: 'Cybex', href: '#' }] },
        { title: 'Feeding', links: [{ text: 'Beaba', href: '#' }, { text: 'Haakaa', href: '#' }, { text: 'Medela', href: '#' }, { text: 'Stokke', href: '#' }] },
        { title: 'Explore', links: [{ text: 'New Arrivals', href: '#' }, { text: 'Brand Directory', href: '#' }, { text: 'Sustainability', href: '#' }] }
      ]
    }
  },
  {
    title: 'About Us',
    type: 'about',
    icon: <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></>,
    menu: {
      featured: { image: '/assets/hero.webp', alt: 'Our Philosophy', title: 'Our Philosophy', link: '/about', linkText: 'Read Story' },
      columns: [
        { title: 'Our Brand', links: [{ text: 'Our Story', href: '/about#story' }, { text: 'The Team', href: '/about#team' }, { text: 'Values', href: '/about#values' }] },
        { title: 'Commitment', links: [{ text: 'Safety Standards', href: '/safety' }, { text: 'Quality Guarantee', href: '/about#quality' }, { text: 'Sustainability', href: '/about#sustainability' }] },
        { title: 'Connect', links: [{ text: 'Contact Us', href: '/support' }, { text: 'FAQ', href: '/faq' }, { text: 'Wholesale', href: '/wholesale' }] }
      ]
    }
  }
];

const SEARCH_SHORTCUTS = {
  'design system': '/design-system',
  'design-system': '/design-system',
  'dashboard': '/dashboard',
  'account': '/dashboard',
  'profile': '/dashboard',
  'registry': '/registry',
  'wishlist': '/registry',
  'checkout': '/checkout',
  'pay': '/checkout',
  'mother': '/category/mother',
  'newborn': '/category/newborn',
  'toddler': '/category/kid',
  'brands': '/brands',
  'about': '/about',
};

const Navbar = () => {
  const navigate = useNavigate();
  const { user, setShowOnboarding } = useUser();
  const { setIsCartOpen, totalItems } = useCart();
  const [activeMenu, setActiveMenu] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState('main');
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showMobileSuggestions, setShowMobileSuggestions] = useState(false);
  let timeoutId = null;

  const handleAccountClick = () => {
    if (user) {
      navigate('/profile');
    } else {
      setShowOnboarding(true);
    }
  };


  const handleMouseEnter = (type) => {
    if (timeoutId) clearTimeout(timeoutId);
    setActiveMenu(type);
  };

  const handleMouseLeave = () => {
    timeoutId = setTimeout(() => {
      setActiveMenu(null);
    }, 300);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setActiveView('main');
    setMobileSearchQuery('');
    setShowMobileSuggestions(false);
  };

  const handleMobileSearch = (e) => {
    e.preventDefault();
    const query = mobileSearchQuery.toLowerCase().trim();

    if (SEARCH_SHORTCUTS[query]) {
      navigate(SEARCH_SHORTCUTS[query]);
      setIsMenuOpen(false);
      return;
    }

    if (mobileSearchQuery.trim()) {
      navigate(`/category/all?q=${encodeURIComponent(mobileSearchQuery.trim())}`);
      setIsMenuOpen(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const query = suggestion.toLowerCase().trim();
    
    if (SEARCH_SHORTCUTS[query]) {
      navigate(SEARCH_SHORTCUTS[query]);
    } else {
      navigate(`/category/all?q=${encodeURIComponent(suggestion)}`);
    }
    
    setMobileSearchQuery(suggestion);
    setShowMobileSuggestions(false);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (mobileSearchQuery.length > 1) {
      const normalizedQuery = mobileSearchQuery.toLowerCase().trim();
      
      const allLinks = navData.flatMap(item => 
        item.menu.columns.flatMap(col => col.links.map(l => l.text))
      );
      
      const shortcuts = Object.keys(SEARCH_SHORTCUTS)
        .filter(key => key.includes(normalizedQuery))
        .map(key => key.charAt(0).toUpperCase() + key.slice(1));

      const filtered = [...new Set([...shortcuts, ...allLinks])].filter(text => 
        text.toLowerCase().includes(normalizedQuery)
      ).slice(0, 5);
      
      setSearchSuggestions(filtered);
      setShowMobileSuggestions(true);
    } else {
      setSearchSuggestions([]);
      setShowMobileSuggestions(false);
    }
  }, [mobileSearchQuery]);

  const activeCategory = navData.find(item => item.type === activeView);

  return (
    <>
    <nav className="nav">
      <button 
        className="nav__mobile-menu-trigger" 
        onClick={toggleMenu}
        aria-label="Open Menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <Link to="/" className="nav__wordmark">
        <img src="/dennan_logo_2.svg" alt="Dennan Kids Logo" className="nav__logo" />
      </Link>

      <ul className="nav__links">
        {navData.map((item) => (
          <li 
            key={item.type} 
            className="nav__link-item"
            onMouseEnter={() => handleMouseEnter(item.type)}
            onMouseLeave={handleMouseLeave}
          >
            {['mother', 'newborn', 'kid'].includes(item.type) ? (
              <Link to={`/category/${item.type}`} className="nav__link-trigger">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav__link-icon">
                  {item.icon}
                </svg>
                {item.title}
              </Link>
            ) : (
              <div className="nav__link-trigger">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav__link-icon">
                  {item.icon}
                </svg>
                {item.title}
              </div>
            )}
            <MegaMenu isOpen={activeMenu === item.type} data={item.menu} categoryType={item.type} />
          </li>
        ))}
      </ul>

      <div className="nav__actions">
        <button className="nav__icon-btn" aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>
        <button 
          className="nav__icon-btn" 
          aria-label="Account"
          onClick={handleAccountClick}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={user ? "var(--color-brand-primary)" : "none"} stroke="currentColor" strokeWidth="1.8">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </button>

        <Link to="/registry" className="nav__icon-btn" aria-label="Registry">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        </Link>

        <button 
          className="nav__icon-btn nav__cart-badge" 
          aria-label="Cart"
          onClick={() => setIsCartOpen(true)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          {totalItems > 0 && <span className="cart-count-dot">{totalItems}</span>}
        </button>
      </div>
      <div className={`mobile-menu ${isMenuOpen ? 'is-open' : ''}`}>
        <div className="mobile-menu__header">
          <button 
            className="mobile-menu__profile-btn"
            onClick={() => { handleAccountClick(); setIsMenuOpen(false); }}
            aria-label="Account"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
          <button 
            className="mobile-menu__close-btn"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="mobile-menu__search">
          <form className="mobile-menu__search-form" onSubmit={handleMobileSearch}>
            <div className="mobile-menu__search-inner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mobile-menu__search-icon">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input 
                type="text" 
                placeholder="Search products, brands..." 
                className="mobile-menu__search-input"
                value={mobileSearchQuery}
                onChange={(e) => setMobileSearchQuery(e.target.value)}
                onFocus={() => mobileSearchQuery.length > 1 && setShowMobileSuggestions(true)}
              />
              {mobileSearchQuery && (
                <button 
                  type="button" 
                  className="mobile-menu__search-clear"
                  onClick={() => setMobileSearchQuery('')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
            
            {showMobileSuggestions && searchSuggestions.length > 0 && (
              <div className="mobile-menu__suggestions">
                {searchSuggestions.map((suggestion, index) => (
                  <button 
                    key={index} 
                    className="mobile-menu__suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>

        <div className="mobile-menu__pane-container" style={{ transform: activeView === 'main' ? 'translateX(0)' : 'translateX(-50%)' }}>
          {/* Main Pane */}
          <div className="mobile-menu__pane">
            <ul className="mobile-menu__list">
              {navData.map((item) => (
                <li key={item.type} className="mobile-menu__item">
                  <button 
                    className="mobile-menu__trigger"
                    onClick={() => setActiveView(item.type)}
                  >
                    <span className="mobile-menu__trigger-left">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mobile-menu__icon">
                        {item.icon}
                      </svg>
                      {item.title}
                    </span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Sub Pane */}
          <div className="mobile-menu__pane">
            {activeCategory && (
              <div className="mobile-menu__sub">
                <button 
                  className="mobile-menu__back-btn"
                  onClick={() => setActiveView('main')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  Back to Main
                </button>

                <Link 
                  to={`/category/${activeCategory.type}`} 
                  className="mobile-menu__category-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <h2 className="mobile-menu__category-title">{activeCategory.title}</h2>
                </Link>
                
                {activeCategory.menu.columns.map((col, idx) => (
                  <div key={idx} className="mobile-menu__section">
                    <h3 className="mobile-menu__section-title">{col.title}</h3>
                    <ul className="mobile-menu__sub-list">
                      {col.links.map((link, lIdx) => (
                        <li key={lIdx}>
                          <Link 
                            to={link.href === '#' && ['mother', 'newborn', 'kid'].includes(activeCategory.type) 
                              ? `/category/${activeCategory.type}?q=${encodeURIComponent(link.text)}` 
                              : link.href} 
                            className="mobile-menu__link"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {link.text}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <OnboardingModal 
        isOpen={useUser().showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />

      <CartModal />
    </nav>
    </>

  );
};

export default Navbar;

