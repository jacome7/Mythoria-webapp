import { paymentService, type CreditPackage } from "./payment";

describe("paymentService.calculateOrderTotal", () => {
  it("calculates totals for valid packages", async () => {
    const getPkgSpy = jest
      .spyOn(paymentService, "getCreditPackage")
      .mockImplementation(async (id) => {
        if (id === 1) {
          return { id: 1, credits: 100, price: 10 } as CreditPackage;
        }
        if (id === 2) {
          return { id: 2, credits: 200, price: 18 } as CreditPackage;
        }
        return undefined;
      });

    const result = await paymentService.calculateOrderTotal([
      { packageId: 1, quantity: 2 },
      { packageId: 2, quantity: 1 },
    ]);

    expect(result.totalCredits).toBe(400);
    expect(result.totalAmount).toBe(38);
    expect(result.itemsBreakdown).toHaveLength(2);
    getPkgSpy.mockRestore();
  });

  it("throws for invalid package id", async () => {
    jest.spyOn(paymentService, "getCreditPackage").mockResolvedValue(undefined);
    await expect(
      paymentService.calculateOrderTotal([{ packageId: 99, quantity: 1 }]),
    ).rejects.toThrow("Invalid package ID: 99");
  });
});

describe("paymentService.verifyWebhookSignature", () => {
  const secret = "test_secret";

  beforeEach(() => {
    process.env.REVOLUT_WEBHOOK_SECRET = secret;
  });

  it("returns true for valid signature", async () => {
    const payload = JSON.stringify({ order_id: "1" });
    const timestamp = String(Date.now());
    const crypto = await import("crypto");
    const digest = crypto
      .createHmac("sha256", secret)
      .update(`v1.${timestamp}.${payload}`)
      .digest("hex");
    const signature = `v1=${digest}`;

    await expect(
      paymentService.verifyWebhookSignature(payload, signature, timestamp),
    ).resolves.toBe(true);
  });

  it("returns false for invalid signature", async () => {
    const payload = JSON.stringify({ order_id: "1" });
    const timestamp = String(Date.now());
    const signature = "v1=invalid";
    await expect(
      paymentService.verifyWebhookSignature(payload, signature, timestamp),
    ).resolves.toBe(false);
  });
});
