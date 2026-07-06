export const staticData = {
  hero: {
    headline: "Curated essentials for your baby's first years.",
    subcopy: "Curated checklists and essentials for expectant and new mothers — thoughtfully tiered so you always know what truly matters.",
    backgroundImage: "/assets/hero.webp",
    trending: {
      label: "Trending now",
      value: "Newborn Starter Set"
    },
    heritageCards: [
      {
        id: 1,
        icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
        stat: "13+",
        statClass: "orchid",
        label: "years",
        desc: "Supporting parents since 2013."
      },
      {
        id: 2,
        icon: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.9A8.38 8.38 0 0 1 4 11.3a8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
        stat: "1M+",
        statClass: "plum",
        label: "likes on tiktok",
        desc: "Sharing moments with parents."
      },
      {
        id: 3,
        icon: "instagram",
        stat: "330k+",
        statClass: "green",
        label: "Parents",
        desc: "Growing daily community."
      }
    ]
  },
  trustItems: [
    {
      id: 1,
      icon: "clock",
      type: "blue",
      title: "13 years",
      sub: "Started in 2013, we’ve supported parents for over 12 years."
    },
    {
      id: 2,
      icon: "tiktok",
      type: "secondary",
      title: "183,000 followers",
      sub: "We’ve been liked over 1 million times on TikTok."
    },
    {
      id: 3,
      icon: "instagram",
      type: "primary",
      title: "82,000 followers",
      sub: "We’ve been viewed hundreds of thousands of times on Instagram."
    },
    {
      id: 4,
      icon: "users",
      type: "yellow",
      title: "Too much love",
      sub: "267,000+ people follow our journey."
    }
  ],
  dashboard: {
    milestones: {
      expecting: [
        { label: "Conception", week: 0 },
        { label: "1st Trimester", week: 12 },
        { label: "2nd Trimester", week: 27 },
        { label: "3rd Trimester", week: 36 },
        { label: "Due Date", week: 40 }
      ],
      newborn: [
        { label: "Birth", month: 0 },
        { label: "6 Months", month: 6 },
        { label: "1 Year", month: 12 },
        { label: "18 Months", month: 18 },
        { label: "2 Years", month: 24 }
      ]
    },
    badges: {
      expecting: [
        { id: "start", label: "Journey Started" },
        { id: "trim2", label: "2nd Trimester", minWeek: 12 },
        { id: "trim3", label: "3rd Trimester", minWeek: 27 },
        { id: "due", label: "Due Date Reached", minWeek: 40 }
      ],
      newborn: [
        { id: "birth", label: "Newborn" },
        { id: "6m", label: "6 Months", minMonth: 6 },
        { id: "1y", label: "First Birthday", minMonth: 12 },
        { id: "2y", label: "Toddler", minMonth: 24 }
      ]
    },
    nextMilestone: {
      expecting: [
        { minWeek: 0, maxWeek: 11, title: "First Scan", desc: "Preparing for your first look at your little one. Time to start the registry!", action: "Start Registry" },
        { minWeek: 12, maxWeek: 26, title: "Nursery Setup", desc: "You’re entering the golden trimester. Perfect time to paint and prep.", action: "Shop Decor" },
        { minWeek: 27, maxWeek: 40, title: "Hospital Bag", desc: "The countdown is on. Let’s make sure you have everything for the big day.", action: "Bag Checklist" }
      ],
      newborn: [
        { minMonth: 0, maxMonth: 5, title: "First Solids", desc: "Ready for the big switch? High chairs and soft spoons await.", action: "Explore Weaning" },
        { minMonth: 6, maxMonth: 11, title: "First Steps", desc: "Time for sturdy shoes and baby-proofing the living room.", action: "Baby Proofing" },
        { minMonth: 12, maxMonth: 24, title: "Toddler Transition", desc: "Moving to a big kid bed? We have the softest transition sets.", action: "Shop Bedding" }
      ]
    },
    checklists: {
      expecting: [
        { id: "item1", label: "Pack the hospital bag essentials" },
        { id: "item2", label: "Install the car seat (ISOFIX check)" },
        { id: "item3", label: "Finalize the nursery lighting" }
      ],
      newborn: [
        { id: "item1", label: "Schedule first pediatrician visit" },
        { id: "item2", label: "Tummy time training" },
        { id: "item3", label: "Sleep routine establishment" }
      ]
    },
    editorial: {
      title: "Sleep & Recovery",
      text: "Handling the 4-month sleep regression doesn't have to be a solo journey.",
      btnText: "Read 2-min Guide"
    }
  },
  checkout: {
    steps: [
      { id: "cart", label: "Cart" },
      { id: "payment", label: "Payment" },
      { id: "confirmation", label: "Confirmation" }
    ],
    confirmation: {
      promos: [
        { id: "profile", title: "Save Profile", desc: "Track your toddler's growth with a personalized dashboard.", action: "Create Account →" },
        { id: "review", title: "Leave a Review", desc: "Share your experience with other parents and earn 50 loyalty points.", action: "Write a Review →" }
      ]
    },
    tracking: {
      stages: [
        { id: 0, title: "Order Received", subtitle: "Confirmed at our warehouse" },
        { id: 1, title: "Packing your Gear", subtitle: "Checking quality of your items" },
        { id: 2, title: "Rider Dispatched", subtitle: "The order is on the bike" },
        { id: 3, title: "Nearby", subtitle: "Rider is within 2–5km of you" },
        { id: 4, title: "Delivered", subtitle: "Success!" }
      ],
      rider: {
        name: "Moses K.",
        photo: "/assets/rider_moses.png",
        bike: "Yamaha FZ (UFE 452C)",
        rating: 4.9,
        phone: "+256700000000"
      }
    },
    delivery: {
      zones: {
        Kololo: 30,
        Buziga: 50,
        Mukono: 90,
        Ntinda: 45,
        Lubowa: 55,
        Kiwatule: 40,
        Default: 60
      },
      landmarks: [
        { name: "Kiruddu General Hospital", sub: "Buziga", zone: "Buziga" },
        { name: "Kiruddu-Bunamwaya Rd", sub: "Buziga", zone: "Buziga" },
        { name: "Village Mall", sub: "Bugolobi", zone: "Ntinda" },
        { name: "Acacia Mall", sub: "Kololo", zone: "Kololo" },
        { name: "Garden City", sub: "Central", zone: "Kololo" },
        { name: "Sheraton Hotel", sub: "Central", zone: "Kololo" },
        { name: "Mulago Hospital", sub: "Mulago", zone: "Kololo" },
        { name: "Game Lugogo", sub: "Lugogo", zone: "Kololo" }
      ],
      history: [
        { name: "Home (Kiwatule)", zone: "Kiwatule" },
        { name: "Work (Kololo)", zone: "Kololo" }
      ],
      suggestions: [
        { name: "Kiruddu General Hospital", sub: "Buziga", zone: "Buziga" },
        { name: "Kiruddu-Bunamwaya Rd", sub: "Buziga", zone: "Buziga" },
        { name: "Village Mall", sub: "Bugolobi", zone: "Ntinda" }
      ]
    }
  },
  collections: {
    "curated-picks": {
      id: "curated-picks",
      title: "Curated Picks for You",
      subtext: "Hand-selected by our experts and tailored to your unique parenting style.",
      heroImage: "/new_assets/Motherhood.webp"
    },
    "most-loved": {
      id: "most-loved",
      title: "Most Loved by Parents",
      subtext: "The highest-rated essentials as voted by our community of mothers and fathers.",
      heroImage: "/new_assets/Newborn.webp"
    },
    "essentials": {
      id: "essentials",
      title: "The Essentials",
      subtext: "The non-negotiables for safety, feeding, and sleep. Every home needs these.",
      heroImage: "/new_assets/Care.webp"
    },
    "must-haves": {
      id: "must-haves",
      title: "Must-Haves for Parents",
      subtext: "Quality items that make an enormous difference to your daily life.",
      heroImage: "/assets/feeding_nursing.png"
    },
    "luxuries": {
      id: "luxuries",
      title: "The Luxury Edit",
      subtext: "Premium picks beautifully made for when only the best will do.",
      heroImage: "/assets/hero.webp"
    }
  }
};
