/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("complete business logic suite (fulfillment, stock, crm, returns, delivery calculator)", async () => {
  // Set up mock environment variables
  process.env.STAFF_AUTH_SALT = "test-salt-12345";
  process.env.STAFF_PASSWORDS_JSON = JSON.stringify({
    matovu: "matovupassword",
    brian: "brianpassword",
  });

  const t = convexTest(schema, modules);

  // ─── 1. Auth Setup & Seeding ───
  const seedResult = await t.mutation(api.staffAuth.seedStaff, {});
  expect(seedResult.success).toBe(true);

  // Login as Staff (Matovu)
  const staffLogin = await t.mutation(api.staffAuth.login, {
    email: "matovu@dennan.ug",
    password: "matovupassword",
  });
  const staffToken = staffLogin.token;

  // Login as Admin (Brian)
  const adminLogin = await t.mutation(api.staffAuth.login, {
    email: "brian@dennan.ug",
    password: "brianpassword",
  });
  const adminToken = adminLogin.token;

  // ─── 2. Product and Stock Management Tests ───
  // First, we need to create some mock products in the database
  // We can insert them directly into the test DB
  const productId1 = await t.run(async (ctx) => {
    return await ctx.db.insert("products", {
      name: "Baby Bottle Premium",
      brand: "Tommee Tippee",
      slug: "baby-bottle-premium",
      barcode: "123456789",
      price: 50000,
      originalPrice: 50000,
      isActive: true,
      inventory: 10,
      unitsSold: 0,
      actual_data: true,
      description: "Tommee Tippee premium bottle",
      tags: [],
      specifications: [],
    });
  });

  const productId2 = await t.run(async (ctx) => {
    return await ctx.db.insert("products", {
      name: "Organic Baby Wipes",
      brand: "WaterWipes",
      slug: "organic-baby-wipes",
      barcode: "987654321",
      price: 15000,
      originalPrice: 15000,
      isActive: true,
      inventory: 20,
      unitsSold: 0,
      actual_data: true,
      description: "WaterWipes organic baby wipes",
      tags: [],
      specifications: [],
    });
  });

  // Query products for POS as Staff
  const posProducts = await t.query(api.products.getProductsForPOS, { token: staffToken });
  expect(posProducts.length).toBeGreaterThanOrEqual(2);
  expect(posProducts.some((p: any) => p.name === "Baby Bottle Premium")).toBe(true);

  // Query stock list as Admin
  const stockList = await t.query(api.products.getStockList, { token: adminToken });
  expect(stockList.length).toBeGreaterThanOrEqual(2);
  const bottleStock = stockList.find((s: any) => s.id === productId1);
  expect(bottleStock?.inventory).toBe(10);

  // Query stock list as Staff should fail (admin only)
  await expect(
    t.query(api.products.getStockList, { token: staffToken })
  ).rejects.toThrow("Access denied");

  // Adjust stock as Admin
  const adjustRes = await t.mutation(api.products.adjustStock, {
    token: adminToken,
    productId: productId1,
    delta: 5,
  });
  expect(adjustRes.newInventory).toBe(15);

  const stockListUpdated = await t.query(api.products.getStockList, { token: adminToken });
  expect(stockListUpdated.find((s: any) => s.id === productId1)?.inventory).toBe(15);

  // Set promotional discount as Admin
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 1 day future
  await t.mutation(api.products.setDiscount, {
    token: adminToken,
    productId: productId1,
    discountPrice: 40000,
    discountExpiry: expiry,
  });

  // Verify discount list
  const discountList = await t.query(api.products.getDiscountList, { token: adminToken });
  expect(discountList.length).toBeGreaterThanOrEqual(1);
  expect(discountList.some((d: any) => d._id === productId1)).toBe(true);

  // Verify POS price was normalized to the discountPrice
  const posProductsDiscount = await t.query(api.products.getProductsForPOS, { token: staffToken });
  const posBottle = posProductsDiscount.find((p: any) => p._id === productId1);
  expect(posBottle?.price).toBe(40000);
  expect(posBottle?.wasPrice).toBe(50000);

  // ─── 3. Customer & CRM Activity Tests ───
  // Create a customer user (role is undefined)
  const customerId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      name: "Nakamya Olivia",
      email: "olivia@gmail.com",
      phone: "+256770000001",
      isOnboarded: true,
    });
  });

  // List customers as Admin
  const customerList = await t.query(api.customerActivities.getCustomerList, { token: adminToken });
  expect(customerList.length).toBeGreaterThanOrEqual(1);
  expect(customerList.some((c: any) => c.id === customerId)).toBe(true);

  // List customers as Staff should also succeed (used in Staff CRM tab)
  const staffCustomerList = await t.query(api.customerActivities.getCustomerList, { token: staffToken });
  expect(staffCustomerList.length).toBeGreaterThanOrEqual(1);

  // Update customer notes as Staff
  await t.mutation(api.customerActivities.updateCustomerNotes, {
    token: staffToken,
    userId: customerId,
    customerNotes: "Olivia prefers organic products and fast deliveries.",
  });

  const customerListNotes = await t.query(api.customerActivities.getCustomerList, { token: adminToken });
  expect(customerListNotes.find((c: any) => c.id === customerId)?.customerNotes).toBe(
    "Olivia prefers organic products and fast deliveries."
  );

  // Add CRM Activity as Staff
  const actRes = await t.mutation(api.customerActivities.addActivity, {
    token: staffToken,
    customerId,
    type: "call",
    note: "Followed up on her baby bottle preferences.",
    scheduledDate: "2026-07-06",
  });
  expect(actRes.success).toBe(true);
  const activityId = actRes.activityId;

  // Retrieve CRM Activities
  const activities = await t.query(api.customerActivities.getActivitiesByCustomer, {
    token: staffToken,
    customerId,
  });
  expect(activities.length).toBe(1);
  expect(activities[0].note).toBe("Followed up on her baby bottle preferences.");
  expect(activities[0].status).toBe("pending");
  expect(activities[0].staffName).toBe("Matovu");

  // Complete CRM Activity
  await t.mutation(api.customerActivities.completeActivity, {
    token: staffToken,
    activityId,
  });

  const activitiesCompleted = await t.query(api.customerActivities.getActivitiesByCustomer, {
    token: staffToken,
    customerId,
  });
  expect(activitiesCompleted[0].status).toBe("completed");
  expect(activitiesCompleted[0].completedAt).toBeDefined();

  // ─── 4. Fulfillment & Order Lifecycle Tests ───
  // Admin creates an order manually
  const orderRes = await t.mutation(api.orders.adminCreateOrder, {
    token: adminToken,
    userId: customerId,
    deliveryAddress: {
      name: "Nakamya Olivia",
      zone: "Ntinda",
    },
    paymentMethod: "momo",
    items: [
      { productId: productId1, quantity: 2 }, // 2x Bottles (inventory: 15 -> 13)
      { productId: productId2, quantity: 5 }, // 5x Wipes (inventory: 20 -> 15)
    ],
  });
  expect(orderRes.success).toBe(true);
  const orderId = orderRes.orderId;

  // Verify stock was deducted
  const stockListAfterOrder = await t.query(api.products.getStockList, { token: adminToken });
  expect(stockListAfterOrder.find((s: any) => s.id === productId1)?.inventory).toBe(13);
  expect(stockListAfterOrder.find((s: any) => s.id === productId2)?.inventory).toBe(15);

  // Staff lists orders
  const staffOrders = await t.query(api.orders.getOrdersForStaff, {
    token: staffToken,
    paginationOpts: { numItems: 10, cursor: null },
  });
  expect(staffOrders.page.length).toBeGreaterThanOrEqual(1);
  const orderDoc = staffOrders.page.find((o: any) => o._id === orderId);
  expect(orderDoc).toBeDefined();
  expect(orderDoc.status).toBe("preparing");
  expect(orderDoc.customerName).toBe("Nakamya Olivia");
  expect(orderDoc.items.length).toBe(2);

  // Staff claims order
  await t.mutation(api.orders.claimOrder, {
    token: staffToken,
    orderId,
  });

  const claimedOrder = await t.run(async (ctx) => {
    return await ctx.db.get(orderId);
  });
  expect(claimedOrder.status).toBe("packing");
  expect(claimedOrder.claimedBy).toBe(staffLogin.user.id);
  expect(claimedOrder.timeToClaim).toBeDefined();
  expect(claimedOrder.history.length).toBe(1);
  expect(claimedOrder.history[0].status).toBe("packing");

  // Staff dispatches order
  const deliveryTime = Date.now() + 60 * 60 * 1000; // 1 hr future
  await t.mutation(api.orders.handoverToDelivery, {
    token: staffToken,
    orderId,
    deliveryPersonName: "Kateregga John",
    riderPhone: "+256701234567",
    expectedDeliveryTime: deliveryTime,
  });

  const dispatchedOrder = await t.run(async (ctx) => {
    return await ctx.db.get(orderId);
  });
  expect(dispatchedOrder.status).toBe("dispatched");
  expect(dispatchedOrder.deliveryPersonName).toBe("Kateregga John");
  expect(dispatchedOrder.riderPhone).toBe("+256701234567");
  expect(dispatchedOrder.timeToDispatch).toBeDefined();

  // Test completeOrder
  await t.mutation(api.orders.completeOrder, {
    token: staffToken,
    orderId,
  });

  const completedOrder = await t.run(async (ctx) => {
    return await ctx.db.get(orderId);
  });
  expect(completedOrder.status).toBe("delivered");
  expect(completedOrder.completedAt).toBeDefined();
  expect(completedOrder.timeToDeliver).toBeDefined();

  // ─── 5. Returns Processing & Replenishment ───
  // Olivia wants to return 1 Baby Bottle and 2 Wipes
  const returnRes = await t.mutation(api.returns.processReturn, {
    token: staffToken,
    orderId,
    returnedItems: [
      { productId: productId1, quantity: 1 }, // Return 1 bottle
      { productId: productId2, quantity: 2 }, // Return 2 wipes
    ],
    refundAmount: 70000, // custom refund amount calculation
    note: "Faulty seals on baby bottle and packaging torn on wipes",
  });
  expect(returnRes.success).toBe(true);
  expect(returnRes.status).toBe("partially_returned");

  // Verify order status updated to partially_returned
  const returnedOrderDoc = await t.run(async (ctx) => {
    return await ctx.db.get(orderId);
  });
  expect(returnedOrderDoc.status).toBe("partially_returned");

  // Verify product inventory was replenished
  const stockListAfterReturn = await t.query(api.products.getStockList, { token: adminToken });
  expect(stockListAfterReturn.find((s: any) => s.id === productId1)?.inventory).toBe(14); // 13 + 1
  expect(stockListAfterReturn.find((s: any) => s.id === productId2)?.inventory).toBe(17); // 15 + 2

  // Return the remaining items
  const returnRes2 = await t.mutation(api.returns.processReturn, {
    token: staffToken,
    orderId,
    returnedItems: [
      { productId: productId1, quantity: 1 }, // Return remaining 1 bottle
      { productId: productId2, quantity: 3 }, // Return remaining 3 wipes
    ],
    refundAmount: 85000,
    note: "Remaining order items returned",
  });
  expect(returnRes2.success).toBe(true);
  expect(returnRes2.status).toBe("returned");

  // Verify order status updated to returned
  const returnedOrderDoc2 = await t.run(async (ctx) => {
    return await ctx.db.get(orderId);
  });
  expect(returnedOrderDoc2.status).toBe("returned");

  // Verify product inventory was fully replenished
  const stockListAfterFinalReturn = await t.query(api.products.getStockList, { token: adminToken });
  expect(stockListAfterFinalReturn.find((s: any) => s.id === productId1)?.inventory).toBe(15); // 14 + 1 = 15 original
  expect(stockListAfterFinalReturn.find((s: any) => s.id === productId2)?.inventory).toBe(20); // 17 + 3 = 20 original

  // Try to return more items than ordered should fail
  await expect(
    t.mutation(api.returns.processReturn, {
      token: staffToken,
      orderId,
      returnedItems: [{ productId: productId1, quantity: 1 }],
      refundAmount: 40000,
    })
  ).rejects.toThrow("Cannot return");

  // ─── 6. POS Walk-in Physical Order Tests ───
  const posOrderRes = await t.mutation(api.orders.createPhysicalOrder, {
    token: staffToken,
    customerName: "Kato Ivan",
    phone: "+256780000002",
    items: [
      { productId: productId1, quantity: 3 }, // 3x Bottles (inventory: 15 -> 12)
    ],
    payments: [
      { method: "physical", amount: 120000 }
    ],
    note: "Cash payment received at counter",
  });
  expect(posOrderRes.success).toBe(true);

  // Verify customer user was created and customerNotes updated
  const posCustomer = await t.run(async (ctx) => {
    return await ctx.db
      .query("users")
      .collect();
  });
  const ivan = posCustomer.find((u) => u.phone === "+256780000002");
  expect(ivan).toBeDefined();
  expect(ivan?.name).toBe("Kato Ivan");
  expect(ivan?.isWalkIn).toBe(true);
  expect(ivan?.customerNotes).toBe("Cash payment received at counter");

  // Verify CRM note activity was logged for Ivan
  const ivanActivities = await t.query(api.customerActivities.getActivitiesByCustomer, {
    token: staffToken,
    customerId: ivan!._id,
  });
  expect(ivanActivities.length).toBe(1);
  expect(ivanActivities[0].type).toBe("note");
  expect(ivanActivities[0].note).toBe("Cash payment received at counter");
  expect(ivanActivities[0].status).toBe("completed");

  // Verify POS stock deduction
  const stockListAfterPos = await t.query(api.products.getStockList, { token: adminToken });
  expect(stockListAfterPos.find((s: any) => s.id === productId1)?.inventory).toBe(12);

  // Verify physical order was created as delivered immediately
  const posOrderDoc = await t.run(async (ctx) => {
    return await ctx.db.get(posOrderRes.orderId);
  });
  expect(posOrderDoc.status).toBe("delivered");
  expect(posOrderDoc.isWalkIn).toBe(true);
  expect(posOrderDoc.isOnline).toBe(false);
  expect(posOrderDoc.claimedBy).toBe(staffLogin.user.id);
  expect(posOrderDoc.completedAt).toBeDefined();

  // Test multi-tender order (cash + momo)
  const posOrderResMulti = await t.mutation(api.orders.createPhysicalOrder, {
    token: staffToken,
    customerName: "Babirye Sarah",
    phone: "+256780000003",
    items: [
      { productId: productId1, quantity: 2 }, // 2x Bottles = 80000
    ],
    payments: [
      { method: "physical", amount: 30000 },
      { method: "momo", amount: 50000, momoPhone: "+256770000123" }
    ],
    note: "Split payment cash and momo",
  });
  expect(posOrderResMulti.success).toBe(true);

  // Verify correct orderPayments rows + paymentMethod: "mixed"
  const multiOrderDoc = await t.run(async (ctx) => {
    return await ctx.db.get(posOrderResMulti.orderId);
  });
  expect(multiOrderDoc.paymentMethod).toBe("mixed");

  const multiPayments = await t.run(async (ctx) => {
    return await ctx.db
      .query("orderPayments")
      .withIndex("by_order", (q) => q.eq("orderId", posOrderResMulti.orderId))
      .collect();
  });
  expect(multiPayments.length).toBe(2);
  expect(multiPayments.some((p) => p.method === "physical" && p.amount === 30000)).toBe(true);
  expect(multiPayments.some((p) => p.method === "momo" && p.amount === 50000 && p.momoPhone === "+256770000123")).toBe(true);

  // Test: tender sum mismatch throws error
  await expect(
    t.mutation(api.orders.createPhysicalOrder, {
      token: staffToken,
      customerName: "Babirye Sarah",
      items: [{ productId: productId1, quantity: 1 }],
      payments: [{ method: "physical", amount: 10000 }], // should be 40000
    })
  ).rejects.toThrow("Payment total mismatch");

  // Test: voucher issuance
  const oneYearFromNow = Date.now() + 365 * 24 * 60 * 60 * 1000;
  const voucherOrderRes = await t.mutation(api.orders.createPhysicalOrder, {
    token: staffToken,
    customerName: "Kizza John",
    items: [],
    payments: [
      { method: "physical", amount: 50000 }
    ],
    voucherItems: [
      { amount: 50000, expiresAt: oneYearFromNow, recipientName: "Kizza John", recipientEmail: "kizza@example.com" }
    ]
  });
  expect(voucherOrderRes.success).toBe(true);
  expect(voucherOrderRes.issuedVouchers.length).toBe(1);
  const issuedCode = voucherOrderRes.issuedVouchers[0].code;
  expect(issuedCode).toMatch(/^GV-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

  // Test lookupVoucher query
  const lookupRes = await t.query(api.giftVouchers.lookupVoucher, {
    token: staffToken,
    code: issuedCode,
  });
  expect(lookupRes.found).toBe(true);
  expect(lookupRes.redeemable).toBe(true);
  expect(lookupRes.remainingBalance).toBe(50000);
  expect(lookupRes.status).toBe("active");

  // Test: partial voucher redemption
  const redeemOrderRes = await t.mutation(api.orders.createPhysicalOrder, {
    token: staffToken,
    customerName: "Kizza John",
    items: [{ productId: productId2, quantity: 2 }], // 2x Wipes = 30000
    payments: [
      { method: "voucher", amount: 30000, voucherCode: issuedCode }
    ]
  });
  expect(redeemOrderRes.success).toBe(true);

  // Verify balance decrements correctly, audit trail recorded, status stays active
  const lookupAfterPartial = await t.query(api.giftVouchers.lookupVoucher, {
    token: staffToken,
    code: issuedCode,
  });
  expect(lookupAfterPartial.remainingBalance).toBe(20000);
  expect(lookupAfterPartial.status).toBe("active");

  const redemptions = await t.run(async (ctx) => {
    return await ctx.db.query("voucherRedemptions").collect();
  });
  expect(redemptions.length).toBe(1);
  expect(redemptions[0].amount).toBe(30000);
  expect(redemptions[0].balanceAfter).toBe(20000);

  // Test: over-redemption attempt throws
  await expect(
    t.mutation(api.orders.createPhysicalOrder, {
      token: staffToken,
      customerName: "Kizza John",
      items: [{ productId: productId2, quantity: 2 }], // 2x Wipes = 30000
      payments: [
        { method: "voucher", amount: 30000, voucherCode: issuedCode } // balance is 20000
      ]
    })
  ).rejects.toThrow("insufficient balance");

  // Test: full redemption -> status flips to depleted
  const redeemOrderResFull = await t.mutation(api.orders.createPhysicalOrder, {
    token: staffToken,
    customerName: "Kizza John",
    items: [{ productId: productId2, quantity: 1 }], // 1x Wipes = 15000
    payments: [
      { method: "voucher", amount: 15000, voucherCode: issuedCode }
    ]
  });
  expect(redeemOrderResFull.success).toBe(true);

  const lookupAfterFull = await t.query(api.giftVouchers.lookupVoucher, {
    token: staffToken,
    code: issuedCode,
  });
  expect(lookupAfterFull.remainingBalance).toBe(5000); // 20000 - 15000 = 5000

  // Finish redeeming the rest
  const redeemOrderResFinal = await t.mutation(api.orders.createPhysicalOrder, {
    token: staffToken,
    customerName: "Kizza John",
    items: [{ productId: productId2, quantity: 1 }], // 1x Wipes = 15000
    payments: [
      { method: "voucher", amount: 5000, voucherCode: issuedCode },
      { method: "physical", amount: 10000 }
    ]
  });
  expect(redeemOrderResFinal.success).toBe(true);

  const lookupAfterFinal = await t.query(api.giftVouchers.lookupVoucher, {
    token: staffToken,
    code: issuedCode,
  });
  expect(lookupAfterFinal.remainingBalance).toBe(0);
  expect(lookupAfterFinal.status).toBe("depleted");
  expect(lookupAfterFinal.redeemable).toBe(false);

  // Test: expired voucher redemption attempt throws
  const expiredVoucherId = await t.run(async (ctx) => {
    return await ctx.db.insert("giftVouchers", {
      code: "GV-EXP1-DATE",
      originalAmount: 10000,
      remainingBalance: 10000,
      expiresAt: Date.now() - 10000, // past
      status: "active",
      issuedOrderId: posOrderRes.orderId,
      createdAt: Date.now() - 20000,
      createdByStaffId: staffLogin.user.id,
    });
  });

  const lookupExpired = await t.query(api.giftVouchers.lookupVoucher, {
    token: staffToken,
    code: "GV-EXP1-DATE",
  });
  expect(lookupExpired.status).toBe("expired");
  expect(lookupExpired.redeemable).toBe(false);

  await expect(
    t.mutation(api.orders.createPhysicalOrder, {
      token: staffToken,
      customerName: "Expired Test",
      items: [{ productId: productId2, quantity: 1 }],
      payments: [
        { method: "voucher", amount: 15000, voucherCode: "GV-EXP1-DATE" }
      ]
    })
  ).rejects.toThrow("expired");

  // ─── 7. Delivery Calculator Tests ───
  // We can insert some mock landmarks and zones
  await t.run(async (ctx) => {
    await ctx.db.insert("deliveryLandmarks", {
      name: "Acacia Mall",
      sub: "Kololo",
      zone: "Kololo",
      lat: 0.3308,
      lng: 32.5861,
    });
    await ctx.db.insert("deliveryLandmarks", {
      name: "Lubowa Estate",
      sub: "Lubowa",
      zone: "Lubowa",
      lat: 0.2520,
      lng: 32.5724,
    });
  });

  // Case A: Coordinates passed directly (Ntinda area, ~5.2 km from Kampala Central)
  const calcDirect = await t.run(async (ctx) => {
    const { calculateDeliveryFeeAndDistance } = await import("./orders");
    return await calculateDeliveryFeeAndDistance(ctx, "Ntinda", undefined, 0.3541, 32.6105);
  });
  expect(calcDirect.distance).toBeDefined();
  expect(calcDirect.distance).toBeGreaterThan(4);
  expect(calcDirect.distance).toBeLessThan(7);
  expect(calcDirect.deliveryFee).toBe(3500); // 3-6 km range is 3500

  // Case B: Landmark matched from db (Lubowa Estate is ~7.1 km)
  const calcLandmark = await t.run(async (ctx) => {
    const { calculateDeliveryFeeAndDistance } = await import("./orders");
    return await calculateDeliveryFeeAndDistance(ctx, "Lubowa", "Lubowa Estate");
  });
  expect(calcLandmark.distance).toBeDefined();
  expect(calcLandmark.distance).toBeGreaterThan(6);
  expect(calcLandmark.distance).toBeLessThan(9);
  expect(calcLandmark.deliveryFee).toBe(5000); // 6-10 km range is 5000

  // Case C: Fallback to zone name (Ntinda = 4000)
  const calcZoneFallback = await t.run(async (ctx) => {
    const { calculateDeliveryFeeAndDistance } = await import("./orders");
    return await calculateDeliveryFeeAndDistance(ctx, "Ntinda", "Ntinda Market"); // coordinates not seeded
  });
  expect(calcZoneFallback.distance).toBeUndefined();
  expect(calcZoneFallback.deliveryFee).toBe(4000); // NTINDA zone fallback is 4000

  // Case D: Fallback to zone name (Kololo = 0)
  const calcFreeFallback = await t.run(async (ctx) => {
    const { calculateDeliveryFeeAndDistance } = await import("./orders");
    return await calculateDeliveryFeeAndDistance(ctx, "Kololo");
  });
  expect(calcFreeFallback.deliveryFee).toBe(0);
});
