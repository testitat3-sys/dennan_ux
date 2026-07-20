import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer" aria-label="Site footer">
      <div className="footer__grid">
        <div>
          <a href="/" className="footer__logo-link">
            <img src="/dennan_logo_final_compressed.png" alt="Dennan Kids Logo" className="footer__logo" style={{ filter: 'brightness(0) invert(0.33)' }} />
          </a>
          <p className="footer__brand-copy">
            Dennan Baby To Kids is Uganda’s number one distributor in the baby and kids market, currently with 2 branches within Kampala and an online presence.
            <br /><br />
            Founded in 2013, we identified an opportunity for a one-stop shopping place for parents and parents-to-be by stocking a wide variety of high-quality, unique, and trusted brands imported from the UK, Turkey, Dubai, China, Vietnam, and the USA.
          </p>

        </div>

        <div>
          <p className="footer__col-title">Shop</p>
          <ul className="footer__links">
            <li><Link to="/collection/essentials">Essentials</Link></li>
            <li><Link to="/collection/must-haves">Must-Haves</Link></li>
            <li><Link to="/collection/luxuries">Luxuries</Link></li>
            <li><Link to="/category/all">All products</Link></li>
          </ul>
        </div>

        <div>
          <p className="footer__col-title">Stages</p>
          <ul className="footer__links">
            <li><Link to="/category/mother">Expectant &amp; New Mom</Link></li>
            <li><Link to="/category/newborn">Newborn 0–6 months</Link></li>
            <li><Link to="/category/kid">Baby &amp; Toddler</Link></li>
          </ul>
        </div>

        <div>
          <p className="footer__col-title">Help</p>
          <ul className="footer__links">
            <li><a href="/about">About us</a></li>
            <li><a href="/returns">Returns &amp; delivery</a></li>
            <li><a href="/safety">Product safety</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </div>
      </div>

      <div className="footer__bottom">
        <span>© {new Date().getFullYear()} Dennan. Designed with love.</span>
        <a
          href="https://fiiindit.com"
          target="_blank"
          rel="noopener noreferrer"
          className="footer__built-with"
        >
          Built with
          <img src="/assets/sos-footer-logo.png" alt="Fiiindit SOS" className="footer__sos-logo" />
        </a>
      </div>
    </footer>
  );
};

export default Footer;

