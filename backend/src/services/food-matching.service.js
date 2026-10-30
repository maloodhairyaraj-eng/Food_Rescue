
const {
  getNearbyFoodListings,
} = require("./nearby-food.service");

const {
  rankFoodMatches,
} = require("../utils/food-matching");

const MAX_CANDIDATES = 500;

async function getSmartFoodMatches(user, filters = {}) {
  const radiusKm = Number(filters.radiusKm ?? 10);
  const limit = Number(filters.limit ?? 20);
  const offset = Number(filters.offset ?? 0);

  // Fetch the candidate pool without applying
  // the requested output pagination.
  const nearby = await getNearbyFoodListings(user, {
    radiusKm,
    foodType: filters.foodType,
    limit: MAX_CANDIDATES,
    offset: 0,
  });

  const ranked = rankFoodMatches(nearby.listings, {
    radiusKm,
  });

  const paginated = ranked.slice(
    offset,
    offset + limit
  );

  return {
    listings: paginated,
    matching: {
      model: "heuristic-v1",
      weights: {
        distance: 35,
        urgency: 30,
        quantity: 20,
        feasibility: 15,
      },
      estimatedSpeedKmh: 20,
      collectionBufferMinutes: 15,
      candidateLimit: MAX_CANDIDATES,
      candidatePoolTruncated:
        nearby.pagination.total > MAX_CANDIDATES,
    },
    search: {
      radiusKm,
      origin: "ngo_organization",
    },
    pagination: {
      total: ranked.length,
      limit,
      offset,
    },
  };
}

module.exports = { getSmartFoodMatches };
