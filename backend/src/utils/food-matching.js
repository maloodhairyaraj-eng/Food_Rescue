
const WEIGHTS = Object.freeze({
  distance: 0.35,
  urgency: 0.30,
  quantity: 0.20,
  feasibility: 0.15,
});

const AVERAGE_SPEED_KMH = 20;
const COLLECTION_BUFFER_MINUTES = 15;
const MINIMUM_TRAVEL_MINUTES = 5;

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function estimateTravelMinutes(distanceKm) {
  return Math.max(
    MINIMUM_TRAVEL_MINUTES,
    (distanceKm / AVERAGE_SPEED_KMH) * 60
  );
}

function scoreFoodMatch(listing, options = {}) {
  const now = options.now ?? Date.now();
  const radiusKm = options.radiusKm ?? 10;

  const distanceKm = Number(listing.distanceKm);
  const quantity = Number(listing.quantity);

  const expiryTime = Date.parse(listing.expiresAt);
  const pickupStartTime = Date.parse(listing.pickupStartAt);
  const pickupEndTime = Date.parse(listing.pickupEndAt);

  if (
    !Number.isFinite(now) ||
    !Number.isFinite(radiusKm) ||
    radiusKm <= 0 ||
    !Number.isFinite(distanceKm) ||
    distanceKm < 0 ||
    distanceKm > radiusKm ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(expiryTime) ||
    !Number.isFinite(pickupStartTime) ||
    !Number.isFinite(pickupEndTime) ||
    pickupEndTime <= pickupStartTime
  ) {
    return null;
  }

  const travelMinutes = estimateTravelMinutes(distanceKm);
  const arrivalTime = now + travelMinutes * 60000;

  // A volunteer cannot collect food before the pickup window.
  const collectionStartTime = Math.max(
    arrivalTime,
    pickupStartTime
  );

  const estimatedFinishTime =
    collectionStartTime + COLLECTION_BUFFER_MINUTES * 60000;

  const deadline = Math.min(expiryTime, pickupEndTime);

  // Never recommend food that cannot be collected in time.
  if (
    expiryTime <= now ||
    pickupEndTime <= now ||
    estimatedFinishTime >= deadline
  ) {
    return null;
  }

  const remainingMinutes = (deadline - now) / 60000;
  const slackMinutes =
    (deadline - estimatedFinishTime) / 60000;

  const distanceScore = clamp(
    100 * (1 - distanceKm / radiusKm)
  );

  // Highest urgency when the deadline is close.
  // Urgency becomes zero at 6 hours or more.
  const urgencyScore = clamp(
    100 * (1 - remainingMinutes / 360)
  );

  // Quantity scoring for comparable meal counts only.
  // Neutral for other measurement units.
  const quantityScore =
    listing.quantityUnit === "meals"
      ? clamp((quantity / 50) * 100)
      : 50;

  // Full feasibility score at 60 minutes of spare time.
  const feasibilityScore = clamp(
    (slackMinutes / 60) * 100
  );

  const matchScore = round(
    distanceScore * WEIGHTS.distance +
    urgencyScore * WEIGHTS.urgency +
    quantityScore * WEIGHTS.quantity +
    feasibilityScore * WEIGHTS.feasibility
  );

  return {
    ...listing,
    matchScore,
    estimatedTravelMinutes: round(travelMinutes),
    remainingMinutes: round(remainingMinutes),
    collectionSlackMinutes: round(slackMinutes),
    scoreBreakdown: {
      distance: round(distanceScore),
      urgency: round(urgencyScore),
      quantity: round(quantityScore),
      feasibility: round(feasibilityScore),
    },
    matchingModel: "heuristic-v1",
  };
}

function rankFoodMatches(listings, options = {}) {
  return listings
    .map((listing) => scoreFoodMatch(listing, options))
    .filter((listing) => listing !== null)
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }

      if (a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }

      return a.id.localeCompare(b.id);
    });
}

module.exports = {
  WEIGHTS,
  estimateTravelMinutes,
  scoreFoodMatch,
  rankFoodMatches,
};
