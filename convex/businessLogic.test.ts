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
    accounts: "accountspassword",
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
      searchText: "Baby Bottle Premium Tommee Tippee Tommee Tippee premium bottle",
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
      description: "Organic baby wipes for sensitive skin",
      tags: [],
      specifications: [],
      searchText: "Organic Baby Wipes WaterWipes Organic baby wipes for sensitive skin",
    });
  });

  // Query products for POS as Staff
  const posProductsResult = await t.query(api.products.getProductsForPOS, {
    token: staffToken,
    paginationOpts: { numItems: 100, cursor: null },
  });
  const posProducts = posProductsResult.page;
  expect(posProducts.length).toBeGreaterThanOrEqual(2);
  expect(posProducts.some((p: any) => p.name === "Baby Bottle Premium")).toBe(true);

  // Query stock list as Admin
  const stockListResult = await t.query(api.products.getStockList, { token: adminToken, paginationOpts: { numItems: 50, cursor: null } });
  const stockList = stockListResult.page;
  expect(stockList.length).toBeGreaterThanOrEqual(2);
  const bottleStock = stockList.find((s: any) => s.id === productId1);
  expect(bottleStock?.inventory).toBe(10);

  // Query stock list as Staff should fail (admin only)
  await expect(
    t.query(api.products.getStockList, { token: staffToken, paginationOpts: { numItems: 50, cursor: null } })
  ).rejects.toThrow("Access denied");

  // Adjust stock as Admin
  const adjustRes = await t.mutation(api.products.adjustStock, {
    token: adminToken,
    productId: productId1,
    delta: 5,
  });
  expect(adjustRes.newInventory).toBe(15);

  const stockListUpdatedResult = await t.query(api.products.getStockList, { token: adminToken, paginationOpts: { numItems: 50, cursor: null } });
  const stockListUpdated = stockListUpdatedResult.page;
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
  const discountListResult = await t.query(api.products.getDiscountList, { token: adminToken });
  const discountList = discountListResult.data;
  expect(discountList.length).toBeGreaterThanOrEqual(1);
  expect(discountList.some((d: any) => d._id === productId1)).toBe(true);

  // Verify POS price was normalized to the discountPrice
  const posProductsDiscountResult = await t.query(api.products.getProductsForPOS, {
    token: staffToken,
    paginationOpts: { numItems: 100, cursor: null },
  });
  const posBottle = posProductsDiscountResult.page.find((p: any) => p._id === productId1);
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
  const customerListResult = await t.query(api.customerActivities.getCustomerList, { token: adminToken });
  const customerList = customerListResult.data;
  expect(customerList.length).toBeGreaterThanOrEqual(1);
  expect(customerList.some((c: any) => c.id === customerId)).toBe(true);

  // List customers as Staff should also succeed (used in Staff CRM tab)
  const staffCustomerListResult = await t.query(api.customerActivities.getCustomerList, { token: staffToken });
  const staffCustomerList = staffCustomerListResult.data;
  expect(staffCustomerList.length).toBeGreaterThanOrEqual(1);

  // Update customer notes as Staff
  await t.mutation(api.customerActivities.updateCustomerNotes, {
    token: staffToken,
    userId: customerId,
    customerNotes: "Olivia prefers organic products and fast deliveries.",
  });

  const customerListNotesResult = await t.query(api.customerActivities.getCustomerList, { token: adminToken });
  const customerListNotes = customerListNotesResult.data;
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
  const activitiesResult = await t.query(api.customerActivities.getActivitiesByCustomer, {
    token: staffToken,
    customerId,
  });
  const activities = activitiesResult.data;
  expect(activities.length).toBe(1);
  expect(activities[0].note).toBe("Followed up on her baby bottle preferences.");
  expect(activities[0].status).toBe("pending");
  expect(activities[0].staffName).toBe("Matovu");

  // Complete CRM Activity
  await t.mutation(api.customerActivities.completeActivity, {
    token: staffToken,
    activityId,
  });

  const activitiesCompletedResult = await t.query(api.customerActivities.getActivitiesByCustomer, {
    token: staffToken,
    customerId,
  });
  const activitiesCompleted = activitiesCompletedResult.data;
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
  const stockListAfterOrderResult = await t.query(api.products.getStockList, { token: adminToken, paginationOpts: { numItems: 50, cursor: null } });
  const stockListAfterOrder = stockListAfterOrderResult.page;
  expect(stockListAfterOrder.find((s: any) => s.id === productId1)?.inventory).toBe(13);
  expect(stockListAfterOrder.find((s: any) => s.id === productId2)?.inventory).toBe(15);

  // Staff lists orders
  const staffOrders = await t.query(api.orders.getOrdersForStaff, {
    token: staffToken,
    paginationOpts: { numItems: 10, cursor: null },
  });
  expect(staffOrders.page.length).toBeGreaterThanOrEqual(1);
  const orderDoc: any = staffOrders.page.find((o: any) => o._id === orderId);
  expect(orderDoc).toBeDefined();
  expect(orderDoc.status).toBe("preparing");
  expect(orderDoc.customerName).toBe("Nakamya Olivia");
  expect(orderDoc.items.length).toBe(2);

  // Staff claims order
  await t.mutation(api.orders.claimOrder, {
    token: staffToken,
    orderId,
  });

  const claimedOrder: any = await t.run(async (ctx) => {
    return await ctx.db.get(orderId);
  });
  expect(claimedOrder.status).toBe("packing");
  expect(claimedOrder.claimedBy).toBe(staffLogin.user.id);
  expect(claimedOrder.timeToClaim).toBeDefined();
  expect(claimedOrder.history.length).toBe(1);
  expect(claimedOrder.history[0].status).toBe("packing");

  // Admin dispatches order (even though Staff claimed it)
  const deliveryTime = Date.now() + 60 * 60 * 1000; // 1 hr future
  await t.mutation(api.orders.handoverToDelivery, {
    token: adminToken,
    orderId,
    deliveryPersonName: "Kateregga John",
    riderPhone: "+256701234567",
    expectedDeliveryTime: deliveryTime,
  });

  const dispatchedOrder: any = await t.run(async (ctx) => {
    return await ctx.db.get(orderId);
  });
  expect(dispatchedOrder.status).toBe("dispatched");
  expect(dispatchedOrder.deliveryPersonName).toBe("Kateregga John");
  expect(dispatchedOrder.riderPhone).toBe("+256701234567");
  expect(dispatchedOrder.timeToDispatch).toBeDefined();

  // Admin completes order (even though Staff claimed it)
  await t.mutation(api.orders.completeOrder, {
    token: adminToken,
    orderId,
  });

  const completedOrder: any = await t.run(async (ctx) => {
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

  // Admin approves return items to trigger restocking
  const pendingItems = await t.run(async (ctx) => {
    return await ctx.db
      .query("returnItems")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
  });
  for (const item of pendingItems) {
    if (item.status === "pending") {
      await t.mutation(api.returns.approveReturnItem, {
        token: adminToken,
        returnItemId: item._id,
      });
    }
  }

  // Verify order status updated to partially_returned
  const returnedOrderDoc: any = await t.run(async (ctx) => {
    return await ctx.db.get(orderId);
  });
  expect(returnedOrderDoc.status).toBe("partially_returned");

  // Verify product inventory was replenished
  const stockListAfterReturnResult = await t.query(api.products.getStockList, { token: adminToken, paginationOpts: { numItems: 50, cursor: null } });
  const stockListAfterReturn = stockListAfterReturnResult.page;
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

  // Admin approves the second batch of return items
  const pendingItems2 = await t.run(async (ctx) => {
    return await ctx.db
      .query("returnItems")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
  });
  for (const item of pendingItems2) {
    if (item.status === "pending") {
      await t.mutation(api.returns.approveReturnItem, {
        token: adminToken,
        returnItemId: item._id,
      });
    }
  }

  // Verify order status updated to returned
  const returnedOrderDoc2: any = await t.run(async (ctx) => {
    return await ctx.db.get(orderId);
  });
  expect(returnedOrderDoc2.status).toBe("returned");

  // Verify product inventory was fully replenished
  const stockListAfterFinalReturnResult = await t.query(api.products.getStockList, { token: adminToken, paginationOpts: { numItems: 50, cursor: null } });
  const stockListAfterFinalReturn = stockListAfterFinalReturnResult.page;
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
      { method: "physical", amount: 150000 }
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
  const ivanActivitiesResult = await t.query(api.customerActivities.getActivitiesByCustomer, {
    token: staffToken,
    customerId: ivan!._id,
  });
  const ivanActivities = ivanActivitiesResult.data;
  expect(ivanActivities.length).toBe(1);
  expect(ivanActivities[0].type).toBe("note");
  expect(ivanActivities[0].note).toBe("Cash payment received at counter");
  expect(ivanActivities[0].status).toBe("completed");

  // Verify POS stock deduction
  const stockListAfterPosResult = await t.query(api.products.getStockList, { token: adminToken, paginationOpts: { numItems: 50, cursor: null } });
  const stockListAfterPos = stockListAfterPosResult.page;
  expect(stockListAfterPos.find((s: any) => s.id === productId1)?.inventory).toBe(12);

  // Verify physical order was created as delivered immediately
  const posOrderDoc: any = await t.run(async (ctx) => {
    return await ctx.db.get(posOrderRes.orderId);
  });
  expect(posOrderDoc.completedAt).toBeDefined();

  // Test customer search query
  const searchByNameRes = await t.query(api.customerActivities.searchCustomers, {
    token: staffToken,
    query: "kato",
  });
  expect(searchByNameRes.data.length).toBeGreaterThanOrEqual(1);
  expect(searchByNameRes.data[0].name).toBe("Kato Ivan");

  const searchByPhoneRes = await t.query(api.customerActivities.searchCustomers, {
    token: staffToken,
    query: "+256780000002",
  });
  expect(searchByPhoneRes.data.length).toBeGreaterThanOrEqual(1);
  expect(searchByPhoneRes.data[0].phone).toBe("+256780000002");

  // Test updating customer name when matching by phone
  const updatedCustomerOrderRes = await t.mutation(api.orders.createPhysicalOrder, {
    token: staffToken,
    customerId: ivan!._id,
    customerName: "Kato Ivan Updated",
    phone: "+256780000002",
    items: [
      { productId: productId1, quantity: 1 },
    ],
    payments: [
      { method: "physical", amount: 50000 }
    ],
  });
  expect(updatedCustomerOrderRes.success).toBe(true);

  const ivanUpdatedDoc = await t.run(async (ctx) => {
    return await ctx.db.get(ivan!._id);
  });
  expect(ivanUpdatedDoc?.name).toBe("Kato Ivan Updated");

  // Test multi-tender order (cash + momo)
  const posOrderResMulti = await t.mutation(api.orders.createPhysicalOrder, {
    token: staffToken,
    customerName: "Babirye Sarah",
    phone: "+256780000003",
    items: [
      { productId: productId1, quantity: 2 }, // 2x Bottles = 100000
    ],
    payments: [
      { method: "physical", amount: 40000 },
      { method: "momo", amount: 60000, momoPhone: "+256770000123", cardOrderId: "momo-tx-123" }
    ],
    note: "Split payment cash and momo",
  });
  expect(posOrderResMulti.success).toBe(true);

  // Verify correct orderPayments rows + paymentMethod: "mixed"
  const multiOrderDoc: any = await t.run(async (ctx) => {
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
  expect(multiPayments.some((p) => p.method === "physical" && p.amount === 40000)).toBe(true);
  expect(multiPayments.some((p) => p.method === "momo" && p.amount === 60000 && p.momoPhone === "+256770000123" && p.cardOrderId === "momo-tx-123")).toBe(true);

  // Test: tender sum mismatch throws error
  await expect(
    t.mutation(api.orders.createPhysicalOrder, {
      token: staffToken,
      customerName: "Babirye Sarah",
      items: [{ productId: productId1, quantity: 1 }],
      payments: [{ method: "physical", amount: 10000 }], // should be 50000
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

  // Case A: Coordinates passed directly, close to the Ntinda hub. Ntinda's min/max fee
  // clamp is flat at 5000, so the fee is deterministic regardless of the exact distance.
  const calcDirect = await t.run(async (ctx) => {
    const { calculateDeliveryFeeAndDistance } = await import("./orders");
    return await calculateDeliveryFeeAndDistance(ctx, "Ntinda", undefined, 0.3541, 32.6105);
  });
  expect(calcDirect.distance).toBeDefined();
  expect(calcDirect.zone).toBe("Ntinda");
  expect(calcDirect.deliveryFee).toBe(5000);

  // Case B: Landmark matched from db (no direct coordinates) — resolves through the
  // landmark's stored lat/lng and prices dynamically off the nearest matched zone.
  const calcLandmark = await t.run(async (ctx) => {
    const { calculateDeliveryFeeAndDistance } = await import("./orders");
    return await calculateDeliveryFeeAndDistance(ctx, "Lubowa", "Lubowa Estate");
  });
  expect(calcLandmark.distance).toBeDefined();
  expect(calcLandmark.distance).toBeGreaterThan(0);
  expect(calcLandmark.deliveryFee).toBeGreaterThan(0);

  // Case C: No coordinates resolvable anywhere — falls back to pricing off the matched
  // zone's base distance directly (Ntinda's clamp is flat at 5000).
  const calcZoneFallback = await t.run(async (ctx) => {
    const { calculateDeliveryFeeAndDistance } = await import("./orders");
    return await calculateDeliveryFeeAndDistance(ctx, "Ntinda", "Ntinda Market"); // coordinates not seeded
  });
  expect(calcZoneFallback.zone).toBe("Ntinda");
  expect(calcZoneFallback.deliveryFee).toBe(5000);

  // Case D: Zone-name-only fallback for Kololo — flat 5000 fee (the old "free Kololo"
  // rule no longer applies; only the pesapal-test-product waiver grants free delivery).
  const calcKololoFallback = await t.run(async (ctx) => {
    const { calculateDeliveryFeeAndDistance } = await import("./orders");
    return await calculateDeliveryFeeAndDistance(ctx, "Kololo");
  });
  expect(calcKololoFallback.zone).toBe("Kololo");
  expect(calcKololoFallback.deliveryFee).toBe(5000);

  // Case E: Coordinates beyond the 35km max delivery radius must be hard-rejected,
  // even if called directly (bypassing any frontend gate).
  await expect(
    t.run(async (ctx) => {
      const { calculateDeliveryFeeAndDistance } = await import("./orders");
      return await calculateDeliveryFeeAndDistance(ctx, "Somewhere Far", undefined, 1.5, 33.5);
    })
  ).rejects.toThrow("out of bounds");

  // ─── 8. Developer Product & POS Stock Sync Tests ───
  // A. Create two products with the same barcode
  const [syncedProduct1, syncedProduct2] = await t.run(async (ctx) => {
    const id1 = await ctx.db.insert("products", {
      name: "Product Online",
      brand: "Test",
      slug: "product-online",
      barcode: "sync-barcode-123",
      price: 20000,
      originalPrice: 20000,
      isActive: true,
      actual_data: true,
      inventory: 15,
      description: "Online version",
      tags: [],
      specifications: [],
      searchText: "Product Online Test Online version",
    });
    const id2 = await ctx.db.insert("products", {
      name: "Product Offline Only",
      brand: "Test",
      slug: "product-offline-only",
      barcode: "sync-barcode-123",
      price: 20000,
      originalPrice: 20000,
      isActive: true,
      actual_data: true,
      inventory: 15,
      description: "Offline version",
      tags: [],
      specifications: [{ label: "for-store-only", value: "true" }],
      searchText: "Product Offline Only Test Offline version",
    });
    return [id1, id2];
  });

  // B. Run createPhysicalOrder (walk-in POS) and check both inventories decrement in sync
  const posSyncRes = await t.mutation(api.orders.createPhysicalOrder, {
    token: staffToken,
    customerName: "Sync Test Customer",
    items: [
      { productId: syncedProduct2, quantity: 3 } // Buy offline product
    ],
    payments: [
      { method: "physical", amount: 60000 }
    ]
  });
  expect(posSyncRes.success).toBe(true);

  // Check both inventories are decremented by 3
  const [posStock1, posStock2] = await t.run(async (ctx) => {
    const p1 = await ctx.db.get(syncedProduct1);
    const p2 = await ctx.db.get(syncedProduct2);
    return [p1?.inventory, p2?.inventory];
  });
  expect(posStock1).toBe(12);
  expect(posStock2).toBe(12);

  // C. Run processReturn and check both inventories increment in sync
  const returnSyncRes = await t.mutation(api.returns.processReturn, {
    token: staffToken,
    orderId: posSyncRes.orderId,
    returnedItems: [
      { productId: syncedProduct2, quantity: 1 } // Return 1
    ],
    refundAmount: 20000,
    note: "Sync return test"
  });
  expect(returnSyncRes.success).toBe(true);

  // Admin approves the synced return item
  const pendingSyncItems = await t.run(async (ctx) => {
    return await ctx.db
      .query("returnItems")
      .withIndex("by_order", (q) => q.eq("orderId", posSyncRes.orderId))
      .collect();
  });
  for (const item of pendingSyncItems) {
    if (item.status === "pending") {
      await t.mutation(api.returns.approveReturnItem, {
        token: adminToken,
        returnItemId: item._id,
      });
    }
  }

  const [retStock1, retStock2] = await t.run(async (ctx) => {
    const p1 = await ctx.db.get(syncedProduct1);
    const p2 = await ctx.db.get(syncedProduct2);
    return [p1?.inventory, p2?.inventory];
  });
  expect(retStock1).toBe(13);
  expect(retStock2).toBe(13);

  // D. Run adjustStock and check both inventories adjust in sync
  const adjustSyncRes = await t.mutation(api.products.adjustStock, {
    token: adminToken,
    productId: syncedProduct1,
    delta: 5 // Adjust online product
  });
  expect(adjustSyncRes.success).toBe(true);

  const [adjStock1, adjStock2] = await t.run(async (ctx) => {
    const p1 = await ctx.db.get(syncedProduct1);
    const p2 = await ctx.db.get(syncedProduct2);
    return [p1?.inventory, p2?.inventory];
  });
  expect(adjStock1).toBe(18);
  expect(adjStock2).toBe(18);

  // ─── 9. Accounting Role Permissions Tests (Balance Books & Business Expenses) ───
  const { accountsToken } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Accounts Test",
      email: "accounts-test@dennan.ug",
      accountRole: "accounting",
      isOnboarded: true,
    });
    const token = "accounts-test-token-12345";
    await ctx.db.insert("staffSessions", {
      token,
      userId,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    return { accountsUserId: userId, accountsToken: token };
  });

  // Accounts user saves cashup balance entry
  const todayStr = "2026-07-24";
  const cashUpId = await t.mutation(api.cashUp.saveCashUpEntry, {
    token: accountsToken,
    date: todayStr,
    physicalCounts: { physical: 500000, momo: 200000, card: 0, voucher: 0 },
    notes: "Accounts audit verified physical cash box",
  });
  expect(cashUpId).toBeDefined();

  // Accounts user adds cashup expense
  const cashUpExpenseId = await t.mutation(api.cashUp.addCashUpExpense, {
    token: accountsToken,
    date: todayStr,
    description: "Audit stationery",
    amount: 15000,
  });
  expect(cashUpExpenseId).toBeDefined();

  // Accounts user reads cashup data
  const cashUpDataResult = await t.query(api.cashUp.getCashUpForDate, {
    token: accountsToken,
    date: todayStr,
  });
  const cashUpData = cashUpDataResult.data;
  expect(cashUpData.entry?.notes).toBe("Accounts audit verified physical cash box");
  expect(cashUpData.expenses.length).toBe(1);
  expect(cashUpData.expenses[0].description).toBe("Audit stationery");

  // Verify COD order attaches to physical cash in cashUp expected totals
  const codOrderRes = await t.mutation(api.orders.adminCreateOrder, {
    token: adminToken,
    userId: customerId,
    deliveryAddress: { name: "COD Customer", zone: "Kira" },
    paymentMethod: "cod",
    items: [{ productId: productId1, quantity: 1 }],
  });
  expect(codOrderRes.success).toBe(true);
  await t.run(async (ctx) => {
    await ctx.db.patch(codOrderRes.orderId, { status: "delivered" });
  });

  const nowDt = new Date();
  const yearStr = nowDt.getFullYear();
  const monthStr = String(nowDt.getMonth() + 1).padStart(2, "0");
  const dayStr = String(nowDt.getDate()).padStart(2, "0");
  const currentDateStr = `${yearStr}-${monthStr}-${dayStr}`;

  const currentCashUp = await t.query(api.cashUp.getCashUpForDate, {
    token: accountsToken,
    date: currentDateStr,
  });
  expect(currentCashUp.data.expected.physical).toBeGreaterThan(0);

  // Accounts user creates business expense
  const bizExpenseId = await t.mutation(api.businessExpenses.createBusinessExpense, {
    token: accountsToken,
    voucherNumber: "VCH-2026-001",
    name: "Office Supplies",
    amount: 45000,
    note: "Printer paper and ink",
  });
  expect(bizExpenseId).toBeDefined();

  // Accounts user lists business expenses
  const bizExpensesListResult = await t.query(api.businessExpenses.listBusinessExpenses, {
    token: accountsToken,
  });
  const bizExpensesList = bizExpensesListResult.data;
  expect(bizExpensesList.some((e: any) => e._id === bizExpenseId)).toBe(true);

  // ─── 10. Order History Date Range Restriction Tests (Accounts & Staff) ───
  // Accounts and Staff users are restricted to current day orders
  const accountsOrderHistory = await t.query(api.orders.adminGetOrdersByDateRange, {
    token: accountsToken,
    startDate: "2020-01-01",
    endDate: "2020-01-02",
    paginationOpts: { numItems: 25, cursor: null },
  });
  expect(accountsOrderHistory).toBeDefined();

  const staffOrderHistory = await t.query(api.orders.adminGetOrdersByDateRange, {
    token: staffToken,
    startDate: "2020-01-01",
    endDate: "2020-01-02",
    paginationOpts: { numItems: 25, cursor: null },
  });
  expect(staffOrderHistory).toBeDefined();

  // ─── 11. Receipt Search by Index & Business Health Metrics Tests ───
  // Test receipt number point-lookup via by_receiptNumber index
  const receiptTestOrderRes = await t.mutation(api.orders.createPhysicalOrder, {
    token: staffToken,
    customerName: "Jane Doe Receipt Test",
    payments: [{ method: "physical", amount: 50000 }],
    items: [{ productId: productId1, quantity: 1 }],
    voucherItems: [],
  });
  expect(receiptTestOrderRes.success).toBe(true);
  expect(receiptTestOrderRes.receiptNumber).toBeDefined();

  const orderFoundByReceiptResult = await t.query(api.orders.getOrderByReceiptNumber, {
    token: staffToken,
    receiptNumber: receiptTestOrderRes.receiptNumber,
  });
  const orderFoundByReceipt = orderFoundByReceiptResult.data;
  expect(orderFoundByReceipt).toBeDefined();
  expect(orderFoundByReceipt?._id).toBe(receiptTestOrderRes.orderId);
  expect(orderFoundByReceipt?.customerName).toBe("Jane Doe Receipt Test");

  // Invalid receipt search returns null
  const invalidReceiptResult = await t.query(api.orders.getOrderByReceiptNumber, {
    token: staffToken,
    receiptNumber: "RCP-INVALID-9999",
  });
  expect(invalidReceiptResult.data).toBeNull();

  // Test Return Receipt generation and searchReceipts query
  const exchangeRes = await t.mutation(api.returns.submitExchange, {
    token: staffToken,
    orderId: receiptTestOrderRes.orderId,
    returnedItems: [{ productId: productId1, quantity: 1, restock: true }],
    exchangeItems: [{ productId: productId2, quantity: 1 }],
  });
  expect(exchangeRes.success).toBe(true);
  expect(exchangeRes.receiptNumber).toBeDefined();
  expect(exchangeRes.receiptNumber).toMatch(/^RET-/);

  // Search by Return Receipt Number
  const searchReturnRes = await t.query(api.returns.searchReceipts, {
    token: staffToken,
    query: exchangeRes.receiptNumber!,
  });
  const returnSearchResult = searchReturnRes.data;
  expect(returnSearchResult.order).toBeDefined();
  expect(returnSearchResult.returns.length).toBeGreaterThan(0);
  expect(returnSearchResult.returns[0].receiptNumber).toBe(exchangeRes.receiptNumber);

  // Search by Order Receipt Number
  const searchOrderRes = await t.query(api.returns.searchReceipts, {
    token: staffToken,
    query: receiptTestOrderRes.receiptNumber,
  });
  const orderSearchResult = searchOrderRes.data;
  expect(orderSearchResult.order).toBeDefined();
  expect(orderSearchResult.order.receiptNumber).toBe(receiptTestOrderRes.receiptNumber);
  expect(orderSearchResult.returns.length).toBeGreaterThan(0);

  // Test Admin Business Health Metrics calculation
  const bizHealthMetricsResult = await t.query(api.businessHealth.getBusinessHealthMetrics, {
    token: adminToken,
  });
  const bizHealthMetrics = bizHealthMetricsResult.data;
  expect(bizHealthMetrics).toBeDefined();
  expect(bizHealthMetrics.grossRevenue).toBeGreaterThanOrEqual(50000);
  expect(bizHealthMetrics.totalDailyExpenses).toBeGreaterThanOrEqual(15000);
  expect(bizHealthMetrics.totalMajorExpenses).toBeGreaterThanOrEqual(45000);
  expect(bizHealthMetrics.netRevenue).toBe(bizHealthMetrics.grossRevenue - bizHealthMetrics.totalExpenses);

  // ─── 15. Multi-Keyword Hybrid Search Test ───
  const multiKeywordSearchResults = await t.query(api.data.searchProducts, {
    query: "tommee tippee bottle",
    limit: 10,
  });
  expect(multiKeywordSearchResults.length).toBeGreaterThan(0);
  expect(multiKeywordSearchResults[0].name).toBe("Baby Bottle Premium");

  // ─── 16. Unified Stock Lifecycle & Physical Audit Tests ───
  // Test physical audit / cycle count mutation
  const auditRes = await t.mutation(api.stockHistory.recordPhysicalAudit, {
    token: adminToken,
    productId: productId1,
    physicalCount: 25,
    reasonCode: "PHYSICAL_AUDIT_SURPLUS",
    note: "Quarterly stock audit adjustment",
  });
  expect(auditRes.success).toBe(true);
  expect(auditRes.afterInventory).toBe(25);

  // Verify product inventory was updated
  const auditedProduct = await t.run(async (ctx) => ctx.db.get(productId1));
  expect(auditedProduct?.inventory).toBe(25);

  // Verify history entry was recorded with reason code
  const product1HistoryRes = await t.query(api.stockHistory.getProductStockHistory, {
    token: adminToken,
    productId: productId1,
  });
  const product1History = product1HistoryRes.data;
  const auditHistoryEntry = product1History.find((h: any) => h.source === "physical_audit");
  expect(auditHistoryEntry).toBeDefined();
  expect(auditHistoryEntry?.reasonCode).toBe("PHYSICAL_AUDIT_SURPLUS");
  expect(auditHistoryEntry?.afterInventory).toBe(25);

  // Verify getStockHistoryFeed works with reasonCode filter
  const feedRes = await t.query(api.stockHistory.getStockHistoryFeed, {
    token: adminToken,
    paginationOpts: { numItems: 10, cursor: null },
    reasonCode: "PHYSICAL_AUDIT_SURPLUS",
  });
  expect(feedRes.page.length).toBeGreaterThan(0);
  expect(feedRes.page[0].reasonCode).toBe("PHYSICAL_AUDIT_SURPLUS");
});



