import { mutation } from "./_generated/server";
import { faker } from "@faker-js/faker";
import { v } from "convex/values";

const CATEGORIES = {
  mother: ["Comfort", "Apparel", "Nursing", "Recovery"],
  newborn: ["Clothing", "Sleep", "Bath & Care", "Essentials"],
  kid: ["Play & Learn", "Weaning", "On the Move", "Safety"],
};

const BRANDS = [
  "Tommee Tippee", "Nuby", "Philips Avent", "Skip Hop", "Snuz", 
  "Mamas & Papas", "Silver Cross", "Cybex", "Beaba", "Haakaa", 
  "Medela", "Stokke"
];

const TIERS = ["essentials", "musthaves", "luxuries"];

export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    // Optional: Clear existing data? We'll just append for safety, 
    // or you could uncomment these to clear first.
    /*
    const existingProducts = await ctx.db.query("products").collect();
    for (const p of existingProducts) await ctx.db.delete(p._id);
    const existingReviews = await ctx.db.query("productReviews").collect();
    for (const r of existingReviews) await ctx.db.delete(r._id);
    */

    const productsWithZeroReviews: string[] = [];
    let productsCreated = 0;
    let reviewsCreated = 0;

    for (const [stage, categories] of Object.entries(CATEGORIES)) {
      for (const category of categories) {
        // Generate 5 products per category
        for (let i = 0; i < 5; i++) {
          const name = faker.commerce.productName();
          const slug = faker.helpers.slugify(name).toLowerCase() + "-" + faker.string.alphanumeric(4);
          const brand = faker.helpers.arrayElement(BRANDS);
          const tier = faker.helpers.arrayElement(TIERS);
          
          // Pricing in UGX: 10,000 to 500,000
          const price = faker.number.int({ min: 10000, max: 500000 });
          const wasPrice = faker.datatype.boolean() ? price + faker.number.int({ min: 5000, max: 50000 }) : undefined;

          // Image via Picsum
          const imageId = faker.number.int({ min: 1, max: 1000 });
          const image = `https://picsum.photos/400/400?random=${imageId}`;
          
          const images = [
            image,
            `https://picsum.photos/400/400?random=${faker.number.int({ min: 1, max: 1000 })}`,
            `https://picsum.photos/400/400?random=${faker.number.int({ min: 1, max: 1000 })}`,
            `https://picsum.photos/400/400?random=${faker.number.int({ min: 1, max: 1000 })}`,
            `https://picsum.photos/400/400?random=${faker.number.int({ min: 1, max: 1000 })}`,
          ];

          const isCurated = faker.datatype.boolean();
          const isMostLoved = faker.datatype.boolean();

          const productId = await ctx.db.insert("products", {
            name,
            brand,
            slug,
            price,
            wasPrice,
            image,
            images,
            stage,
            tier,
            category,
            isCurated,
            isMostLoved,
            description: faker.commerce.productDescription(),
            tags: [
              { type: "primary", text: faker.commerce.productAdjective() },
              { type: "secondary", text: "In Stock" }
            ],
            specifications: [
              { label: "Material", value: faker.commerce.productMaterial() },
              { label: "Color", value: faker.color.human() }
            ],
            isActive: true,
            unitsSold: faker.number.int({ min: 10, max: 500 }),
          });

          productsCreated++;

          // Vary number of reviews (0 to 5)
          const numReviews = faker.number.int({ min: 0, max: 5 });
          
          if (numReviews === 0) {
            productsWithZeroReviews.push(name);
          } else {
            for (let j = 0; j < numReviews; j++) {
              await ctx.db.insert("productReviews", {
                productId,
                author: faker.person.fullName(),
                rating: faker.number.int({ min: 1, max: 5 }),
                text: faker.lorem.paragraph(),
                childAge: faker.number.int({ min: 1, max: 36 }) + " months",
              });
              reviewsCreated++;
            }
          }
        }
      }
    }

    return {
      success: true,
      productsCreated,
      reviewsCreated,
      productsWithZeroReviewsCount: productsWithZeroReviews.length,
      productsWithZeroReviews
    };
  },
});

export const seedStagesAndTiers = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing stages so we re-seed with fresh data
    const existingStages = await ctx.db.query("stages").collect();
    for (const s of existingStages) {
      await ctx.db.delete(s._id);
    }
    
    await ctx.db.insert("stages", { 
      type: "mother", 
      title: "Expectant<br>&amp; New Mom", 
      eyebrow: "Stage 1", 
      subtext: "Hospital bag, postpartum recovery, feeding prep, and everything you need before baby arrives.", 
      heroImage: "/assets/stage_expectant.png", 
      href: "/category/mother", 
      order: 1 
    });
    await ctx.db.insert("stages", { 
      type: "newborn", 
      title: "Newborn<br>0–6 months", 
      eyebrow: "Stage 2", 
      subtext: "Safe sleep, feeding essentials, skin care, and gentle gear for the tiniest stage of all.", 
      heroImage: "/assets/stage_newborn.webp", 
      href: "/category/newborn", 
      order: 2 
    });
    await ctx.db.insert("stages", { 
      type: "kid", 
      title: "Baby<br>&amp; Toddler", 
      eyebrow: "Stage 3", 
      subtext: "Weaning, movement, play, and independence. Everything for curious, growing little ones.", 
      heroImage: "/assets/stage_toddler.webp", 
      href: "/category/kid", 
      order: 3 
    });

    // Clear existing tiers so we re-seed with fresh data
    const existingTiers = await ctx.db.query("tiers").collect();
    for (const t of existingTiers) {
      await ctx.db.delete(t._id);
    }
    
    await ctx.db.insert("tiers", { type: "essentials", title: "Essentials", badge: "Must-have", copy: "The basics", image: "https://picsum.photos/400/400?random=4", href: "/collection/essentials", order: 1 });
    await ctx.db.insert("tiers", { type: "musthaves", title: "Must-Haves", badge: "Highly recommended", copy: "Make life easier", image: "https://picsum.photos/400/400?random=5", href: "/collection/must-haves", order: 2 });
    await ctx.db.insert("tiers", { type: "luxuries", title: "Luxuries", badge: "Nice to have", copy: "Treat yourself", image: "https://picsum.photos/400/400?random=6", href: "/collection/luxuries", order: 3 });
    
    return { success: true };
  }
});

export const seedBrands = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing brands
    const existingBrands = await ctx.db.query("brands").collect();
    for (const b of existingBrands) {
      await ctx.db.delete(b._id);
    }

    const BRANDS_METADATA = [
      {
        name: "Tommee Tippee",
        slug: "tommee-tippee",
        logo: "/assets/tommee_tippee_logo_1777398496709.png",
        banner: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=1200",
        discount: "Up to 25% off",
        mission: "Helping you feed, sleep, and care for your baby with products designed for real life.",
        certifications: [
          { name: "BPA-Free", icon: "🧪" },
          { name: "Safety Tested", icon: "✅" },
          { name: "Oeko-Tex Standard", icon: "🌱" }
        ],
        story: {
          title: "Our History of Care",
          content: "For over 50 years, Tommee Tippee has been a trusted partner for parents worldwide. We started with a simple goal: to make life easier for new mums and dads. Today, we continue to innovate with safety and comfort at the heart of everything we do.",
          videoUrl: ""
        },
        order: 1
      },
      {
        name: "Nuby",
        slug: "nuby",
        logo: "/assets/nuby_logo_1777398511621.png",
        banner: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&q=80&w=1200",
        discount: "Up to 30% off",
        mission: "Making the lives of parents and babies easy, simple and fun.",
        certifications: [
          { name: "BPA-Free", icon: "🧪" },
          { name: "Orthodontic Approved", icon: "🦷" },
          { name: "Non-Toxic", icon: "🌿" }
        ],
        story: {
          title: "Designed with Love",
          content: "Nuby covers all key developmental stages of your baby's growth. Our high-quality, innovative designs are inspired by nature and created to make nursing, teething, and playing safe and comfortable for infants and toddlers alike.",
          videoUrl: ""
        },
        order: 2
      },
      {
        name: "Philips Avent",
        slug: "philips-avent",
        logo: "/assets/philips_avent_logo_1777398524587.png",
        banner: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&q=80&w=1200",
        discount: "Up to 20% off",
        mission: "Providing clinically-proven solutions that support baby's healthy development.",
        certifications: [
          { name: "Clinical Grade", icon: "🩺" },
          { name: "Anti-Colic Valve", icon: "💨" },
          { name: "BPA-Free", icon: "🧪" }
        ],
        story: {
          title: "Science & Care Combined",
          content: "Philips Avent has been designing and manufacturing products since 1984, inspired by nature and developed through extensive clinical research and trials. Our products are designed to work together to support your baby's natural development stages.",
          videoUrl: ""
        },
        order: 3
      },
      {
        name: "Skip Hop",
        slug: "skip-hop",
        logo: "/assets/skip_hop_logo_1777398591541.png",
        banner: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&q=80&w=1200",
        discount: "Up to 15% off",
        mission: "Must-Haves Made Better — smart, highly-functional products with sleek aesthetics.",
        certifications: [
          { name: "Ergonomic Design", icon: "📐" },
          { name: "Phthalate-Free", icon: "🛡️" },
          { name: "Lead-Free", icon: "🚫" }
        ],
        story: {
          title: "Smart Solutions for Modern Parents",
          content: "Founded in New York in 2003, Skip Hop rethinks, reenergizes and re-engineers essential parenting items. From diaper bags that clip easily to strollers to activity gyms that keep baby engaged, our designs focus on safety, utility, and modern aesthetics.",
          videoUrl: ""
        },
        order: 4
      },
      {
        name: "Snuz",
        slug: "snuz",
        logo: "/assets/snuz_logo_1777398603135.png",
        banner: "https://images.unsplash.com/photo-1544126592-807daa215a05?auto=format&fit=crop&q=80&w=1200",
        discount: "Up to 10% off",
        mission: "Creating stylish sleep solutions to help parents get the sleep they deserve.",
        certifications: [
          { name: "Lullaby Trust Partner", icon: "💤" },
          { name: "FSC Wood", icon: "🪵" },
          { name: "Oeko-Tex Standard 100", icon: "🌱" }
        ],
        story: {
          title: "The Ultimate Bedside Crib",
          content: "Snuz was born in 2014 with the launch of the ground-breaking SnuzPod bedside crib. Since then, we have grown to become sleep experts, creating beautiful, safe sleep environments and premium organic bedding sets designed to help sweet dreams come easily.",
          videoUrl: ""
        },
        order: 5
      },
      {
        name: "Mamas & Papas",
        slug: "mamas-and-papas",
        logo: "",
        banner: "https://images.unsplash.com/photo-1540479859555-17af45c78602?auto=format&fit=crop&q=80&w=1200",
        discount: "New Season Launch",
        mission: "Bringing Italian-inspired designer nursery items and clothing to families.",
        certifications: [
          { name: "British Safety Tested", icon: "🇬🇧" },
          { name: "Hypoallergenic Fabrics", icon: "🧴" },
          { name: "Award-Winning Comfort", icon: "🏆" }
        ],
        story: {
          title: "Shaped by Real Parents",
          content: "Mamas & Papas was founded by David and Luisa Scacchetti in 1981, who wanted a better class of baby products for their daughters. Today, we remain dedicated to using our personal experience as parents to shape the style and innovation of every nursery collection.",
          videoUrl: ""
        },
        order: 6
      },
      {
        name: "Silver Cross",
        slug: "silver-cross",
        logo: "",
        banner: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=1200",
        discount: "Premium Heritage",
        mission: "To give babies the best start in life with unmatched pram craftsmanship.",
        certifications: [
          { name: "Heritage Craftsmanship", icon: "⚜️" },
          { name: "Royal Trust Certified", icon: "👑" },
          { name: "Ultimate Safety", icon: "🔒" }
        ],
        story: {
          title: "The Original British Pram",
          content: "Established in 1877, Silver Cross is Britain's oldest and most loved nursery brand. Famed for our classic coach prams, we have spent nearly 150 years providing beautiful, luxurious travel systems and nursery furniture that protect and comfort your little ones.",
          videoUrl: ""
        },
        order: 7
      },
      {
        name: "Cybex",
        slug: "cybex",
        logo: "",
        banner: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=1200",
        discount: "State-of-the-art Safety",
        mission: "Delivering the safest, most fashion-forward car seats and strollers for modern urbanites.",
        certifications: [
          { name: "ADAC Top Rated", icon: "🛡️" },
          { name: "Red Dot Design Winner", icon: "🎨" },
          { name: "CYBEX D.S.F. Standard", icon: "⚡" }
        ],
        story: {
          title: "Safety, Design & Functionality",
          content: "Cybex offers car seats, baby carriers, and strollers that are not only safe but perfectly adapt to urban lifestyles. At the core of the brand is our D.S.F. Innovation Principle: the combination of unique Design, unsurpassed Safety and quality, and intelligent Functionality.",
          videoUrl: ""
        },
        order: 8
      },
      {
        name: "Beaba",
        slug: "beaba",
        logo: "/assets/beaba_logo_1777398614779.png",
        banner: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=1200",
        discount: "Up to 25% off",
        mission: "Helping parents prepare fresh, nutritious meals quickly with French design elegance.",
        certifications: [
          { name: "Food Grade Materials", icon: "🍽️" },
          { name: "BPA & Lead Free", icon: "🧪" },
          { name: "French Design Quality", icon: "🇫🇷" }
        ],
        story: {
          title: "The Weaning Pioneer",
          content: "Since 1989, French brand BÉABA has been dedicated to simplifying the lives of busy parents. With the creation of the Babycook — the original 4-in-1 baby food maker — BÉABA set a global standard for preparing healthy, homemade baby food easily and in minutes.",
          videoUrl: ""
        },
        order: 9
      },
      {
        name: "Haakaa",
        slug: "haakaa",
        logo: "",
        banner: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&q=80&w=1200",
        discount: "Eco-Friendly Choice",
        mission: "100% eco-friendly, medical-grade silicone breastfeeding essentials.",
        certifications: [
          { name: "100% Medical Silicone", icon: "🩺" },
          { name: "Zero Plastics", icon: "🌱" },
          { name: "Eco-Friendly Packaging", icon: "📦" }
        ],
        story: {
          title: "Simple, Natural & Safe",
          content: "Haakaa is a family-owned baby brand that provides natural, eco-friendly, and non-toxic baby products. Originating in New Zealand, Haakaa was born out of a desire to create plastic-free, safe essentials that protect our babies and the planet.",
          videoUrl: ""
        },
        order: 10
      },
      {
        name: "Medela",
        slug: "medela",
        logo: "",
        banner: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=1200",
        discount: "Hospital Grade Quality",
        mission: "Supporting mothers' breastfeeding journeys with research-backed technology.",
        certifications: [
          { name: "Hospital Recommended", icon: "🏥" },
          { name: "Swiss Engineering", icon: "🇨🇭" },
          { name: "BPA-Free Shielding", icon: "🧪" }
        ],
        story: {
          title: "The Science of Care",
          content: "Founded in Switzerland in 1961, Medela is a global leader in breast pumps and medical vacuum technology. We invest heavily in research-based solutions that closely mimic babies' natural sucking patterns, helping millions of mothers feed their babies longer.",
          videoUrl: ""
        },
        order: 11
      },
      {
        name: "Stokke",
        slug: "stokke",
        logo: "",
        banner: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1200",
        discount: "Lifetime Craftsmanship",
        mission: "Designing items that grow with your child and strengthen the parent-child bond.",
        certifications: [
          { name: "Ergonomic Certified", icon: "📐" },
          { name: "Sustainable Forests", icon: "🌲" },
          { name: "Lifetime Warranty Wood", icon: "🛡️" }
        ],
        story: {
          title: "Designed to Grow With You",
          content: "Founded in Ålesund, Norway in 1932, Stokke specializes in premium Scandinavian children's furniture and strollers. With the introduction of the legendary Tripp Trapp high chair in 1972, we pioneered chairs that bring baby right to the family table, adapting as they grow.",
          videoUrl: ""
        },
        order: 12
      }
    ];

    for (const b of BRANDS_METADATA) {
      await ctx.db.insert("brands", b);
    }

    return { success: true, count: BRANDS_METADATA.length };
  }
});

export const seedCoupons = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing coupons
    const existing = await ctx.db.query("coupons").collect();
    for (const c of existing) {
      await ctx.db.delete(c._id);
    }

    const COUPONS = [
      {
        code: "MOMMYUG",
        discountType: "percentage" as const,
        discountValue: 10, // 10% Off
        expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000, // 60 days
        isActive: true,
        usageCount: 0,
      },
      {
        code: "WELCOME10",
        discountType: "fixed" as const,
        discountValue: 10000, // UGX 10,000 Off
        expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
        isActive: true,
        usageCount: 0,
      },
      {
        code: "DENNAN20",
        discountType: "percentage" as const,
        discountValue: 20, // 20% Off
        minSpend: 100000, // Min spend UGX 100,000
        expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
        isActive: true,
        usageCount: 0,
      },
    ];

    for (const c of COUPONS) {
      await ctx.db.insert("coupons", c);
    }

    return { success: true, count: COUPONS.length };
  },
});

export const seedReels = mutation({
  args: {
    reels: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    // Clear existing reels and reelProducts
    const existingReels = await ctx.db.query("reels").collect();
    for (const r of existingReels) {
      await ctx.db.delete(r._id);
    }
    const existingReelProducts = await ctx.db.query("reelProducts").collect();
    for (const rp of existingReelProducts) {
      await ctx.db.delete(rp._id);
    }

    // Insert each reel and its nested products
    for (let i = 0; i < args.reels.length; i++) {
      const reelData = args.reels[i];
      
      const reelId = await ctx.db.insert("reels", {
        label: reelData.label,
        caption: reelData.caption,
        image: reelData.image,
        badge: reelData.badge,
        multiChip: reelData.multiChip,
        order: i + 1,
      });

      if (reelData.products && Array.isArray(reelData.products)) {
        for (const prod of reelData.products) {
          let linkedProductId;
          const matchName = prod.title || prod.name;
          if (matchName) {
            const canonicalProducts = await ctx.db.query("products").collect();
            const found = canonicalProducts.find(
              p => p.name.toLowerCase() === matchName.toLowerCase() || 
                   p.name.toLowerCase().includes(matchName.toLowerCase())
            );
            if (found) {
              linkedProductId = found._id;
            }
          }

          await ctx.db.insert("reelProducts", {
            reelId,
            productId: linkedProductId,
            title: prod.title || prod.name || "Product",
            price: prod.price || "",
            options: prod.options,
            image: prod.image,
          });
        }
      }
    }
    return { success: true, count: args.reels.length };
  },
});

export const backfillUnitsSold = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let updatedCount = 0;
    for (const p of products) {
      if (p.unitsSold === undefined) {
        await ctx.db.patch(p._id, { unitsSold: 0 });
        updatedCount++;
      }
    }
    return { success: true, updatedCount };
  }
});


