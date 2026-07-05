import { mutation } from "./_generated/server";
import { v } from "convex/values";

// 84 new products from convex_products.json with actual_data = true
export const NEW_PRODUCTS = [
  {
    "name": "Tommee Tippee Insulated Bottle Bags",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-insulated-bottle-bags",
    "barcode": "2017424",
    "price": 90000,
    "originalPrice": 90000,
    "description": "A set of 2 insulated bags designed to keep baby bottles at the desired temperature while on the go.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Travel"
      },
      {
        "type": "general",
        "text": "Bottle Accessories"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "2 Pieces"
      },
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189592/Tommee_Tippee_2Pcs_Insulated_Bottle_Bags_ko3pcj.jpg",
    "category": "Travel Must-Haves"
  },
  {
    "name": "Medela Breastmilk Storage Bottles",
    "brand": "Medela",
    "slug": "medela-breastmilk-storage-bottles",
    "barcode": "20210818",
    "price": 45000,
    "originalPrice": 45000,
    "description": "Durable, 250ml storage bottles ideal for collecting, storing, and freezing breastmilk.",
    "tags": [
      {
        "type": "general",
        "text": "Breastfeeding"
      },
      {
        "type": "general",
        "text": "Storage"
      },
      {
        "type": "general",
        "text": "Mother"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "2 Pieces"
      },
      {
        "label": "Brand",
        "value": "Medela"
      },
      {
        "label": "Size",
        "value": "250ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "mother",
    "size": "250ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189584/Medela_Breastmilk_Storage_Bottles_250Ml_2Pc_-_wxydqe.webp",
    "category": "Expectant and New Mom Essentials"
  },
  {
    "name": "Momcozy Ultra-Thin Disposable Nursing Pads",
    "brand": "Momcozy",
    "slug": "momcozy-ultra-thin-disposable-nursing-pads",
    "barcode": "20250644",
    "price": 60000,
    "originalPrice": 60000,
    "description": "Highly absorbent, ultra-thin pads for discreet leakage protection for nursing mothers.",
    "tags": [
      {
        "type": "general",
        "text": "Breastfeeding"
      },
      {
        "type": "general",
        "text": "Nursing Pads"
      },
      {
        "type": "general",
        "text": "Mother"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "60 Pieces"
      },
      {
        "label": "Brand",
        "value": "Momcozy"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "mother",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189587/Momcozy_Ultra-Thin_Disposable_Nursing_Pads_60Pc_-_ht5lfq.jpg",
    "category": "Expectant and New Mom Essentials"
  },
  {
    "name": "Momcozy Ultra-Thin Disposable Nursing Pads",
    "brand": "Momcozy",
    "slug": "momcozy-ultra-thin-disposable-nursing-pads-1",
    "barcode": "20250645",
    "price": 90000,
    "originalPrice": 90000,
    "description": "High-value pack of ultra-thin, absorbent nursing pads for long-term comfort.",
    "tags": [
      {
        "type": "general",
        "text": "Breastfeeding"
      },
      {
        "type": "general",
        "text": "Nursing Pads"
      },
      {
        "type": "general",
        "text": "Mother"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "120 Pieces"
      },
      {
        "label": "Brand",
        "value": "Momcozy"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "mother",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189588/Momcozy_Ultra-Thin_Disposable_Nursing_Pads_120Pc_-_n8nev4.jpg",
    "category": "Expectant and New Mom Essentials"
  },
  {
    "name": "Avent Phillips Natural Starter Set",
    "brand": "Philips Avent",
    "slug": "avent-phillips-natural-starter-set",
    "barcode": "20174719",
    "price": 195000,
    "originalPrice": 195000,
    "description": "A comprehensive 6-piece starter set containing essentials to get started with natural bottle feeding.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Starter Set"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "6 Pieces"
      },
      {
        "label": "Brand",
        "value": "Philips Avent"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189564/Avent_Phillips_Natural_6Pc_Starter_Set_ecoaat.jpg",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Dr Brown Deluxe Starter Kit",
    "brand": "Dr Brown's",
    "slug": "dr-brown-deluxe-starter-kit",
    "barcode": "20180626",
    "price": 165000,
    "originalPrice": 165000,
    "description": "A complete kit including bottles and accessories designed to help reduce colic and feeding discomfort.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Anti-Colic"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dr Brown's"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189577/Dr_Brown_Deluxe_Starter_Kit_ciscmk.jpg",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Dr Browns Anti-Colic Bottle",
    "brand": "Dr Brown's",
    "slug": "dr-browns-anti-colic-bottle",
    "barcode": "20250444",
    "price": 40000,
    "originalPrice": 40000,
    "description": "A small 60ml bottle with an internal vent system specifically designed to reduce colic symptoms.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Anti-Colic"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "1 Piece"
      },
      {
        "label": "Brand",
        "value": "Dr Brown's"
      },
      {
        "label": "Size",
        "value": "60ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "60ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189577/Dr_Browns_Anti-Colic_Bottle_60Ml_1Pc_-_kkjtaq.jpg",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Avent Bottle Natural",
    "brand": "Philips Avent",
    "slug": "avent-bottle-natural",
    "barcode": "20250647",
    "price": 55000,
    "originalPrice": 55000,
    "description": "A 330ml bottle designed with a natural-shaped teat to make combining breast and bottle feeding easier.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "1 Piece"
      },
      {
        "label": "Brand",
        "value": "Philips Avent"
      },
      {
        "label": "Size",
        "value": "330ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "330ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189562/Avent_Bottle_Natural_1Pc_330Ml_-_dae81v.jpg",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Avent Reusable Breast Milk Storage Cups",
    "brand": "Philips Avent",
    "slug": "avent-reusable-breast-milk-storage-cups",
    "barcode": "201741190",
    "price": 95000,
    "originalPrice": 95000,
    "description": "A 10-piece set of reusable cups for safe and convenient breastmilk storage.",
    "tags": [
      {
        "type": "general",
        "text": "Breastfeeding"
      },
      {
        "type": "general",
        "text": "Storage"
      },
      {
        "type": "general",
        "text": "Mother"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "10 Pieces"
      },
      {
        "label": "Brand",
        "value": "Philips Avent"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "mother",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189563/Avent_10Pc_Reusable_Breast_Milk_Storage_Cups_cklzke.jpg",
    "category": "Expectant and New Mom Essentials"
  },
  {
    "name": "Munchkin Fold Drying Rack",
    "brand": "Munchkin",
    "slug": "munchkin-fold-drying-rack",
    "barcode": "201801283",
    "price": 54000,
    "originalPrice": 60000,
    "description": "A space-saving, foldable drying rack for bottles, teats, and cups.",
    "tags": [
      {
        "type": "general",
        "text": "Cleaning"
      },
      {
        "type": "general",
        "text": "Drying Rack"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Munchkin"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189588/Munchkin_Fold_Drying_Rack_j605sc.jpg",
    "wasPrice": 60000,
    "discountPrice": 54000,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Decorated Bottles",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-decorated-bottles",
    "barcode": "20240798",
    "price": 35000,
    "originalPrice": 35000,
    "description": "Stylish, decorated 250ml bottles suitable for everyday feeding needs.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "2 Pieces"
      },
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      },
      {
        "label": "Size",
        "value": "250ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "250ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189594/Tommee_Tippee_Decorated_2Pc_250Ml_Bottles_-_wsarep.webp",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Natural Start Advanced Anti-Colic Bottle",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-natural-start-advanced-anti-colic-bottle",
    "barcode": "20240896",
    "price": 45000,
    "originalPrice": 45000,
    "description": "A 150ml anti-colic bottle designed to mimic the natural feel and flow of breastfeeding.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Anti-Colic"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "1 Piece"
      },
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      },
      {
        "label": "Size",
        "value": "150ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "150ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189596/Tommee_Tippee_Natural_Start_Advanced_Anti-Colic_Bottles_150Ml_1Pc_-_o71dij.jpg",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Natural Start Advanced Anti-Colic Bottles",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-natural-start-advanced-anti-colic-bottles",
    "barcode": "20240899",
    "price": 76500,
    "originalPrice": 85000,
    "description": "A 2-pack of 260ml anti-colic bottles, perfect for growing babies.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Anti-Colic"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "2 Pieces"
      },
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      },
      {
        "label": "Size",
        "value": "260ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "260ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189595/Tommee_Tippee_Natural_Start_Advanced_Ant-Colic_Bottles_260Ml_2Pc_-_sjzgso.jpg",
    "wasPrice": 85000,
    "discountPrice": 76500,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Colourless Bottles",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-colourless-bottles",
    "barcode": "201741001",
    "price": 67500,
    "originalPrice": 75000,
    "description": "A 2-pack of large 340ml bottles, offering a simple and effective design for daily feeds.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "2 Pieces"
      },
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      },
      {
        "label": "Size",
        "value": "340ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "340ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189593/Tommee_Tippee_2Pc_Colourless_Bottles_340Ml_plmcp8.png",
    "wasPrice": 75000,
    "discountPrice": 67500,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Dalin Comfort & Happy Baby Shampoo & Bodywash",
    "brand": "Dalin",
    "slug": "dalin-comfort-happy-baby-shampoo-bodywash",
    "barcode": "2026031",
    "price": 35000,
    "originalPrice": 35000,
    "description": "A gentle, large-sized 2-in-1 shampoo and body wash for daily baby hygiene.",
    "tags": [
      {
        "type": "general",
        "text": "Bathing"
      },
      {
        "type": "general",
        "text": "Shampoo"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dalin"
      },
      {
        "label": "Size",
        "value": "700ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "700ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189574/Dalin_Comfort_Happy_Baby_Shampoo_Bodywash_700Ml_fuppap.jpg",
    "category": "Bathing and Changing"
  },
  {
    "name": "Dalin Moisture & Protect Baby Shampoo & Bodywash",
    "brand": "Dalin",
    "slug": "dalin-moisture-protect-baby-shampoo-bodywash",
    "barcode": "2026032",
    "price": 29750,
    "originalPrice": 35000,
    "description": "Specially formulated 2-in-1 cleanser to moisturize and protect baby's delicate skin.",
    "tags": [
      {
        "type": "general",
        "text": "Bathing"
      },
      {
        "type": "general",
        "text": "Shampoo"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dalin"
      },
      {
        "label": "Size",
        "value": "700ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "700ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189576/Dalin_Moisture_Protect_Baby_Shampoo_Bodywash_700Ml_lcl8ja.webp",
    "wasPrice": 35000,
    "discountPrice": 29750,
    "category": "Bathing and Changing"
  },
  {
    "name": "Dalin Chamomile Extra Baby Shampoo & Bodywash",
    "brand": "Dalin",
    "slug": "dalin-chamomile-extra-baby-shampoo-bodywash",
    "barcode": "2026033",
    "price": 29750,
    "originalPrice": 35000,
    "description": "A large 700ml cleanser enriched with chamomile extract for a soothing bath experience.",
    "tags": [
      {
        "type": "general",
        "text": "Bathing"
      },
      {
        "type": "general",
        "text": "Shampoo"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dalin"
      },
      {
        "label": "Size",
        "value": "700ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "700ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189574/Dalin_Chamomile_Extra_Baby_Shampoo_Bodywash_700Ml_itx07i.webp",
    "wasPrice": 35000,
    "discountPrice": 29750,
    "category": "Bathing and Changing"
  },
  {
    "name": "Dalin Chamomile Extra Baby Shampoo & Bodywash",
    "brand": "Dalin",
    "slug": "dalin-chamomile-extra-baby-shampoo-bodywash-1",
    "barcode": "2026034",
    "price": 23800,
    "originalPrice": 28000,
    "description": "A gentle 500ml shampoo and body wash containing soothing chamomile extract.",
    "tags": [
      {
        "type": "general",
        "text": "Bathing"
      },
      {
        "type": "general",
        "text": "Shampoo"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dalin"
      },
      {
        "label": "Size",
        "value": "500ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "500ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189573/Dalin_Chamomile_Extra_Baby_Shampoo_Bodywash_500Ml_-_ceezao.webp",
    "wasPrice": 28000,
    "discountPrice": 23800,
    "category": "Bathing and Changing"
  },
  {
    "name": "Dalin Detangling Shampoo",
    "brand": "Dalin",
    "slug": "dalin-detangling-shampoo",
    "barcode": "2026037",
    "price": 27200,
    "originalPrice": 32000,
    "description": "A specialized shampoo formulated to make combing through kid's hair easier and tear-free.",
    "tags": [
      {
        "type": "general",
        "text": "Haircare"
      },
      {
        "type": "general",
        "text": "Detangling"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dalin"
      },
      {
        "label": "Size",
        "value": "700ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "700ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189574/Dalin_Detangling_Shampoo_700Ml_c9rxrm.webp",
    "wasPrice": 32000,
    "discountPrice": 27200,
    "category": "Bathing and Changing"
  },
  {
    "name": "Dalin Detangling Shampoo Spray",
    "brand": "Dalin",
    "slug": "dalin-detangling-shampoo-spray",
    "barcode": "2026038",
    "price": 21250,
    "originalPrice": 25000,
    "description": "An easy-to-use detangling spray to manage knots and tangles in hair.",
    "tags": [
      {
        "type": "general",
        "text": "Haircare"
      },
      {
        "type": "general",
        "text": "Detangling"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dalin"
      },
      {
        "label": "Size",
        "value": "200ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "200ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189575/Dalin_Detangling_Shampoo_Spray_200Ml_zkxftd.webp",
    "wasPrice": 25000,
    "discountPrice": 21250,
    "category": "Bathing and Changing"
  },
  {
    "name": "Dalin Baby Giftset With Wipes",
    "brand": "Dalin",
    "slug": "dalin-baby-giftset-with-wipes",
    "barcode": "2026040",
    "price": 65000,
    "originalPrice": 65000,
    "description": "A convenient gift set featuring essential baby care items and wet wipes.",
    "tags": [
      {
        "type": "general",
        "text": "Giftset"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dalin"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189571/Dalin_Baby_Giftset_With_Wipes_unlm3w.webp",
    "category": "Newborn Essentials & Kids Apparel/Footwear"
  },
  {
    "name": "Dalin Baby Giftset",
    "brand": "Dalin",
    "slug": "dalin-baby-giftset",
    "barcode": "2026041",
    "price": 75000,
    "originalPrice": 75000,
    "description": "A thoughtfully curated gift set perfect for new parents and newborns.",
    "tags": [
      {
        "type": "general",
        "text": "Giftset"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dalin"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189571/Dalin_Baby_Giftset_bbxpyz.jpg",
    "category": "Newborn Essentials & Kids Apparel/Footwear"
  },
  {
    "name": "Friendly Organic Baby Laundry Powder",
    "brand": "Friendly Organic",
    "slug": "friendly-organic-baby-laundry-powder",
    "barcode": "2026046",
    "price": 50000,
    "originalPrice": 50000,
    "description": "An organic, eco-friendly laundry powder formulated specifically for baby's clothes.",
    "tags": [
      {
        "type": "general",
        "text": "Laundry"
      },
      {
        "type": "general",
        "text": "Organic"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Friendly Organic"
      },
      {
        "label": "Size",
        "value": "1kg"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "1kg",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189579/Friendly_Organic_Baby_Laundry_Powder_1Kg_u9rsxc.jpg",
    "category": "Bathing and Changing"
  },
  {
    "name": "Friendly Organic Baby Laundry Detergent",
    "brand": "Friendly Organic",
    "slug": "friendly-organic-baby-laundry-detergent",
    "barcode": "2026047",
    "price": 65000,
    "originalPrice": 65000,
    "description": "Gentle and organic liquid detergent designed to be safe for sensitive baby skin.",
    "tags": [
      {
        "type": "general",
        "text": "Laundry"
      },
      {
        "type": "general",
        "text": "Organic"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Friendly Organic"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189578/Friendly_Organic_Baby_Laundry_Detergent_wwpzed.jpg",
    "category": "Bathing and Changing"
  },
  {
    "name": "Friendly Organic Baby Laundry Detergent Fragrance Free",
    "brand": "Friendly Organic",
    "slug": "friendly-organic-baby-laundry-detergent-fragrance-free",
    "barcode": "2026048",
    "price": 60000,
    "originalPrice": 60000,
    "description": "A fragrance-free, organic liquid detergent, ideal for babies with severe sensitivities.",
    "tags": [
      {
        "type": "general",
        "text": "Laundry"
      },
      {
        "type": "general",
        "text": "Organic"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Friendly Organic"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189578/Friendly_Organic_Baby_Laundry_Detergent_Fragrence_Free_x3hvoj.jpg",
    "category": "Bathing and Changing"
  },
  {
    "name": "Friendly Organic Fabric Softener Fragrance Free",
    "brand": "Friendly Organic",
    "slug": "friendly-organic-fabric-softener-fragrance-free",
    "barcode": "2026049",
    "price": 45000,
    "originalPrice": 45000,
    "description": "An organic, fragrance-free fabric softener to keep baby clothes soft and safe.",
    "tags": [
      {
        "type": "general",
        "text": "Laundry"
      },
      {
        "type": "general",
        "text": "Organic"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Friendly Organic"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189579/Friendly_Organic_Fabric_Softener_Fragrence_Free_dutpfv.webp",
    "category": "Bathing and Changing"
  },
  {
    "name": "Friendly Organic Baby Oil",
    "brand": "Friendly Organic",
    "slug": "friendly-organic-baby-oil",
    "barcode": "2026051",
    "price": 45000,
    "originalPrice": 45000,
    "description": "A natural and organic oil for massaging and moisturizing baby's skin.",
    "tags": [
      {
        "type": "general",
        "text": "Skincare"
      },
      {
        "type": "general",
        "text": "Organic"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Friendly Organic"
      },
      {
        "label": "Size",
        "value": "100ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "100ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189579/Friendly_Organic_Baby_Oil_100Ml_t1ufft.jpg",
    "category": "Bathing and Changing"
  },
  {
    "name": "Friendly Organic Nappy Cream",
    "brand": "Friendly Organic",
    "slug": "friendly-organic-nappy-cream",
    "barcode": "2026052",
    "price": 42000,
    "originalPrice": 42000,
    "description": "An organic cream to soothe and protect against nappy rash.",
    "tags": [
      {
        "type": "general",
        "text": "Skincare"
      },
      {
        "type": "general",
        "text": "Nappy Cream"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Friendly Organic"
      },
      {
        "label": "Size",
        "value": "100ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "100ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189579/Friendly_Organic_Nappy_Cream_100Ml_jzx2wj.jpg",
    "category": "Bathing and Changing"
  },
  {
    "name": "Dalin Wet Wipes",
    "brand": "Dalin",
    "slug": "dalin-wet-wipes",
    "barcode": "2026056",
    "price": 12000,
    "originalPrice": 12000,
    "description": "Soft and gentle wipes for quick cleaning during nappy changes.",
    "tags": [
      {
        "type": "general",
        "text": "Hygiene"
      },
      {
        "type": "general",
        "text": "Wipes"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "56 Pieces"
      },
      {
        "label": "Brand",
        "value": "Dalin"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189576/Dalin_Wet_Wipes_56Pcs_hivsfm.webp",
    "category": "Bathing and Changing"
  },
  {
    "name": "Dalin Liquid Powder",
    "brand": "Dalin",
    "slug": "dalin-liquid-powder",
    "barcode": "2026057",
    "price": 18700,
    "originalPrice": 22000,
    "description": "A modern liquid version of traditional baby powder to keep skin dry and fresh.",
    "tags": [
      {
        "type": "general",
        "text": "Skincare"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dalin"
      },
      {
        "label": "Size",
        "value": "100ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "100ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189576/Dalin_Liquid_Powder_100Ml_wdu3zj.jpg",
    "wasPrice": 22000,
    "discountPrice": 18700,
    "category": "Bathing and Changing"
  },
  {
    "name": "Dalin Nappy Cream",
    "brand": "Dalin",
    "slug": "dalin-nappy-cream",
    "barcode": "2026058",
    "price": 25000,
    "originalPrice": 25000,
    "description": "A protective cream formulated to prevent and soothe nappy rash irritation.",
    "tags": [
      {
        "type": "general",
        "text": "Skincare"
      },
      {
        "type": "general",
        "text": "Nappy Cream"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dalin"
      },
      {
        "label": "Size",
        "value": "100ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "100ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189576/Dalin_Nappy_Cream_100Ml_nv9wle.webp",
    "category": "Bathing and Changing"
  },
  {
    "name": "Dalin Detangling Shampoo",
    "brand": "Dalin",
    "slug": "dalin-detangling-shampoo-1",
    "barcode": "2026059",
    "price": 12750,
    "originalPrice": 15000,
    "description": "A smaller, 200ml version of the detangling shampoo, ideal for travel or trial.",
    "tags": [
      {
        "type": "general",
        "text": "Haircare"
      },
      {
        "type": "general",
        "text": "Detangling"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dalin"
      },
      {
        "label": "Size",
        "value": "200ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "200ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189574/Dalin_Detangling_Shampoo_200Ml_nysdpe.jpg",
    "wasPrice": 15000,
    "discountPrice": 12750,
    "category": "Bathing and Changing"
  },
  {
    "name": "Dalin Foam Soap Handwash",
    "brand": "Dalin",
    "slug": "dalin-foam-soap-handwash",
    "barcode": "2026061",
    "price": 13600,
    "originalPrice": 16000,
    "description": "A gentle foaming hand soap formulated for frequent use on kids' hands.",
    "tags": [
      {
        "type": "general",
        "text": "Hygiene"
      },
      {
        "type": "general",
        "text": "Handwash"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dalin"
      },
      {
        "label": "Size",
        "value": "200ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "200ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189575/Dalin_Foam_Soap_Handwash_200Ml_tbdmvb.webp",
    "wasPrice": 16000,
    "discountPrice": 13600,
    "category": "Bathing and Changing"
  },
  {
    "name": "Dalin Baby Oils",
    "brand": "Dalin",
    "slug": "dalin-baby-oils",
    "barcode": "2026062",
    "price": 18700,
    "originalPrice": 22000,
    "description": "A multi-use baby oil to help moisturize and nourish delicate skin.",
    "tags": [
      {
        "type": "general",
        "text": "Skincare"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dalin"
      },
      {
        "label": "Size",
        "value": "200ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "200ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189572/Dalin_Baby_Oils_200Ml_Mult._lxkkk2.webp",
    "wasPrice": 22000,
    "discountPrice": 18700,
    "category": "Bathing and Changing"
  },
  {
    "name": "Dalin Baby Jelly",
    "brand": "Dalin",
    "slug": "dalin-baby-jelly",
    "barcode": "2026063",
    "price": 13600,
    "originalPrice": 16000,
    "description": "A versatile, gentle jelly to protect and moisturize dry areas.",
    "tags": [
      {
        "type": "general",
        "text": "Skincare"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dalin"
      },
      {
        "label": "Size",
        "value": "100ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "100ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189572/Dalin_Baby_Jelly_100Ml_Mult._hrrvp4.webp",
    "wasPrice": 16000,
    "discountPrice": 13600,
    "category": "Bathing and Changing"
  },
  {
    "name": "Momcozy 100% Natural Nipple Cream",
    "brand": "Momcozy",
    "slug": "momcozy-100-natural-nipple-cream",
    "barcode": "2026072",
    "price": 55000,
    "originalPrice": 55000,
    "description": "A pure, natural cream to soothe and heal sore, cracked nipples during breastfeeding.",
    "tags": [
      {
        "type": "general",
        "text": "Breastfeeding"
      },
      {
        "type": "general",
        "text": "Skincare"
      },
      {
        "type": "general",
        "text": "Mother"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Momcozy"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "mother",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189586/Momcozy_100_Natural_Nipple_Cream_je4cvs.jpg",
    "category": "Expectant and New Mom Essentials"
  },
  {
    "name": "Dalin Cotton Buds",
    "brand": "Dalin",
    "slug": "dalin-cotton-buds",
    "barcode": "2026042",
    "price": 10200,
    "originalPrice": 12000,
    "description": "Gentle cotton buds designed for delicate cleaning tasks.",
    "tags": [
      {
        "type": "general",
        "text": "Hygiene"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "200 Pieces"
      },
      {
        "label": "Brand",
        "value": "Dalin"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189574/Dalin_Cotton_Buds_200Pc_mgu2sm.webp",
    "wasPrice": 12000,
    "discountPrice": 10200,
    "category": "Bathing and Changing"
  },
  {
    "name": "Momcozy Water Wipes",
    "brand": "Momcozy",
    "slug": "momcozy-water-wipes",
    "barcode": "20250646",
    "price": 20000,
    "originalPrice": 20000,
    "description": "Water-based, chemical-free wipes perfect for sensitive newborn skin.",
    "tags": [
      {
        "type": "general",
        "text": "Hygiene"
      },
      {
        "type": "general",
        "text": "Wipes"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Momcozy"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189588/Momcozy_Water_Wipes_W1008_-_jqtvuc.webp",
    "category": "Bathing and Changing"
  },
  {
    "name": "Momcozy Postpartum Recovery Essentials Kit",
    "brand": "Momcozy",
    "slug": "momcozy-postpartum-recovery-essentials-kit",
    "barcode": "20250642",
    "price": 220000,
    "originalPrice": 220000,
    "description": "An all-in-one kit with essential items to aid in postpartum healing and recovery.",
    "tags": [
      {
        "type": "general",
        "text": "Postpartum"
      },
      {
        "type": "general",
        "text": "Mother"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Momcozy"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "mother",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189587/Momcozy_Postpartum_Recovery_Essentials_Kit_-_mcuyn5.webp",
    "category": "Expectant and New Mom Essentials"
  },
  {
    "name": "Vital Baby Protect Health Care Kit",
    "brand": "Vital Baby",
    "slug": "vital-baby-protect-health-care-kit",
    "barcode": "202102493",
    "price": 120000,
    "originalPrice": 120000,
    "description": "A comprehensive health kit containing essential tools for monitoring baby's wellness.",
    "tags": [
      {
        "type": "general",
        "text": "Health"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Vital Baby"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189598/Vital_Baby_Protect_Health_Care_Kit_-_zeubjm.jpg",
    "category": "Newborn Essentials & Kids Apparel/Footwear"
  },
  {
    "name": "Tommee Tippee Grooming Kit",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-grooming-kit",
    "barcode": "2017420",
    "price": 128000,
    "originalPrice": 160000,
    "description": "A complete grooming set including essential tools for nail and hair care.",
    "tags": [
      {
        "type": "general",
        "text": "Grooming"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189595/Tommee_Tippee_Grooming_Kit_icfw4s.webp",
    "wasPrice": 160000,
    "discountPrice": 128000,
    "category": "Newborn Essentials & Kids Apparel/Footwear"
  },
  {
    "name": "Tommee Tippee Advanced Anticolic Medium Flow Teats",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-advanced-anticolic-medium-flow-teats",
    "barcode": "2026068",
    "price": 45000,
    "originalPrice": 45000,
    "description": "Replacement teats specifically designed to work with anti-colic bottles for 3M+ babies.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Teats"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189592/Tommee_Tippee_Advanced_Anticolic_Medium_Flow_Teats_3M_hh3ju2.jpg",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Any Time Soothers",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-any-time-soothers",
    "barcode": "20180770",
    "price": 28000,
    "originalPrice": 35000,
    "description": "Soothers designed to support natural oral development for babies aged 6-18 months.",
    "tags": [
      {
        "type": "general",
        "text": "Soothers"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189590/Tomme_Tippe_Any_Time_Soothers_6-18M_luixql.webp",
    "wasPrice": 35000,
    "discountPrice": 28000,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Closer To Nature Teats",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-closer-to-nature-teats",
    "barcode": "20200151",
    "price": 35000,
    "originalPrice": 35000,
    "description": "Replacement teats with a natural latch feel for babies aged 3 months and older.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Teats"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "2 Pieces"
      },
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189593/Tommee_Tippee_Closer_To_Nature_2Pc_Teats_3M_0030_dbk4x3.webp",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Newborn Orthodontic Soothers",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-newborn-orthodontic-soothers",
    "barcode": "20240796",
    "price": 28000,
    "originalPrice": 35000,
    "description": "Soothers designed for newborns to assist with natural oral development.",
    "tags": [
      {
        "type": "general",
        "text": "Soothers"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "2 Pieces"
      },
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189596/Tommee_Tippee_Newborn_Orthodontic_Soothers_2Pc_0-2M_-_fjk6ao.webp",
    "wasPrice": 35000,
    "discountPrice": 28000,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Hipp Organic First Infant Milk 1",
    "brand": "Hipp Organic",
    "slug": "hipp-organic-first-infant-milk-1",
    "barcode": "2026084",
    "price": 126000,
    "originalPrice": 140000,
    "description": "An organic, nutritionally complete infant milk formula suitable from birth.",
    "tags": [
      {
        "type": "general",
        "text": "Formula"
      },
      {
        "type": "general",
        "text": "Organic"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Hipp Organic"
      },
      {
        "label": "Size",
        "value": "800g"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "800g",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189580/Hipp_Organic_First_Infant_Milk_1_800G_ipgtuo.webp",
    "wasPrice": 140000,
    "discountPrice": 126000,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Hipp Organic Follow On Baby Milk 2",
    "brand": "Hipp Organic",
    "slug": "hipp-organic-follow-on-baby-milk-2",
    "barcode": "2026085",
    "price": 126000,
    "originalPrice": 140000,
    "description": "An organic follow-on milk formula designed for babies aged 6 months and up.",
    "tags": [
      {
        "type": "general",
        "text": "Formula"
      },
      {
        "type": "general",
        "text": "Organic"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Hipp Organic"
      },
      {
        "label": "Size",
        "value": "800g"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "800g",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189581/Hipp_Organic_Follow_On_Baby_Milk_2_6M_800G_w98jti.jpg",
    "wasPrice": 140000,
    "discountPrice": 126000,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Hipp Organic Growing Up Milk 3",
    "brand": "Hipp Organic",
    "slug": "hipp-organic-growing-up-milk-3",
    "barcode": "2026086",
    "price": 126000,
    "originalPrice": 140000,
    "description": "An organic milk drink tailored for the nutritional needs of toddlers 12 months+.",
    "tags": [
      {
        "type": "general",
        "text": "Formula"
      },
      {
        "type": "general",
        "text": "Organic"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Hipp Organic"
      },
      {
        "label": "Size",
        "value": "800g"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "800g",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189581/Hipp_Organic_Growing_Up_Milk_3_12M_800G_prantt.webp",
    "wasPrice": 140000,
    "discountPrice": 126000,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Lansinoh Breast Pads",
    "brand": "Lansinoh",
    "slug": "lansinoh-breast-pads",
    "barcode": "2017467",
    "price": 40000,
    "originalPrice": 40000,
    "description": "Absorbent, leak-proof pads to ensure comfort and dryness for nursing mothers.",
    "tags": [
      {
        "type": "general",
        "text": "Breastfeeding"
      },
      {
        "type": "general",
        "text": "Nursing Pads"
      },
      {
        "type": "general",
        "text": "Mother"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "60 Pieces"
      },
      {
        "label": "Brand",
        "value": "Lansinoh"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "mother",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189583/Lansinoh_Breast_Pads_60_cogmbf.webp",
    "category": "Expectant and New Mom Essentials"
  },
  {
    "name": "Lansinoh Nipple Cream",
    "brand": "Lansinoh",
    "slug": "lansinoh-nipple-cream",
    "barcode": "2017476",
    "price": 60000,
    "originalPrice": 60000,
    "description": "A highly rated, soothing cream for nursing mothers, famous for its lanolin content.",
    "tags": [
      {
        "type": "general",
        "text": "Breastfeeding"
      },
      {
        "type": "general",
        "text": "Skincare"
      },
      {
        "type": "general",
        "text": "Mother"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Lansinoh"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "mother",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189583/Lansinoh_Nipple_Cream_mfsixs.webp",
    "category": "Expectant and New Mom Essentials"
  },
  {
    "name": "Medela Safe N Dry Nursing Pads",
    "brand": "Medela",
    "slug": "medela-safe-n-dry-nursing-pads",
    "barcode": "20200858",
    "price": 50000,
    "originalPrice": 50000,
    "description": "Reliable nursing pads for breastmilk leakage protection.",
    "tags": [
      {
        "type": "general",
        "text": "Breastfeeding"
      },
      {
        "type": "general",
        "text": "Nursing Pads"
      },
      {
        "type": "general",
        "text": "Mother"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "60 Pieces"
      },
      {
        "label": "Brand",
        "value": "Medela"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "mother",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189585/Medela_Safe_N_Dry_Nursing_Pads_60Pc_-_y5w32j.jpg",
    "category": "Expectant and New Mom Essentials"
  },
  {
    "name": "Medela Solo Single Electric Breast Pump",
    "brand": "Medela",
    "slug": "medela-solo-single-electric-breast-pump",
    "barcode": "20220233",
    "price": 750000,
    "originalPrice": 750000,
    "description": "An efficient, single electric breast pump for easy and comfortable expression.",
    "tags": [
      {
        "type": "general",
        "text": "Breastfeeding"
      },
      {
        "type": "general",
        "text": "Pump"
      },
      {
        "type": "general",
        "text": "Mother"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Medela"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "mother",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189585/Medela_Solo_Single_Electric_Breast_Pump_-_yhg5xw.webp",
    "category": "Expectant and New Mom Essentials"
  },
  {
    "name": "Medela Nipple Formers",
    "brand": "Medela",
    "slug": "medela-nipple-formers",
    "barcode": "202001936",
    "price": 65000,
    "originalPrice": 65000,
    "description": "Tools designed to help mothers with flat or inverted nipples prepare for breastfeeding.",
    "tags": [
      {
        "type": "general",
        "text": "Breastfeeding"
      },
      {
        "type": "general",
        "text": "Mother"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "2 Pieces"
      },
      {
        "label": "Brand",
        "value": "Medela"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "mother",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189584/Medela_2Pc_Nipple_Formers_-_afcgvu.jpg",
    "category": "Expectant and New Mom Essentials"
  },
  {
    "name": "Medela Swing Max Flex Double Electric 2 Phase Breast Pump",
    "brand": "Medela",
    "slug": "medela-swing-max-flex-double-electric-2-phase-breast-pump",
    "barcode": "202001945",
    "price": 1300000,
    "originalPrice": 1300000,
    "description": "A high-performance double electric pump for maximum efficiency during expression.",
    "tags": [
      {
        "type": "general",
        "text": "Breastfeeding"
      },
      {
        "type": "general",
        "text": "Pump"
      },
      {
        "type": "general",
        "text": "Mother"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Medela"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "mother",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189585/Medela_Swing_Max_Flex_Double_Electric_2_Phase_Breast_Pump_-_c15l4d.jpg",
    "category": "Expectant and New Mom Essentials"
  },
  {
    "name": "Vital Baby Nurture Protect & Care Nipple Shields",
    "brand": "Vital Baby",
    "slug": "vital-baby-nurture-protect-care-nipple-shields",
    "barcode": "202102414",
    "price": 24000,
    "originalPrice": 30000,
    "description": "Shields designed to help with breastfeeding challenges like sore nipples or latch issues.",
    "tags": [
      {
        "type": "general",
        "text": "Breastfeeding"
      },
      {
        "type": "general",
        "text": "Mother"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "2 Pieces"
      },
      {
        "label": "Brand",
        "value": "Vital Baby"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "mother",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189598/Vital_Baby_Nurture_Protect_Care_Nipple_Shields_2Pc_-_hmv3qa.jpg",
    "wasPrice": 30000,
    "discountPrice": 24000,
    "category": "Expectant and New Mom Essentials"
  },
  {
    "name": "Hipp Organic Creamy Porridge",
    "brand": "Hipp Organic",
    "slug": "hipp-organic-creamy-porridge",
    "barcode": "2026081",
    "price": 28800,
    "originalPrice": 32000,
    "description": "A gentle, organic first food for babies starting their weaning journey.",
    "tags": [
      {
        "type": "general",
        "text": "Weaning"
      },
      {
        "type": "general",
        "text": "Organic"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Hipp Organic"
      },
      {
        "label": "Size",
        "value": "160g"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "160g",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189580/Hipp_Organic_Creamy_Porridge_6M_160G_rbobil.jpg",
    "wasPrice": 32000,
    "discountPrice": 28800,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Hipp Organic 100% Baby Rice",
    "brand": "Hipp Organic",
    "slug": "hipp-organic-100-baby-rice",
    "barcode": "2026082",
    "price": 28800,
    "originalPrice": 32000,
    "description": "Simple, gluten-free organic baby rice, perfect for the first stages of weaning.",
    "tags": [
      {
        "type": "general",
        "text": "Weaning"
      },
      {
        "type": "general",
        "text": "Organic"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Hipp Organic"
      },
      {
        "label": "Size",
        "value": "160g"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "160g",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189579/Hipp_Organic_100_Baby_Rice_6M_160G_ije2rd.jpg",
    "wasPrice": 32000,
    "discountPrice": 28800,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Cow & Gate Creamy Porridge",
    "brand": "Cow & Gate",
    "slug": "cow-gate-creamy-porridge",
    "barcode": "201741014",
    "price": 24300,
    "originalPrice": 27000,
    "description": "A smooth and nutritious porridge for babies transitioning to solid foods.",
    "tags": [
      {
        "type": "general",
        "text": "Weaning"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Cow & Gate"
      },
      {
        "label": "Size",
        "value": "125g"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "125g",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189569/Cow_Gate_Creamy_Porridge_125G_x9y49c.webp",
    "wasPrice": 27000,
    "discountPrice": 24300,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Aptamil Creamed Porridge",
    "brand": "Aptamil",
    "slug": "aptamil-creamed-porridge",
    "barcode": "201741172",
    "price": 28800,
    "originalPrice": 32000,
    "description": "A nutritious, creamed porridge made to support the weaning process.",
    "tags": [
      {
        "type": "general",
        "text": "Weaning"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Aptamil"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189562/Aptamil_Creamed_Porridge_ftkque.webp",
    "wasPrice": 32000,
    "discountPrice": 28800,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Aptamil Creamed Banana Porridge",
    "brand": "Aptamil",
    "slug": "aptamil-creamed-banana-porridge",
    "barcode": "201741205",
    "price": 28800,
    "originalPrice": 32000,
    "description": "A delicious creamed porridge with banana flavor for weaning babies.",
    "tags": [
      {
        "type": "general",
        "text": "Weaning"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Aptamil"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189562/Aptamil_Creamed_Banana_Porridge_qlcndv.jpg",
    "wasPrice": 32000,
    "discountPrice": 28800,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Cow And Gate Multigrain Banana Porridge",
    "brand": "Cow & Gate",
    "slug": "cow-and-gate-multigrain-banana-porridge",
    "barcode": "201741206",
    "price": 22500,
    "originalPrice": 25000,
    "description": "A heartier multigrain porridge with banana, suitable for babies 7 months and older.",
    "tags": [
      {
        "type": "general",
        "text": "Weaning"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Cow & Gate"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189571/Cow_And_Gate_Multigrain_Banana_Porridge_7M_lntrwp.webp",
    "wasPrice": 25000,
    "discountPrice": 22500,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Kiddylicious Blue Berry Wafers",
    "brand": "Kiddylicious",
    "slug": "kiddylicious-blue-berry-wafers",
    "barcode": "2026075",
    "price": 25000,
    "originalPrice": 25000,
    "description": "Soft, easy-to-hold blueberry flavored wafers for self-feeding babies.",
    "tags": [
      {
        "type": "general",
        "text": "Snacks"
      },
      {
        "type": "general",
        "text": "Weaning"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Kiddylicious"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189581/Kiddylicious_Blue_Berry_Wafers_6M_vyt9g9.webp",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Kiddylicious Strawberry Banana & Yoghurt",
    "brand": "Kiddylicious",
    "slug": "kiddylicious-strawberry-banana-yoghurt",
    "barcode": "2026076",
    "price": 40000,
    "originalPrice": 40000,
    "description": "A tasty, snack-time favorite for babies featuring fruit and yogurt.",
    "tags": [
      {
        "type": "general",
        "text": "Snacks"
      },
      {
        "type": "general",
        "text": "Weaning"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "4 Pack"
      },
      {
        "label": "Brand",
        "value": "Kiddylicious"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189581/Kiddylicious_Strawberry_Banana_Yoghurt_4Pk_6M_twg25i.webp",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Kiddylicious Veggie Straws",
    "brand": "Kiddylicious",
    "slug": "kiddylicious-veggie-straws",
    "barcode": "2026077",
    "price": 8000,
    "originalPrice": 8000,
    "description": "A crunchy, vegetable-based snack designed for toddlers to hold and munch.",
    "tags": [
      {
        "type": "general",
        "text": "Snacks"
      },
      {
        "type": "general",
        "text": "Weaning"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Kiddylicious"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189582/Kiddylicious_Veggie_Straws_9M_hzwrzg.webp",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Quick Chop Baby Food Blender",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-quick-chop-baby-food-blender",
    "barcode": "20240799",
    "price": 215000,
    "originalPrice": 215000,
    "description": "A compact blender to easily prepare fresh, homemade baby food.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Blender"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189596/Tommee_Tippee_Quick_Chop_Baby_Food_Blender_4M_-_rt4wqa.jpg",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Munchkin Soft Tip Infant Spoons",
    "brand": "Munchkin",
    "slug": "munchkin-soft-tip-infant-spoons",
    "barcode": "2026073",
    "price": 27000,
    "originalPrice": 30000,
    "description": "Gentle, soft-tipped spoons designed for a baby's delicate gums during weaning.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Spoons"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "6 Pieces"
      },
      {
        "label": "Brand",
        "value": "Munchkin"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189589/Munchkin_Soft_Tip_Infant_Spoons_6Pc_swvsck.jpg",
    "wasPrice": 30000,
    "discountPrice": 27000,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Vital Baby Nourish Big Kid Cutlery",
    "brand": "Vital Baby",
    "slug": "vital-baby-nourish-big-kid-cutlery",
    "barcode": "20210315",
    "price": 35000,
    "originalPrice": 35000,
    "description": "Cutlery set designed to help toddlers learn to eat independently.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Cutlery"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "3 Pieces"
      },
      {
        "label": "Brand",
        "value": "Vital Baby"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189598/Vital_Baby_Nourish_Big_Kid_Cuttery_3Pc_-_f1pxiz.jpg",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Mam Trainer Cup 2In1 Assortment",
    "brand": "Mam",
    "slug": "mam-trainer-cup-2in1-assortment",
    "barcode": "20180428",
    "price": 65000,
    "originalPrice": 65000,
    "description": "A versatile trainer cup that adapts to the baby's developing drinking skills.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Cup"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Mam"
      },
      {
        "label": "Size",
        "value": "220ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "220ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189584/Mam_Trainer_Cup_2In1_Assortment_220Ml_4M_rhxs0v.webp",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Vital Baby Perfectly Simple Cups",
    "brand": "Vital Baby",
    "slug": "vital-baby-perfectly-simple-cups",
    "barcode": "20200148",
    "price": 25000,
    "originalPrice": 25000,
    "description": "A pack of simple, easy-to-clean cups for toddlers.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Cup"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "5 Pieces"
      },
      {
        "label": "Brand",
        "value": "Vital Baby"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189598/Vital_Baby_Perfectly_Simple_Cups_5Pc_0013_gcnucn.webp",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Nuby Sipeez First Cup Grip N Sip Neutral",
    "brand": "Nuby",
    "slug": "nuby-sipeez-first-cup-grip-n-sip-neutral",
    "barcode": "201902237",
    "price": 29750,
    "originalPrice": 35000,
    "description": "An easy-grip transition cup designed to help babies learn to sip.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Cup"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Nuby"
      },
      {
        "label": "Size",
        "value": "240ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "240ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189589/Nuby_Nuby_Sipeez_First_Cup_Grip_N_Sip_240Ml_295_S-1Yr_Above_Nuetral_wufn4t.jpg",
    "wasPrice": 35000,
    "discountPrice": 29750,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Nuby All Around 360 Cup",
    "brand": "Nuby",
    "slug": "nuby-all-around-360-cup",
    "barcode": "202001355",
    "price": 29750,
    "originalPrice": 35000,
    "description": "A 360-degree leak-proof cup that helps toddlers learn to drink like adults.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Cup"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Nuby"
      },
      {
        "label": "Size",
        "value": "210ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "210ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189589/Nuby_All_Around_360_Cup_210Ml_-_xrisku.jpg",
    "wasPrice": 35000,
    "discountPrice": 29750,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Trainer Spout Cup",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-trainer-spout-cup",
    "barcode": "2026065",
    "price": 40000,
    "originalPrice": 40000,
    "description": "A trainer cup with a spout to assist in the transition from bottle to cup.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Cup"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      },
      {
        "label": "Size",
        "value": "240ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "240ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189597/Tommee_Tippee_Trainer_Spout_Cup_240Ml_iy2afu.jpg",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Toddler Spout Cup",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-toddler-spout-cup",
    "barcode": "2026066",
    "price": 40000,
    "originalPrice": 40000,
    "description": "A large, durable spout cup suitable for active toddlers.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Cup"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      },
      {
        "label": "Size",
        "value": "390ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "390ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189597/Tommee_Tippee_Toddler_Spout_Cup_12M_390Ml_k92mbd.jpg",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Insulated Active Spout Cup",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-insulated-active-spout-cup",
    "barcode": "2026067",
    "price": 42000,
    "originalPrice": 42000,
    "description": "An insulated cup designed to keep toddler drinks cool while on the move.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Cup"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      },
      {
        "label": "Size",
        "value": "266ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "266ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189595/Tommee_Tippee_Insulated_Active_Spout_Cup_12M_266Ml_avot43.jpg",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Super Star Weaning Sippee Cup",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-super-star-weaning-sippee-cup",
    "barcode": "20220701",
    "price": 25600,
    "originalPrice": 32000,
    "description": "An early-stage weaning cup designed to help babies learn to drink.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Weaning"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      },
      {
        "label": "Size",
        "value": "190ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "190ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189597/Tommee_Tippee_Super_Star_Weaning_Sippee_Cup_4M_190Ml_-_ehdgok.jpg",
    "wasPrice": 32000,
    "discountPrice": 25600,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Soft Spout Transition Cup",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-soft-spout-transition-cup",
    "barcode": "201741245",
    "price": 36000,
    "originalPrice": 45000,
    "description": "A gentle transition cup perfect for early drinking stages.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Weaning"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      },
      {
        "label": "Size",
        "value": "150ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "size": "150ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189590/Tomme_Tippee_Soft_Spout_Transition_Cup_4-7M_150Ml_w0ila6.jpg",
    "wasPrice": 45000,
    "discountPrice": 36000,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Dr Brown Bottle Brush",
    "brand": "Dr Brown's",
    "slug": "dr-brown-bottle-brush",
    "barcode": "2019017",
    "price": 40000,
    "originalPrice": 40000,
    "description": "An essential tool designed to thoroughly clean all parts of Dr Brown's bottles.",
    "tags": [
      {
        "type": "general",
        "text": "Cleaning"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Dr Brown's"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189577/Dr_Brown_Bottle_Brush_owt7rj.webp",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Milton Baby Bottle Cleaner",
    "brand": "Milton",
    "slug": "milton-baby-bottle-cleaner",
    "barcode": "20190650",
    "price": 35000,
    "originalPrice": 35000,
    "description": "A specialized liquid cleaner to ensure baby bottles are thoroughly sanitized.",
    "tags": [
      {
        "type": "general",
        "text": "Cleaning"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Milton"
      },
      {
        "label": "Size",
        "value": "500ml"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "size": "500ml",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189586/Milton_Baby_Bottle_Cleaner_500Ml_onnlxy.webp",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Milton Sterilizing Tablets",
    "brand": "Milton",
    "slug": "milton-sterilizing-tablets",
    "barcode": "201741109",
    "price": 25000,
    "originalPrice": 25000,
    "description": "Convenient tablets for chemical sterilization of bottles and baby equipment.",
    "tags": [
      {
        "type": "general",
        "text": "Cleaning"
      },
      {
        "type": "general",
        "text": "Newborn"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "28 Tablets"
      },
      {
        "label": "Brand",
        "value": "Milton"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "newborn",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189586/Milton_Sterilizing_28_Tablets_ogwrir.webp",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Nuby Bug Aloop Teether",
    "brand": "Nuby",
    "slug": "nuby-bug-aloop-teether",
    "barcode": "201741018",
    "price": 34000,
    "originalPrice": 40000,
    "description": "A fun, textured teether to help soothe teething pain in babies.",
    "tags": [
      {
        "type": "general",
        "text": "Teething"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Nuby"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189589/Nuby_Bug_Aloop_Teether_3M_ejyuji.jpg",
    "wasPrice": 40000,
    "discountPrice": 34000,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Nuby Icy Bite Teether",
    "brand": "Nuby",
    "slug": "nuby-icy-bite-teether",
    "barcode": "201741019",
    "price": 29750,
    "originalPrice": 35000,
    "description": "A teether designed to be chilled in the fridge to provide cooling relief for teething.",
    "tags": [
      {
        "type": "general",
        "text": "Teething"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Nuby"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189589/Nuby_Icy_Bite_Teether_3M_sewnhz.jpg",
    "wasPrice": 35000,
    "discountPrice": 29750,
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Explora Easy Scoop Feeding Bowls",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-explora-easy-scoop-feeding-bowls",
    "barcode": "201741059",
    "price": 35000,
    "originalPrice": 35000,
    "description": "Bowls shaped for easy scooping, perfect for messy eaters learning to feed themselves.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Bowls"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "4 Pieces"
      },
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189594/Tommee_Tippee_Explora_Easy_Scoop_Feeding_Bowls_4Pc_ketker.webp",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Tommee Tippee Firsttastes Weaning Starter Kit",
    "brand": "Tommee Tippee",
    "slug": "tommee-tippee-firsttastes-weaning-starter-kit",
    "barcode": "201903371",
    "price": 105000,
    "originalPrice": 105000,
    "description": "Everything needed to start introducing solid foods to a baby.",
    "tags": [
      {
        "type": "general",
        "text": "Weaning"
      },
      {
        "type": "general",
        "text": "Starter Kit"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Brand",
        "value": "Tommee Tippee"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189595/Tommee_Tippee_Firsttastes_Weaning_Starter_Kit_4M_012_xxblfv.jpg",
    "category": "Feeding/Nursing Essentials"
  },
  {
    "name": "Munchkin Love-A-Bowls",
    "brand": "Munchkin",
    "slug": "munchkin-love-a-bowls",
    "barcode": "201741056",
    "price": 49500,
    "originalPrice": 55000,
    "description": "A versatile set of 10 stacking bowls for storage and feeding.",
    "tags": [
      {
        "type": "general",
        "text": "Feeding"
      },
      {
        "type": "general",
        "text": "Bowls"
      },
      {
        "type": "general",
        "text": "Kid"
      }
    ],
    "specifications": [
      {
        "label": "Quantity",
        "value": "10 Pieces"
      },
      {
        "label": "Brand",
        "value": "Munchkin"
      }
    ],
    "isActive": true,
    "actual_data": true,
    "stage": "kid",
    "image": "https://res.cloudinary.com/vjngpdmd/image/upload/v1783189588/Munchkin_Love-A-_Bowls_10Pc_zjowlt.jpg",
    "wasPrice": 55000,
    "discountPrice": 49500,
    "category": "Feeding/Nursing Essentials"
  }
];

export const runSeed = mutation({
  args: {},
  handler: async (ctx) => {
    let markedCount = 0;
    let upsertedCount = 0;

    // 1. Mark all existing products currently in the DB as legacy/fake data (actual_data = false)
    const existingProducts = await ctx.db.query("products").collect();
    for (const p of existingProducts) {
      if (p.actual_data !== false) {
        await ctx.db.patch(p._id, { actual_data: false });
        markedCount++;
      }
    }
    console.log(`[seedProducts.ts] Marked ${markedCount} existing products as actual_data = false.`);

    // 2. Import/upsert new products
    for (const item of NEW_PRODUCTS) {
      // Find if product with same barcode or slug already exists in DB
      let existing = null;
      if (item.barcode) {
        existing = await ctx.db
          .query("products")
          .withIndex("by_barcode", (q) => q.eq("barcode", item.barcode))
          .unique();
      }
      if (!existing && item.slug) {
        existing = await ctx.db
          .query("products")
          .withIndex("by_slug", (q) => q.eq("slug", item.slug))
          .unique();
      }

      const productFields = {
        name: item.name,
        brand: item.brand || "Generic",
        size: item.size,
        color: item.color || "Default",
        slug: item.slug,
        sku: item.sku,
        barcode: item.barcode,
        weightGrams: item.weightGrams,
        dimensions: item.dimensions,
        price: item.price,
        wasPrice: item.wasPrice,
        originalPrice: item.originalPrice ?? item.price,
        discountPrice: item.discountPrice,
        discountExpiry: item.discountExpiry,
        image: item.image,
        images: item.images,
        stage: item.stage,
        tier: item.tier,
        category: item.category,
        subCategory: item.subCategory,
        targetGender: item.targetGender,
        material: item.material,
        pattern: item.pattern,
        isCurated: item.isCurated,
        isMostLoved: item.isMostLoved,
        minMonth: item.minMonth,
        maxMonth: item.maxMonth,
        minWeek: item.minWeek,
        maxWeek: item.maxWeek,
        description: item.description || "",
        tags: item.tags || [],
        specifications: item.specifications || [],
        isActive: item.isActive ?? true,
        inventory: item.inventory,
        unitsSold: item.unitsSold,
        actual_data: true, // Strictly required as True for these new products
      };

      if (existing) {
        await ctx.db.patch(existing._id, productFields);
      } else {
        await ctx.db.insert("products", productFields);
      }
      upsertedCount++;
    }

    console.log(`[seedProducts.ts] Successfully upserted ${upsertedCount} new products.`);
    return {
      success: true,
      markedAsLegacy: markedCount,
      newProductsUpserted: upsertedCount
    };
  }
});
