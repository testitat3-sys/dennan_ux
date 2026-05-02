import React from 'react';

const Footer = () => {
  return (
    <footer className="footer" aria-label="Site footer">
      <div className="footer__grid">
        <div>
          <a href="/" className="footer__logo-link">
            <img src="/dennan_logo_2.svg" alt="Dennan Kids Logo" className="footer__logo" style={{ filter: 'brightness(0) invert(1)' }} />
          </a>
          <p className="footer__brand-copy">
            Dennan Baby To Kids is Uganda’s number one distributor in the baby and kids market, currently with five physical stores within Kampala and an online presence.
            <br /><br />
            Founded in 2015, we identified an opportunity for a one-stop shopping place for parents and parents-to-be by stocking a wide variety of high-quality, unique, and trusted brands imported from the UK, Turkey, Dubai, China, Vietnam, and the USA.
          </p>
        </div>

        <div>
          <p className="footer__col-title">Shop</p>
          <ul className="footer__links">
            <li><a href="/category?tier=essentials">Essentials</a></li>
            <li><a href="/category?tier=must-haves">Must-Haves</a></li>
            <li><a href="/category?tier=luxuries">Luxuries</a></li>
            <li><a href="/category">All products</a></li>
          </ul>
        </div>

        <div>
          <p className="footer__col-title">Stages</p>
          <ul className="footer__links">
            <li><a href="/journey/expectant">Expectant &amp; New Mom</a></li>
            <li><a href="/journey/newborn">Newborn 0–6 months</a></li>
            <li><a href="/journey/toddler">Baby &amp; Toddler</a></li>
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
        <span>© {new Date().getFullYear()} Denan Kids. All rights reserved.</span>
        <span>Designed with intention.</span>
      </div>
    </footer>
  );
};

export default Footer;
