import React from 'react';
import { useCart } from '../../context/CartContext';
import { useRegistry } from '../../context/RegistryContext';
import { useWishlist } from '../../context/WishlistContext';
import { formatPrice } from '../../utils/priceUtils';
import { stripBrandFromName } from '../../utils/productNameUtils';
import Button from '../ui/Button';
import DefaultProductImage from './DefaultProductImage';

const CartItem = ({ item }) => {
  const cartContext = useCart();
  const { updateQuantity, removeFromCart } = cartContext;
  const { moveFromCartToRegistry } = useRegistry();
  const { addToWishlist } = useWishlist();
  const displayName = stripBrandFromName(item.name, item.brand);

  const handleMoveToRegistry = async () => {
    await moveFromCartToRegistry(item, cartContext);
  };

  const handleSaveToWishlist = async () => {
    await addToWishlist(item);
    await removeFromCart(item.id, item.size, 'wishlist');
  };

  return (
    <div className="cart-item">
      <div className="cart-item__thumbnail">
        {item.image ? (
          <img src={item.image} alt={displayName} />
        ) : (
          <DefaultProductImage />
        )}
      </div>
      
      <div className="cart-item__content">
        <div className="cart-item__info">
          <div className="cart-item__header">
            <h4 className="cart-item__name">{displayName}</h4>
            <span className="cart-item__stage-hint">{item.stage || 'Newborn'}</span>
          </div>
          <p className="cart-item__meta">Size: {item.size}</p>
          <span className="cart-item__price">{formatPrice(item.price)}</span>
        </div>

        <div className="cart-item__controls">
          <div className="cart-item__actions">
            <Button 
              variant="icon-action"
              onClick={handleSaveToWishlist}
              aria-label="Save for later"
              title="Save for later"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>}
            />
            <Button 
              variant="icon-action"
              onClick={handleMoveToRegistry}
              aria-label="Move to registry"
              title="Move to registry"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>}
            />
            <Button 
              variant="icon-action-delete"
              onClick={() => removeFromCart(item.id, item.size)}
              aria-label="Remove item"
              title="Remove item"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>}
            />
          </div>

          <div className="stepping-component">
            <Button 
              variant="stepper"
              onClick={() => updateQuantity(item.id, item.size, -1)}
              aria-label="Decrease quantity"
            >
              —
            </Button>
            <span className="stepping-value">{item.quantity}</span>
            <Button 
              variant="stepper"
              onClick={() => updateQuantity(item.id, item.size, 1)}
              aria-label="Increase quantity"
            >
              +
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;

