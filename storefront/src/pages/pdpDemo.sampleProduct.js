import productImg from '../assets/design_system/product_sample.png';

// Rich sample product covering every field PDP.jsx reads, used to compare
// redesign options at /pdp-demo without touching real Convex data.
export const sampleProduct = {
  _id: 'demo-1',
  name: 'Philips Avent Natural Starter Set',
  brand: 'Philips Avent',
  slug: 'philips-avent-natural-starter-set',
  sku: 'PA-NSS-001',
  price: 195000,
  wasPrice: 245000,
  images: [productImg, productImg, productImg],
  stage: 'newborn',
  category: 'Feeding',
  minMonth: 0,
  maxMonth: 6,
  material: 'BPA-free polypropylene, medical-grade silicone',
  dimensions: { length: 12, width: 8, height: 22, unit: 'cm' },
  weightGrams: 450,
  allergens: ['Latex-free'],
  usageInstructions: 'Sterilize before first use. Dishwasher-safe (top rack). Replace teats every 3 months.',
  description:
    'The Philips Avent Natural Starter Set combines a breast-shaped nipple with a wide latch-on areola, designed with breastfeeding mothers and paediatricians to help babies combine breast and bottle feeding. The unique spiral design of the teat reduces colic and gas.',
  tags: [
    { type: 'primary', text: 'Feeding' },
    { type: 'secondary', text: 'Starter Set' },
    { type: 'support-blue', text: 'Newborn' },
  ],
  specifications: [
    { label: 'Material', value: 'BPA-free polypropylene, medical-grade silicone' },
    { label: 'Capacity', value: '260ml / 125ml bottles' },
    { label: 'Age Range', value: '0-6 months' },
    { label: 'Included Items', value: '2 bottles, 2 teats, cleaning brush' },
    { label: 'Country of Origin', value: 'Netherlands' },
  ],
  inventory: 0,
  unitsSold: 1240,
  // Synthetic — no live Convex product actually sets this field today (see plan notes).
  ageScale: { current: 0.32, label: 'Newborn' },
};

export const sampleReviews = [
  {
    rating: 5,
    childAge: '3 months',
    text: 'My baby switched between breast and bottle with zero fuss. The anti-colic valve genuinely works.',
    author: 'Grace N.',
  },
  {
    rating: 4,
    childAge: '5 months',
    text: 'Great quality and easy to clean. Wish it came with a third bottle in the starter set.',
    author: 'Daniel K.',
  },
  {
    rating: 5,
    childAge: '1 month',
    text: 'Recommended by our paediatrician and it has been worth every shilling. Fast delivery too.',
    author: 'Patricia A.',
  },
];
