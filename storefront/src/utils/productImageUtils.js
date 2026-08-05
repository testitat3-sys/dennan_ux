/**
 * Utility functions for safely resolving product image URLs in the storefront.
 */

/**
 * Safely extracts an array of valid image URLs from a product object.
 * Fixes the issue where product.images is an empty array `[]` (truthy in JS),
 * causing expressions like `product.images || [product.image]` to return `[]`
 * and ignore `product.image`.
 *
 * @param {Object} product - Product data object
 * @returns {string[]} Array of non-empty image URL strings
 */
export function getProductImages(product) {
  if (!product) return [];

  const images = [];

  // Check if product.images is an array with valid non-empty string entries
  if (Array.isArray(product.images) && product.images.length > 0) {
    const validImages = product.images.filter(img => typeof img === 'string' && img.trim() !== '');
    images.push(...validImages);
  }

  // Check product.image singular property
  if (typeof product.image === 'string' && product.image.trim() !== '') {
    const mainImg = product.image.trim();
    // Prepend product.image as primary image if not already included
    if (!images.includes(mainImg)) {
      images.unshift(mainImg);
    }
  }

  return images;
}

/**
 * Safely gets the primary display image URL for a product card / thumbnail.
 *
 * @param {Object} product - Product data object
 * @returns {string|null} The primary image URL or null if none available
 */
export function getPrimaryProductImage(product) {
  const images = getProductImages(product);
  return images.length > 0 ? images[0] : null;
}
