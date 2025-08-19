import { creditService } from "./services";

describe("creditService.canAfford", () => {
  it("returns true when balance is sufficient", async () => {
    jest.spyOn(creditService, "getAuthorCreditBalance").mockResolvedValue(100);
    await expect(creditService.canAfford("user", 50)).resolves.toBe(true);
  });

  it("returns false when balance is insufficient", async () => {
    jest.spyOn(creditService, "getAuthorCreditBalance").mockResolvedValue(30);
    await expect(creditService.canAfford("user", 50)).resolves.toBe(false);
  });
});

describe("creditService.deductCredits", () => {
  it("throws when user cannot afford", async () => {
    jest.spyOn(creditService, "canAfford").mockResolvedValue(false);
    await expect(
      creditService.deductCredits("user", 10, "eBookGeneration"),
    ).rejects.toThrow("Insufficient credits");
  });

  it("records deduction when user can afford", async () => {
    jest.spyOn(creditService, "canAfford").mockResolvedValue(true);
    const addSpy = jest
      .spyOn(creditService, "addCreditEntry")
      .mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof creditService.addCreditEntry>>,
      );

    await creditService.deductCredits("user", 10, "eBookGeneration", "story1");

    expect(addSpy).toHaveBeenCalledWith(
      "user",
      -10,
      "eBookGeneration",
      "story1",
    );
  });
});

describe("creditService.addCredits", () => {
  it("delegates to addCreditEntry", async () => {
    const addSpy = jest
      .spyOn(creditService, "addCreditEntry")
      .mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof creditService.addCreditEntry>>,
      );
    await creditService.addCredits("user", 20, "creditPurchase", "p1");
    expect(addSpy).toHaveBeenCalledWith(
      "user",
      20,
      "creditPurchase",
      undefined,
      "p1",
    );
  });
});
