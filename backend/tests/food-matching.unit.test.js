
const {
  scoreFoodMatch,
  rankFoodMatches,
  estimateTravelMinutes,
} = require("../src/utils/food-matching");

function listing(overrides = {}) {
  const now = Date.now();

  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Test Meals",
    quantity: 25,
    quantityUnit: "meals",
    distanceKm: 2,
    pickupStartAt: new Date(
      now + 5 * 60000
    ).toISOString(),
    pickupEndAt: new Date(
      now + 3 * 3600000
    ).toISOString(),
    expiresAt: new Date(
      now + 4 * 3600000
    ).toISOString(),
    ...overrides,
  };
}

describe("Food matching algorithm", () => {
  test("estimates travel time", () => {
    expect(estimateTravelMinutes(10)).toBe(30);
  });

  test("returns a score between 0 and 100", () => {
    const result = scoreFoodMatch(listing());

    expect(result).not.toBeNull();
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);
  });

  test("closer food has a better distance score", () => {
    const near = scoreFoodMatch(
      listing({ distanceKm: 1 })
    );

    const far = scoreFoodMatch(
      listing({ distanceKm: 8 })
    );

    expect(near.scoreBreakdown.distance)
      .toBeGreaterThan(far.scoreBreakdown.distance);
  });

  test("more meals have a higher quantity score", () => {
    const small = scoreFoodMatch(
      listing({ quantity: 10 })
    );

    const large = scoreFoodMatch(
      listing({ quantity: 40 })
    );

    expect(large.scoreBreakdown.quantity)
      .toBeGreaterThan(small.scoreBreakdown.quantity);
  });

  test("rejects expired food", () => {
    const result = scoreFoodMatch(
      listing({
        expiresAt: new Date(
          Date.now() - 60000
        ).toISOString(),
      })
    );

    expect(result).toBeNull();
  });

  test("rejects infeasible pickup", () => {
    const result = scoreFoodMatch(
      listing({
        distanceKm: 9,
        pickupEndAt: new Date(
          Date.now() + 10 * 60000
        ).toISOString(),
      })
    );

    expect(result).toBeNull();
  });

  test("does not compare kilograms directly with meals", () => {
    const result = scoreFoodMatch(
      listing({
        quantity: 100,
        quantityUnit: "kg",
      })
    );

    expect(result.scoreBreakdown.quantity).toBe(50);
  });

  test("ranks higher scoring listings first", () => {
    const items = [
      listing({
        id: "22222222-2222-4222-8222-222222222222",
        distanceKm: 8,
      }),
      listing({
        id: "33333333-3333-4333-8333-333333333333",
        distanceKm: 1,
      }),
    ];

    const ranked = rankFoodMatches(items, {
      radiusKm: 10,
    });

    expect(ranked).toHaveLength(2);
    expect(ranked[0].distanceKm).toBe(1);
  });

  test("returns an empty array for no candidates", () => {
    expect(rankFoodMatches([])).toEqual([]);
  });
});
