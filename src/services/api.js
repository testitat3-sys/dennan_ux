const API_BASE_URL = 'http://localhost:3001';

export const fetchData = async (endpoint) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`);
    if (!response.ok) {
      throw new Error(`Error fetching ${endpoint}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getHomepageData = async () => {
  const [hero, brands, products, stages, tiers, reels, trustItems] = await Promise.all([
    fetchData('hero'),
    fetchData('brands'),
    fetchData('products'),
    fetchData('stages'),
    fetchData('tiers'),
    fetchData('reels'),
    fetchData('trustItems'),
  ]);

  return {
    hero,
    brands,
    products,
    stages,
    tiers,
    reels,
    trustItems,
  };
};

export const getDashboardData = async () => {
  return await fetchData('dashboard');
};

export const getProducts = async () => {
  return await fetchData('products');
};

export const getCheckoutData = async () => {
  return await fetchData('checkout');
};

export const getPLPData = async () => {
  const [stages, collections, products] = await Promise.all([
    fetchData('stages'),
    fetchData('collections'),
    fetchData('products'),
  ]);
  return { stages, collections, products };
};

export const getBrandDetails = async (brandId) => {
  const allBrands = await fetchData('brandDetails');
  return allBrands[brandId] || allBrands['tommee-tippee'];
};

export const getRegistryData = async () => {
  return await fetchData('registry');
};
