// Strips a leading brand-name prefix from a product name for display purposes.
// The full (un-stripped) name is still what's stored/searched server-side.
export function stripBrandFromName(name, brand) {
  if (!name || !brand?.trim()) return name;
  const escaped = brand.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stripped = name.replace(new RegExp(`^\\s*${escaped}\\s+`, 'i'), '').trim();
  return stripped || name;
}
