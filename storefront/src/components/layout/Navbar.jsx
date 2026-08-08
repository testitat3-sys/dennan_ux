import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import MegaMenu from './MegaMenu';
import OnboardingModal from '../ui/OnboardingModal';
import CartModal from '../products/CartModal';
import { useUser } from '../../context/UserContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import Button from '../ui/Button';
import { REAL_BRANDS } from '../../constants/brandsData';
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from '../../hooks/useTrackedQuery';
import { getProductSearchSuggestions } from '../../utils/productSearch';

// Partition REAL_BRANDS dynamically
const discountedBrands = REAL_BRANDS.filter(b => b.maxDiscount > 0).map(b => ({
  text: b.name,
  href: `/brand/${b.id}`
}));

const popularBrands = REAL_BRANDS.filter(b => b.maxDiscount === 0 && b.count >= 4).map(b => ({
  text: b.name,
  href: `/brand/${b.id}`
}));

const exploreBrands = REAL_BRANDS.filter(b => b.maxDiscount === 0 && b.count < 4).map(b => ({
  text: b.name,
  href: `/brand/${b.id}`
}));

// Resolve new link pathing to search-empty state
export const resolveNavLink = (link) => {
  if (link.href === '#') {
    return `/category/all?q=${encodeURIComponent(link.text)}`;
  }
  return link.href;
};

const navData = [
  {
    title: 'Mother',
    type: 'mother',
    icon: <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>,
    menu: {
      featured: { image: '/assets/maternity_essentials.webp', alt: 'Maternity essentials', title: 'Motherhood Lookbook', link: '/category/mother', linkText: 'View Guide' },
      columns: [
        { title: 'Comfort', links: [{ text: 'Pregnancy Pillows', href: '#' }, { text: 'Support Belts', href: '#' }, { text: 'Sleep Aids', href: '#' }, { text: 'Relaxation Kits', href: '#' }] },
        { title: 'Apparel', links: [{ text: 'Maternity Wear & Care', href: '/category/mother?q=maternity' }, { text: 'Nightdresses', href: '#' }, { text: 'Nursing Pajamas', href: '#' }, { text: 'Cozy Robes', href: '#' }, { text: 'Slippers & Footwear', href: '#' }] },
        { title: 'Nursing', links: [{ text: 'Breastfeeding & Nursing', href: '/category/mother?q=nursing' }, { text: 'Nursing Bras', href: '#' }, { text: 'Breast Pads', href: '#' }, { text: 'Nipple Care', href: '#' }, { text: 'Breast Pumps & Accessories', href: '/category/mother?q=pump' }] },
        { title: 'Recovery', links: [{ text: 'Postpartum Care', href: '#' }, { text: 'Soothe & Heal', href: '#' }, { text: 'Wellness', href: '#' }] }
      ]
    }
  },
  {
    title: 'Newborn',
    type: 'newborn',
    icon: <><path d="M12 21a9 9 0 0 1 0-18c4.97 0 9 3.58 9 8 0 4.42-4.03 8-9 8Z"/><path d="M8 12h.01"/><path d="M16 12h.01"/><path d="M10 16c.5 1 1.5 1 2 1s1.5 0 2-1"/></>,
    menu: {
      featured: { image: '/assets/newborn_apparel.webp', alt: 'Newborn Apparel', title: 'The Newborn Starter Kit', link: '/category/newborn', linkText: 'Explore' },
      columns: [
        { title: 'Clothing', links: [{ text: 'Sleepsuits', href: '#' }, { text: 'Bodysuits', href: '#' }, { text: 'Knitted Sets', href: '#' }, { text: 'Organic Cotton', href: '#' }] },
        { title: 'Sleep', links: [{ text: 'Swaddles', href: '#' }, { text: 'Sleeping Bags', href: '#' }, { text: 'Crib Bedding', href: '#' }, { text: 'Night Lights', href: '#' }] },
        { title: 'Bath & Care', links: [{ text: 'Bath & Skincare', href: '/brand/dalin' }, { text: 'Baby Bathtubs', href: '#' }, { text: 'Grooming Kits', href: '#' }, { text: 'Hooded Towels', href: '#' }] },
        { title: 'Essentials', links: [{ text: 'Feeding & Bottles', href: '/category/newborn?q=feeding' }, { text: 'Laundry & Cleaning', href: '/category/newborn?q=laundry' }, { text: 'Changing Mats', href: '#' }, { text: 'Nappy Caddies', href: '#' }, { text: 'First Gifts', href: '#' }] }
      ]
    }
  },
  {
    title: 'Toddler',
    type: 'kid',
    icon: <><rect width="8" height="8" x="2" y="14" rx="1"/><rect width="8" height="8" x="14" y="14" rx="1"/><rect width="8" height="8" x="8" y="2" rx="1"/></>,
    menu: {
      featured: { image: '/assets/stage_toddler.webp', alt: 'Play & Safety', title: 'Playtime Curated', link: '/category/kid', linkText: 'Shop Play' },
      columns: [
        { title: 'Play & Learn', links: [{ text: 'Activity Mats', href: '#' }, { text: 'Wooden Toys', href: '#' }, { text: 'Educational', href: '#' }, { text: 'Board Books', href: '#' }] },
        { title: 'Weaning', links: [{ text: 'Weaning & Food', href: '/category/kid?q=weaning' }, { text: 'Cups & Tableware', href: '/category/kid?q=cup' }, { text: 'High Chairs', href: '#' }, { text: 'Bowls & Plates', href: '#' }, { text: 'Baby Spoons', href: '#' }, { text: 'Food Blenders', href: '#' }] },
        { title: 'On the Move', links: [{ text: 'Travel & Safety', href: '/category/kid?q=travel' }, { text: 'Strollers', href: '#' }, { text: 'Car Seats', href: '#' }, { text: 'Baby Carriers', href: '#' }, { text: 'Travel Bags', href: '#' }] },
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
        { title: 'Discounted', links: discountedBrands },
        { title: 'Popular', links: popularBrands },
        { title: 'Explore', links: exploreBrands }
      ]
    }
  },
  {
    title: 'About Us',
    type: 'about',
    icon: <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></>,
    menu: {
      featured: { image: '/assets/about dennan.png', alt: 'Our Philosophy', title: 'Our Philosophy', link: '/about', linkText: 'Read Story' },
      columns: [
        { title: 'Quick Links', links: [{ text: 'Our Story', href: '/about' }, { text: 'Contact Us', href: 'https://wa.me/256784733314' }] }
      ]
    }
  }
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, showOnboarding, setShowOnboarding } = useUser();
  const { setIsCartOpen, totalItems, isCartOpen } = useCart();
  const { totalWishlistItems } = useWishlist();

  const isProfileActive = location.pathname === '/dashboard' || location.pathname === '/profile';
  const isWishlistActive = location.pathname === '/wishlist';
  const isLaunchPage = location.pathname === '/launch';
  const [activeMenu, setActiveMenu] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [activeView, setActiveView] = useState('main');
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showMobileSuggestions, setShowMobileSuggestions] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [navHidden, setNavHidden] = useState(false);
  const [isDesktopSearchActive, setIsDesktopSearchActive] = useState(false);
  const [desktopSearchQuery, setDesktopSearchQuery] = useState('');
  const [showDesktopSuggestions, setShowDesktopSuggestions] = useState(false);
  const [desktopSuggestions, setDesktopSuggestions] = useState([]);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const desktopSearchRef = useRef(null);
  const navRef = useRef(null);
  let timeoutId = null;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY <= 50) {
        setNavHidden(false);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down - slowly hide navbar
        setNavHidden(true);
      } else {
        // Scrolling up - show navbar
        setNavHidden(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const updateNavOffset = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        document.documentElement.style.setProperty('--nav-offset', navHidden ? '0px' : '56px');
      } else {
        const height = navRef.current ? navRef.current.offsetHeight : 68;
        document.documentElement.style.setProperty('--nav-offset', `${height}px`);
      }
    };

    updateNavOffset();
    window.addEventListener('resize', updateNavOffset);
    return () => window.removeEventListener('resize', updateNavOffset);
  }, [navHidden]);

  const handleAccountClick = () => {
    if (user) {
      navigate('/dashboard');
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
    setIsSearchActive(false);
  };

  const handleMobileSearch = (e) => {
    e.preventDefault();
    if (mobileSearchQuery.trim()) {
      setShowMobileSuggestions(false);
      setSearchSuggestions([]);
      setIsSearchActive(false);
      navigate(`/category/all?q=${encodeURIComponent(mobileSearchQuery.trim())}`);
      setIsMenuOpen(false);
    }
  };

  // getProducts is defined with trackedQuery (convex/lib/ioTracking.ts), which
  // returns { _io, data } to piggyback its read-count tally on the response.
  // useTrackedQuery reports that tally and unwraps `.data` back to the plain
  // product array - a raw useQuery() call here would hand back the wrapper
  // object instead, silently breaking every Array.prototype call downstream.
  const fetchedProducts = useTrackedQuery(api.data.getProducts, {}, 20);

  const getSuggestionsForQuery = (queryText) => getProductSearchSuggestions(fetchedProducts, queryText, 6);

  const handleSuggestionClick = (suggestion) => {
    setShowMobileSuggestions(false);
    setSearchSuggestions([]);
    setIsSearchActive(false);
    setIsMenuOpen(false);
    if (suggestion && typeof suggestion === 'object' && suggestion.route) {
      navigate(suggestion.route);
    } else {
      const text = typeof suggestion === 'object' ? suggestion.text : suggestion;
      navigate(`/category/all?q=${encodeURIComponent(text)}`);
    }
  };

  const handleDesktopSearchSubmit = (e) => {
    e.preventDefault();
    if (desktopSearchQuery.trim()) {
      navigate(`/category/all?q=${encodeURIComponent(desktopSearchQuery.trim())}`);
      setIsDesktopSearchActive(false);
    }
  };

  const handleDesktopSuggestionClick = (suggestion) => {
    setShowDesktopSuggestions(false);
    setIsDesktopSearchActive(false);
    if (suggestion && typeof suggestion === 'object' && suggestion.route) {
      navigate(suggestion.route);
    } else {
      const text = typeof suggestion === 'object' ? suggestion.text : suggestion;
      navigate(`/category/all?q=${encodeURIComponent(text)}`);
    }
  };

  const handleDesktopSearchKeyDown = (e) => {
    if (!showDesktopSuggestions || desktopSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSuggestionIndex((prev) => 
        prev < desktopSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSuggestionIndex((prev) => 
        prev > 0 ? prev - 1 : desktopSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < desktopSuggestions.length) {
        e.preventDefault();
        handleDesktopSuggestionClick(desktopSuggestions[focusedSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDesktopSuggestions(false);
      setFocusedSuggestionIndex(-1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(event.target)) {
        setShowDesktopSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setFocusedSuggestionIndex(-1);
  }, [desktopSuggestions]);

  useEffect(() => {
    if (mobileSearchQuery.length > 1) {
      const res = getSuggestionsForQuery(mobileSearchQuery);
      setSearchSuggestions(res);
      setShowMobileSuggestions(res.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowMobileSuggestions(false);
    }
  }, [mobileSearchQuery, fetchedProducts]);

  useEffect(() => {
    if (desktopSearchQuery.length > 1) {
      const res = getSuggestionsForQuery(desktopSearchQuery);
      setDesktopSuggestions(res);
      setShowDesktopSuggestions(res.length > 0);
    } else {
      setDesktopSuggestions([]);
      setShowDesktopSuggestions(false);
    }
  }, [desktopSearchQuery, fetchedProducts]);

  // Lock background body scroll when mobile drawer is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const activeCategory = navData.find(item => item.type === activeView);

  return (
    <>
    <nav ref={navRef} className={`nav ${navHidden ? 'nav--hidden' : ''}`}>
      <button 
        className="btn btn--ghost nav__mobile-menu-trigger" 
        onClick={toggleMenu}
        aria-label="Open Menu"
      >
        <span className="btn-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </span>
      </button>

      <Link to="/" className="nav__wordmark">
        <img src="/dennan_logo_final_compressed.png" alt="Dennan Kids Logo" className="nav__logo" />
      </Link>

      {isDesktopSearchActive ? (
        <div className="nav__desktop-search animate-fadeIn" ref={desktopSearchRef}>
          <form className="nav__desktop-search-form" onSubmit={handleDesktopSearchSubmit}>
            <div className="mobile-menu__search-inner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mobile-menu__search-icon">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input 
                type="text" 
                placeholder="Search products, brands..." 
                className="mobile-menu__search-input"
                value={desktopSearchQuery}
                onChange={(e) => setDesktopSearchQuery(e.target.value)}
                onFocus={() => desktopSearchQuery.length > 1 && setShowDesktopSuggestions(true)}
                onKeyDown={handleDesktopSearchKeyDown}
                autoFocus={true}
              />
              {desktopSearchQuery && (
                <Button 
                  variant="ghost"
                  size="sm"
                  type="button" 
                  className="mobile-menu__search-clear"
                  onClick={() => setDesktopSearchQuery('')}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                />
              )}
              <Button 
                variant="ghost"
                size="sm"
                type="button" 
                className="mobile-menu__search-clear"
                onClick={() => {
                  setIsDesktopSearchActive(false);
                  setDesktopSearchQuery('');
                }}
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
              />
            </div>
            
            {showDesktopSuggestions && desktopSuggestions.length > 0 && (
              <>
                <div className="mobile-menu__search-backdrop" onClick={() => setShowDesktopSuggestions(false)} style={{ top: '80px' }} />
                <div className="mobile-menu__suggestions desktop-suggestions">
                  {desktopSuggestions.map((suggestion, index) => (
                    <Button 
                      key={index} 
                      variant="ghost"
                      fullWidth
                      className={`mobile-menu__suggestion-item ${index === focusedSuggestionIndex ? 'is-focused' : ''}`}
                      onClick={() => handleDesktopSuggestionClick(suggestion)}
                      style={{ textAlign: 'left', justifyContent: 'flex-start', gap: '10px' }}
                    >
                      {suggestion.image ? (
                        <img src={suggestion.image} alt="" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{suggestion.text}</div>
                        {suggestion.sub && <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{suggestion.sub}</div>}
                      </div>
                    </Button>
                  ))}
                </div>
              </>
            )}
          </form>
        </div>
      ) : (
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
              <MegaMenu isOpen={activeMenu === item.type} data={item.menu} categoryType={item.type} resolveNavLink={resolveNavLink} />
            </li>
          ))}
        </ul>
      )}

      <div className="nav__actions">
        {!isDesktopSearchActive && (
          <button 
            className="btn btn--nav-icon nav__action-search" 
            aria-label="Search"
            onClick={() => setIsDesktopSearchActive(true)}
          >
            <span className="btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </span>
          </button>
        )}
        <button 
          className={`btn btn--nav-icon nav__action-account ${isProfileActive ? 'is-active' : ''}`} 
          aria-label="Account"
          onClick={handleAccountClick}
        >
          <span className="btn-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isProfileActive ? "var(--color-brand-primary)" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </span>
        </button>

        <Link to="/wishlist" className={`btn btn--nav-icon nav__action-wishlist nav__cart-badge ${isWishlistActive ? 'is-active' : ''}`} aria-label="Wishlist">
          <span className="btn-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isWishlistActive ? "var(--color-brand-primary)" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </span>
          {totalWishlistItems > 0 && <span className="cart-count-dot" style={{ backgroundColor: 'var(--color-brand-primary)' }}>{totalWishlistItems}</span>}
        </Link>

        <button 
          className={`btn btn--nav-icon nav__action-cart nav__cart-badge ${isCartOpen ? 'is-active' : ''}`}
          aria-label="Cart"
          onClick={() => setIsCartOpen(true)}
        >
          <span className="btn-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isCartOpen ? "var(--color-brand-primary)" : "none"} stroke="currentColor" strokeWidth="1.8">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </span>
          {totalItems > 0 && <span className="cart-count-dot">{totalItems}</span>}
        </button>
      </div>
      <div className={`mobile-menu ${isMenuOpen ? 'is-open' : ''}`}>
        <div className="mobile-menu__header">
          <button 
            className="btn btn--nav-icon mobile-menu__search-toggle"
            onClick={() => setIsSearchActive(!isSearchActive)}
            aria-label="Toggle Search"
            style={{ color: isSearchActive ? 'var(--color-brand-primary)' : 'inherit' }}
          >
            <span className="btn-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </span>
          </button>
          <button 
            className="btn btn--nav-icon mobile-menu__close"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close Menu"
          >
            <span className="btn-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </span>
          </button>
        </div>

        {isSearchActive && (
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
                  autoFocus={true}
                />
                {mobileSearchQuery && (
                  <Button 
                    variant="ghost"
                    size="sm"
                    type="button" 
                    className="mobile-menu__search-clear"
                    onClick={() => setMobileSearchQuery('')}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                  />
                )}
              </div>
              
              {showMobileSuggestions && searchSuggestions.length > 0 && (
                <>
                  <div className="mobile-menu__search-backdrop" onClick={() => setShowMobileSuggestions(false)} />
                  <div className="mobile-menu__suggestions">
                    {searchSuggestions.map((suggestion, index) => (
                      <Button 
                        key={index} 
                        variant="ghost"
                        fullWidth
                        className="mobile-menu__suggestion-item"
                        onClick={() => handleSuggestionClick(suggestion)}
                        style={{ textAlign: 'left', justifyContent: 'flex-start', gap: '10px' }}
                      >
                        {suggestion.image ? (
                          <img src={suggestion.image} alt="" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <div style={{ fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{suggestion.text}</div>
                          {suggestion.sub && <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{suggestion.sub}</div>}
                        </div>
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </form>
          </div>
        )}

        <div className="mobile-menu__pane-container" style={{ transform: activeView === 'main' ? 'translateX(0)' : 'translateX(-50%)' }}>
          {/* Main Pane */}
          <div className="mobile-menu__pane">
            <ul className="mobile-menu__list">
              {navData.map((item) => (
                <li key={item.type} className="mobile-menu__item">
                  <Button 
                    variant="ghost"
                    fullWidth
                    className="mobile-menu__trigger"
                    onClick={() => setActiveView(item.type)}
                    style={{ justifyContent: 'space-between' }}
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>}
                    iconPosition="right"
                  >
                    <span className="mobile-menu__trigger-left">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mobile-menu__icon">
                        {item.icon}
                      </svg>
                      {item.title}
                    </span>
                  </Button>
                </li>
              ))}
              
              {/* Profile/Account Option at the bottom */}
              <li className="mobile-menu__item mobile-menu__item--profile" style={{ marginTop: 'var(--space-2)' }}>
                <Button 
                  variant="ghost"
                  fullWidth
                  className="mobile-menu__trigger"
                  onClick={() => { handleAccountClick(); setIsMenuOpen(false); }}
                  style={{ 
                    justifyContent: 'space-between',
                    color: isProfileActive ? 'var(--color-brand-primary)' : 'inherit'
                  }}
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>}
                  iconPosition="right"
                >
                  <span className="mobile-menu__trigger-left">
                    <svg viewBox="0 0 24 24" fill={isProfileActive ? "var(--color-brand-primary)" : "none"} stroke="currentColor" strokeWidth="1.8" className="mobile-menu__icon" style={{ color: isProfileActive ? 'var(--color-brand-primary)' : '#000000' }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    {user ? 'Profile' : 'Sign In'}
                  </span>
                </Button>
              </li>
            </ul>
          </div>

          {/* Sub Pane */}
          <div className="mobile-menu__pane">
            {activeCategory && (
              <div className="mobile-menu__sub">
                <Button 
                  variant="ghost"
                  fullWidth
                  className="mobile-menu__back-btn"
                  onClick={() => setActiveView('main')}
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>}
                  iconPosition="left"
                >
                  Back to Main
                </Button>

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
                          {link.href.startsWith('http') ? (
                            <a
                              href={link.href}
                              className="mobile-menu__link"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              {link.text}
                            </a>
                          ) : (
                            <Link
                              to={resolveNavLink(link)}
                              className="mobile-menu__link"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              {link.text}
                            </Link>
                          )}
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
        isOpen={showOnboarding && !isLaunchPage}
        onClose={() => setShowOnboarding(false)}
      />

      <CartModal />
    </nav>
    </>

  );
};

export default Navbar;
