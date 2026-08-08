// @ts-nocheck
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("staff auth session lifecycle", async () => {
  // Set up test environment variables
  process.env.STAFF_AUTH_SALT = "test-salt-12345";
  process.env.STAFF_PASSWORDS_JSON = JSON.stringify({
    matovu: "matovupassword",
    brian: "brianpassword",
    jeremy: "Tiger$Raven84",
  });

  const t = convexTest(schema, modules);

  // 1. Seed staff members
  const seedResult = await t.mutation(api.staffAuth.seedStaff, {});
  expect(seedResult.success).toBe(true);

  // 2. Attempt login with wrong password
  await expect(
    t.mutation(api.staffAuth.login, {
      email: "matovu@dennan.ug",
      password: "wrongpassword",
    })
  ).rejects.toThrow("Invalid email or password");

  // 3. Login with correct password
  const loginResult = await t.mutation(api.staffAuth.login, {
    email: "matovu@dennan.ug",
    password: "matovupassword",
  });
  expect(loginResult.token).toBeDefined();
  expect(loginResult.user.name).toBe("Matovu");
  expect(loginResult.user.accountRole).toBe("staff");

  const token = loginResult.token;

  // 4. Verify token
  const verifyResult = await t.query(api.staffAuth.verifyToken, { token });
  expect(verifyResult).not.toBeNull();
  expect(verifyResult?.name).toBe("Matovu");
  expect(verifyResult?.accountRole).toBe("staff");

  // 5. Rotate session token
  const rotationResult = await t.mutation(api.staffAuth.rotateSessionToken, { token });
  expect(rotationResult.token).toBeDefined();
  expect(rotationResult.token).not.toBe(token);
  expect(rotationResult.user.name).toBe("Matovu");

  const newToken = rotationResult.token;

  // 6. Verify rotated token
  const verifyNewResult = await t.query(api.staffAuth.verifyToken, { token: newToken });
  expect(verifyNewResult).not.toBeNull();
  expect(verifyNewResult?.name).toBe("Matovu");

  // 7. Verify old token is now invalid/deleted
  const verifyOldResult = await t.query(api.staffAuth.verifyToken, { token });
  expect(verifyOldResult).toBeNull();

  // 8. Test getStaffList as non-admin (should throw)
  await expect(
    t.query(api.staffAuth.getStaffList, { token: newToken })
  ).rejects.toThrow("Access denied");

  // 9. Login as admin
  const adminLoginResult = await t.mutation(api.staffAuth.login, {
    email: "brian@dennan.ug",
    password: "brianpassword",
  });
  const adminToken = adminLoginResult.token;

  // 10. Test getStaffList as admin (should succeed)
  const staffList = await t.query(api.staffAuth.getStaffList, { token: adminToken });
  expect(staffList).toBeDefined();
  expect(staffList.data.length).toBeGreaterThan(0);
  expect(staffList.data.some((s: any) => s.name === "Matovu")).toBe(true);

  // 11. Logout
  const logoutResult = await t.mutation(api.staffAuth.logout, { token: newToken });
  expect(logoutResult.success).toBe(true);

  // 12. Verify logged out token is invalid
  const verifyLogoutResult = await t.query(api.staffAuth.verifyToken, { token: newToken });
  expect(verifyLogoutResult).toBeNull();

  // 13. Test Jeremy login and productEditor account role
  const jeremyLogin = await t.mutation(api.staffAuth.login, {
    email: "jeremy@dennan.ug",
    password: "Tiger$Raven84",
  });
  expect(jeremyLogin.token).toBeDefined();
  expect(jeremyLogin.user.name).toBe("Jeremy");
  expect(jeremyLogin.user.accountRole).toBe("productEditor");

  // 14. Verify Jeremy (productEditor) can list catalog products and edit product details
  const catalog = await t.query(api.products.listCatalogProducts, { token: jeremyLogin.token });
  expect(catalog).toBeDefined();

  if (catalog.length > 0) {
    const prod = catalog[0];
    const updateRes = await t.mutation(api.products.updateProduct, {
      token: jeremyLogin.token,
      productId: prod.id,
      description: "Updated by Jeremy",
    });
    expect(updateRes.success).toBe(true);

    const adjustRes = await t.mutation(api.products.adjustStock, {
      token: jeremyLogin.token,
      productId: prod.id,
      delta: 2,
    });
    expect(adjustRes.newInventory).toBeDefined();
  }
});
