export const brands = {
  'tommee-tippee': {
    id: 'tommee-tippee',
    name: 'Tommee Tippee',
    logo: '/assets/brands/tommee_tippee_logo.png', // Placeholder
    banner: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=2000', // Lifestyle banner
    mission: 'Helping you feed, sleep, and care for your baby with products designed for real life.',
    certifications: [
      { name: 'BPA-Free', icon: '🧪' },
      { name: 'Oeko-Tex Certified', icon: '🌱' },
      { name: 'Safety Tested', icon: '✅' }
    ],
    story: {
      title: 'Our History of Care',
      content: 'For over 50 years, Tommee Tippee has been a trusted partner for parents worldwide. We started with a simple goal: to make life easier for new mums and dads. Today, we continue to innovate with safety and comfort at the heart of everything we do.',
      videoUrl: '#'
    },
    products: [
      {
        id: 1,
        name: 'Closer to Nature Baby Bottles',
        price: '£18.99',
        wasPrice: '£24.99',
        image: '/new_assets/Tommee Tippee Closer to Nature Starter Set.jfif',
        tier: 'Essentials',
        stage: 'newborn',
        deliveryTime: 'Ships in 2 hours',
        tags: [{ type: 'primary', text: '1k + sold' }, { type: 'accent', text: '25% OFF' }]
      },
      {
        id: 2,
        name: 'Perfect Prep Day & Night',
        price: '£130.00',
        image: '/new_assets/Tommee Tippee Closer to Nature Starter Set.jfif', // Reusing for dummy
        tier: 'Must-Haves',
        stage: 'newborn',
        deliveryTime: 'Ships in 2 hours',
        tags: [{ type: 'primary', text: 'Best Seller' }]
      },
      {
        id: 3,
        name: 'Explora Weaning Sippee Cup',
        price: '£6.99',
        image: '/new_assets/Tommee Tippee Closer to Nature Starter Set.jfif',
        tier: 'Essentials',
        stage: 'toddler',
        deliveryTime: 'Ships in 2 hours',
        tags: [{ type: 'primary', text: 'Easy Clean' }]
      }
    ]
  }
};

