export const stages = {
  mother: {
    id: 'mother',
    title: 'For the Mother',
    subtext: 'Curated essentials for every step of your journey—from early pregnancy to postpartum recovery.',
    heroImage: '/new_assets/Motherhood.webp',
  },
  newborn: {
    id: 'newborn',
    title: 'The Newborn Edit',
    subtext: 'Soft, safe, and sophisticated. Everything your little one needs for a gentle start in life.',
    heroImage: '/new_assets/Newborn.webp',
  },
  kid: {
    id: 'kid',
    title: 'Growing & Exploring',
    subtext: 'Designed for curiosity and built for play. Discover gear and toys for their biggest milestones.',
    heroImage: '/new_assets/Care.webp', // Using Care.webp for Kid stage as placeholder
  }
};

export const products = [
  {
    id: 1,
    name: 'Closer to Nature Baby Bottles',
    price: '£18.99',
    wasPrice: '£24.99',
    image: '/new_assets/Tommee Tippee Closer to Nature Starter Set.jfif',
    tier: 'Essentials',
    stage: 'newborn',
    minMonth: 0,
    maxMonth: 6,
    category: 'Feeding',
    tags: [{ type: 'primary', text: '1k + sold' }, { type: 'accent', text: '25% OFF' }]
  },
  {
    id: 2,
    name: 'SnüzPod 4 Bedside Crib',
    price: '£199.00',
    image: '/new_assets/SnüzPod 4 Bedside Crib - White.jfif',
    tier: 'Must-Haves',
    stage: 'newborn',
    minMonth: 0,
    maxMonth: 6,
    category: 'Sleep',
    tags: [{ type: 'primary', text: 'Top Rated' }]
  },
  {
    id: 3,
    name: 'Organic Cotton Starter Set',
    price: '£45.00',
    image: '/new_assets/Organic Cotton Starter Set.jfif',
    tier: 'Essentials',
    stage: 'newborn',
    minMonth: 0,
    maxMonth: 3,
    category: 'Apparel',
    tags: [{ type: 'primary', text: 'Organic' }]
  },
  {
    id: 4,
    name: 'Maternity Comfort Pillow',
    price: '£35.00',
    image: '/new_assets/maternity_essentials.webp',
    tier: 'Essentials',
    stage: 'mother',
    minWeek: 12,
    maxWeek: 40,
    category: 'Comfort',
    tags: [{ type: 'primary', text: 'Support' }]
  },
  {
    id: 5,
    name: 'Skip Hop Forma Backpack',
    price: '£75.00',
    image: '/new_assets/Skip Hop Forma Backpack Nappy Bag.jfif',
    tier: 'Must-Haves',
    stage: 'mother',
    minWeek: 20,
    maxWeek: 40,
    category: 'On the Move',
    tags: [{ type: 'primary', text: 'Best Seller' }]
  },
  {
    id: 6,
    name: 'BÉABA Babycook Neo',
    price: '£160.00',
    image: '/new_assets/BÉABA Babycook Neo Food Blender.jfif',
    tier: 'Luxuries',
    stage: 'kid',
    minMonth: 6,
    maxMonth: 24,
    category: 'Feeding',
    tags: [{ type: 'primary', text: 'Chef Approved' }]
  },
  {
    id: 7,
    name: 'BÉABA Babycook Solo',
    price: '£120.00',
    image: '/new_assets/BÉABA Babycook Solo.jfif',
    tier: 'Essentials',
    stage: 'kid',
    minMonth: 6,
    maxMonth: 18,
    category: 'Feeding',
    tags: [{ type: 'primary', text: 'Compact' }]
  },
  {
    id: 8,
    name: 'Interactive Play Mat',
    price: '£55.00',
    image: '/new_assets/pexels-chidy-31141041.webp',
    tier: 'Essentials',
    stage: 'kid',
    minMonth: 3,
    maxMonth: 12,
    category: 'Play',
    tags: [{ type: 'primary', text: 'Sensory' }]
  }
];
