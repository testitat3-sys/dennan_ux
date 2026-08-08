// Shared client-side product-suggestion matcher used by both the navbar
// search bar (Navbar.jsx, desktop + mobile) and the homepage SearchStrip.
// Previously these two components each carried their own hand-copied version
// of this logic; the navbar's copy was accidentally left on an older,
// weaker implementation (matching only against static nav-menu labels)
// while SearchStrip's was upgraded to score against real product data.
// Keeping a single implementation here means that class of drift can't
// happen again.

// Very small English stemmer - good enough to bridge "bottles" -> "bottle",
// "bibs" -> "bib", "bodysuits" -> "bodysuit", etc.
export function stemWord(word) {
  const lower = (word || '').toLowerCase();
  if (lower.endsWith('ies') && lower.length > 4) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('es') && lower.length > 4) return lower.slice(0, -2);
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) return lower.slice(0, -1);
  return lower;
}

/**
 * Score + rank `products` against `queryText`, returning up to `limit`
 * suggestion objects shaped for the search dropdowns:
 * { text, sub, type: 'product', image, route, product, score }
 */
export function getProductSearchSuggestions(products, queryText, limit = 6) {
  const norm = (queryText || '').toLowerCase().trim();
  if (!norm || !Array.isArray(products) || products.length === 0) return [];

  const stemmedNorm = stemWord(norm);
  const scored = [];

  products.forEach((p) => {
    if (!p || !p.name) return;
    const nameLower = p.name.toLowerCase();
    const brandLower = (p.brand || '').toLowerCase();
    const catLower = (p.category || '').toLowerCase();
    const subCatLower = (p.subCategory || '').toLowerCase();
    const descLower = (p.description || '').toLowerCase();
    const tagTexts = (p.tags || []).map((t) => (t && t.text ? t.text.toLowerCase() : '')).filter(Boolean);
    const tagJoined = tagTexts.join(' ');

    let score = 0;
    if (nameLower === norm || nameLower === stemmedNorm) {
      score = 150;
    } else if (nameLower.startsWith(norm) || nameLower.startsWith(stemmedNorm)) {
      score = 110;
    } else if (nameLower.split(/\s+/).some((w) => w.startsWith(norm) || w.startsWith(stemmedNorm))) {
      score = 90;
    } else if (nameLower.includes(norm) || nameLower.includes(stemmedNorm)) {
      score = 70;
    }

    if (tagJoined.includes(norm) || tagJoined.includes(stemmedNorm) || tagTexts.some((t) => t.includes(norm) || t.includes(stemmedNorm))) {
      score = Math.max(score, 65);
    }
    if (brandLower.includes(norm) || brandLower.includes(stemmedNorm)) {
      score = Math.max(score, 50);
    }
    if (catLower.includes(norm) || catLower.includes(stemmedNorm) || subCatLower.includes(norm) || subCatLower.includes(stemmedNorm)) {
      score = Math.max(score, 40);
    }
    if (descLower.includes(norm) || descLower.includes(stemmedNorm)) {
      score = Math.max(score, 20);
    }

    if (score > 0) {
      scored.push({ p, score });
    }
  });

  scored.sort((a, b) => b.score - a.score || a.p.name.length - b.p.name.length);

  const suggestions = [];
  const seen = new Set();
  for (const { p, score } of scored) {
    const key = p.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const priceVal = p.price || p.originalPrice;
    const formattedPrice = priceVal ? `UGX ${priceVal.toLocaleString()}` : null;
    const subParts = [
      p.brand && p.brand !== 'no-brand' ? p.brand : null,
      formattedPrice,
      p.category,
    ].filter(Boolean);

    suggestions.push({
      text: p.name,
      sub: subParts.join(' • ') || 'Product',
      type: 'product',
      image: p.image,
      route: `/product/${p.slug || p._id}`,
      product: p,
      score,
    });

    if (suggestions.length >= limit) break;
  }

  return suggestions;
}
