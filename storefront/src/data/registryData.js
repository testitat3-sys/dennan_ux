export const registryProfile = {
  id: 'registry-123',
  ownerName: 'Sarah & Mike',
  eventName: "Baby Miller's Arrival",
  eventDate: '2026-07-15',
  dueDate: '2026-07-20',
  stage: 'expectant',
  message: "We're so excited to welcome our little one! Thank you for being part of our journey.",
  privacy: 'public', // public, hidden, private
  address: {
    city: 'London',
    postcode: 'SW1A 1AA',
    fullAddress: '123 Kensington High St, London, SW1A 1AA' // Partially hidden for guests
  }
};

export const registryItems = [
  {
    id: 'ri-1',
    productId: 2,
    name: 'SnüzPod 4 Bedside Crib',
    price: 199.00,
    image: '/assets/SnüzPod 4 Bedside Crib - White.jfif',
    category: 'Nursery',
    isMustHave: true,
    status: 'available', // available, purchased
    requestedQuantity: 1,
    purchasedQuantity: 0,
    isGroupGifting: true,
    contributions: [
      { name: 'Aunt Jane', amount: 50, date: '2026-05-01' }
    ]
  },
  {
    id: 'ri-2',
    productId: 5,
    name: 'Skip Hop Forma Backpack',
    price: 75.00,
    image: '/assets/Skip Hop Forma Backpack Nappy Bag.jfif',
    category: 'Gear',
    isMustHave: true,
    status: 'purchased',
    requestedQuantity: 1,
    purchasedQuantity: 1,
    isGroupGifting: false,
    purchasedBy: {
      name: 'Emma Wilson',
      email: 'emma@example.com',
      date: '2026-04-28'
    }
  },
  {
    id: 'ri-3',
    productId: 1,
    name: 'Closer to Nature Baby Bottles',
    price: 18.99,
    image: '/assets/Tommee Tippee Closer to Nature Starter Set.jfif',
    category: 'Feeding',
    isMustHave: false,
    status: 'available',
    requestedQuantity: 2,
    purchasedQuantity: 0,
    isGroupGifting: false
  },
  {
    id: 'ri-4',
    productId: 3,
    name: 'Organic Cotton Starter Set',
    price: 45.00,
    image: '/assets/Organic Cotton Starter Set.jfif',
    category: 'Apparel',
    isMustHave: false,
    status: 'available',
    requestedQuantity: 1,
    purchasedQuantity: 0,
    isGroupGifting: false
  },
  {
    id: 'ri-5',
    productId: 6,
    name: 'BÉABA Babycook Neo',
    price: 160.00,
    image: '/assets/BÉABA Babycook Neo Food Blender.jfif',
    category: 'Feeding',
    isMustHave: false,
    status: 'available',
    requestedQuantity: 1,
    purchasedQuantity: 0,
    isGroupGifting: true,
    contributions: []
  }
];

export const thankYouNotes = [
  {
    id: 'ty-1',
    registryItemId: 'ri-2',
    gifterName: 'Emma Wilson',
    giftName: 'Skip Hop Forma Backpack',
    status: 'pending', // pending, sent
    contact: 'emma@example.com'
  }
];

