export const stages = {
  mother: {
    id: 'mother',
    title: 'For the Mother',
    subtext: 'Curated essentials for every step of your journey—from early pregnancy to postpartum recovery.',
    heroImage: '/assets/stage_expectant.webp',
  },
  newborn: {
    id: 'newborn',
    title: 'The Newborn Edit',
    subtext: 'Soft, safe, and sophisticated. Everything your little one needs for a gentle start in life.',
    heroImage: '/assets/Newborn.webp',
  },
  kid: {
    id: 'kid',
    title: 'Growing & Exploring',
    subtext: 'Designed for curiosity and built for play. Discover gear and toys for their biggest milestones.',
    heroImage: '/assets/Care.webp', // Using Care.webp for Kid stage as placeholder
  }
};

export const collections = {
  'curated-picks': {
    id: 'curated-picks',
    title: 'Curated Picks for You',
    subtext: 'Hand-selected by our experts and tailored to your unique parenting style.',
    heroImage: '/assets/stage_expectant.webp',
  },
  'most-loved': {
    id: 'most-loved',
    title: 'Most Loved by Parents',
    subtext: 'The highest-rated essentials as voted by our community of mothers and fathers.',
    heroImage: '/assets/Newborn.webp',
  },
  'essentials': {
    id: 'essentials',
    title: 'The Essentials',
    subtext: 'The non-negotiables for safety, feeding, and sleep. Every home needs these.',
    heroImage: '/assets/Care.webp',
  },
  'must-haves': {
    id: 'must-haves',
    title: 'Must-Haves for Parents',
    subtext: 'Quality items that make an enormous difference to your daily life.',
    heroImage: '/assets/feeding_nursing.webp',
  },
  'luxuries': {
    id: 'luxuries',
    title: 'The Luxury Edit',
    subtext: 'Premium picks beautifully made for when only the best will do.',
    heroImage: '/assets/hero.webp',
  }
};

export const products = [
  {
    id: 1,
    name: 'Closer to Nature Baby Bottles',
    brand: 'Tommee Tippee',
    price: '£18.99',
    wasPrice: '£24.99',
    image: '/assets/Tommee Tippee Closer to Nature Starter Set.jfif',
    tier: 'Essentials',
    stage: 'newborn',
    isCurated: true,
    isMostLoved: true,
    minMonth: 0,
    maxMonth: 6,
    category: 'Feeding',
    tags: [{ type: 'primary', text: '1k + sold' }, { type: 'accent', text: '25% OFF' }],
    description: 'The original breast-like bottle. With our award-winning Closer to Nature baby bottle, switching between breast and bottle feeding has never been simpler.',
    specifications: [
      { label: 'BPA Free', value: 'Yes' },
      { label: 'Flow Type', value: 'Slow Flow' },
      { label: 'Bottle Size', value: '260ml' },
      { label: 'Material', value: 'Polypropylene' }
    ],
    reviews: [
      { author: 'Sarah M.', rating: 5, childAge: '3 months', text: 'Best bottles we have tried. No colic issues at all.' },
      { author: 'James L.', rating: 4, childAge: '1 month', text: 'Easy to clean and my son took to it immediately.' }
    ],
    ageScale: {
      current: 0.2, // 0 to 1 scale
      label: 'Perfect for Newborns'
    }
  },
  {
    id: 2,
    name: 'SnüzPod 4 Bedside Crib',
    brand: 'Snüz',
    price: '£199.00',
    image: '/assets/SnüzPod 4 Bedside Crib - White.jfif',
    tier: 'Must-Haves',
    stage: 'newborn',
    isCurated: true,
    isMostLoved: true,
    minMonth: 0,
    maxMonth: 6,
    category: 'Sleep',
    tags: [{ type: 'primary', text: 'Top Rated' }],
    description: 'The UK\'s best-selling bedside crib. Sleep safely, feed easily and be even closer to your baby with the all-new SnüzPod 4.',
    specifications: [
      { label: 'Mattress Included', value: 'Yes' },
      { label: 'Adjustable Height', value: '7 Levels' },
      { label: 'Reflux Tilt', value: 'Yes' },
      { label: 'Breathable Mesh', value: 'Dual-view' }
    ],
    reviews: [
      { author: 'Emily R.', rating: 5, childAge: '2 months', text: 'Life saver for breastfeeding at night. So sturdy and beautiful.' },
      { author: 'Tom H.', rating: 5, childAge: '4 months', text: 'Fits our tall bed perfectly. Highly recommend.' }
    ],
    ageScale: {
      current: 0.3,
      label: 'Early Childhood'
    }
  },
  {
    id: 3,
    name: 'Organic Cotton Starter Set',
    brand: 'Dennan Kids',
    price: '£45.00',
    image: '/assets/Organic Cotton Starter Set.jfif',
    tier: 'Essentials',
    stage: 'newborn',
    isCurated: true,
    minMonth: 0,
    maxMonth: 3,
    category: 'Apparel',
    tags: [{ type: 'primary', text: 'Organic' }],
    description: 'Crafted from the softest 100% GOTS certified organic cotton. This 5-piece set is perfect for a newborn\'s delicate skin.',
    specifications: [
      { label: 'Material', value: '100% Organic Cotton' },
      { label: 'Pieces', value: '5-Piece Set' },
      { label: 'Certification', value: 'GOTS Certified' },
      { label: 'Machine Washable', value: 'Yes, 30°C' }
    ],
    reviews: [
      { author: 'Jessica W.', rating: 5, childAge: 'Newborn', text: 'So soft! My baby looks adorable and seems very comfy.' }
    ],
    ageScale: {
      current: 0.1,
      label: 'First Days'
    }
  },
  {
    id: 4,
    name: 'Maternity Comfort Pillow',
    brand: 'Dreamgenii',
    price: '£35.00',
    image: '/assets/maternity_essentials.webp',
    tier: 'Essentials',
    stage: 'mother',
    isCurated: false,
    isMostLoved: true,
    minWeek: 12,
    maxWeek: 40,
    category: 'Comfort',
    tags: [{ type: 'primary', text: 'Support' }],
    description: 'The multi-award winning Dreamgenii Maternity Support and Feeding Pillow is designed to help you get a comfortable night\'s sleep during pregnancy.',
    specifications: [
      { label: 'Filling', value: 'Polyester' },
      { label: 'Cover', value: '100% Cotton' },
      { label: 'Supports', value: 'Back, Bump & Knees' }
    ],
    reviews: [
      { author: 'Claire B.', rating: 4, childAge: 'Expecting', text: 'Finally getting some sleep! A bit bulky but worth it.' }
    ],
    ageScale: {
      current: 0.5,
      label: 'Mid-Pregnancy+'
    }
  },
  {
    id: 5,
    name: 'Skip Hop Forma Backpack',
    brand: 'Skip Hop',
    price: '£75.00',
    image: '/assets/Skip Hop Forma Backpack Nappy Bag.jfif',
    tier: 'Must-Haves',
    stage: 'mother',
    isCurated: true,
    minWeek: 20,
    maxWeek: 40,
    category: 'On the Move',
    tags: [{ type: 'primary', text: 'Best Seller' }],
    description: 'A lightweight, quilted backpack that offers hands-free convenience and special packing cubes for baby\'s essentials.',
    specifications: [
      { label: 'Included Cubes', value: '2 Packing Cubes' },
      { label: 'Stroller Straps', value: 'Yes' },
      { label: 'Changing Pad', value: 'Cushioned' }
    ],
    reviews: [
      { author: 'Linda K.', rating: 5, childAge: '6 months', text: 'Best nappy bag ever. So much space and looks great.' }
    ],
    ageScale: {
      current: 0.6,
      label: 'Active Parents'
    }
  },
  {
    id: 6,
    name: 'BÉABA Babycook Neo',
    brand: 'BÉABA',
    price: '£160.00',
    image: '/assets/BÉABA Babycook Neo Food Blender.jfif',
    tier: 'Luxuries',
    stage: 'kid',
    isMostLoved: true,
    minMonth: 6,
    maxMonth: 24,
    category: 'Feeding',
    tags: [{ type: 'primary', text: 'Chef Approved' }],
    description: 'The eco-designed baby food maker. Babycook Neo makes healthy, homemade baby food in less than 20 minutes.',
    specifications: [
      { label: 'Capacity', value: '1250ml Bowl' },
      { label: 'Material', value: 'Glass Bowl, Stainless Steel Basket' },
      { label: 'Functions', value: 'Steam, Blend, Defrost, Reheat' }
    ],
    reviews: [
      { author: 'Marcus G.', rating: 5, childAge: '8 months', text: 'Incredible quality. The glass bowl is a game changer for cleaning.' }
    ],
    ageScale: {
      current: 0.7,
      label: 'Weaning Stage'
    }
  },
  {
    id: 7,
    name: 'BÉABA Babycook Solo',
    brand: 'BÉABA',
    price: '£120.00',
    image: '/assets/BÉABA Babycook Solo.jfif',
    tier: 'Essentials',
    stage: 'kid',
    minMonth: 6,
    maxMonth: 18,
    category: 'Feeding',
    tags: [{ type: 'primary', text: 'Compact' }],
    description: 'A 4-in-1 baby food maker that steams, blends, defrosts and reheats. Perfect for preparing small batches of fresh meals.',
    specifications: [
      { label: 'Capacity', value: '1100ml Bowl' },
      { label: 'Material', value: 'BPA-Free Plastic' },
      { label: 'Cooking Time', value: '15 Minutes' }
    ],
    reviews: [
      { author: 'Anita S.', rating: 4, childAge: '7 months', text: 'Very convenient and easy to use. Great for busy days.' }
    ],
    ageScale: {
      current: 0.7,
      label: 'Weaning Stage'
    }
  },
  {
    id: 8,
    name: 'Interactive Play Mat',
    brand: 'Fisher-Price',
    price: '£55.00',
    image: '/assets/pexels-chidy-31141041.webp',
    tier: 'Essentials',
    stage: 'kid',
    isMostLoved: true,
    minMonth: 3,
    maxMonth: 12,
    category: 'Play',
    tags: [{ type: 'primary', text: 'Sensory' }],
    description: 'A soft, machine-washable play mat with overhead arches and 5 linkable toys to keep your baby engaged and developing.',
    specifications: [
      { label: 'Toys Included', value: '5 Sensory Toys' },
      { label: 'Washable', value: 'Yes, Machine Washable' },
      { label: 'Battery Required', value: 'Yes (for music)' }
    ],
    reviews: [
      { author: 'Sophie T.', rating: 5, childAge: '5 months', text: 'My baby loves the lights and music. Keeps her entertained for a good 20 mins!' }
    ],
    ageScale: {
      current: 0.4,
      label: 'Discovery Phase'
    }
  }
];

