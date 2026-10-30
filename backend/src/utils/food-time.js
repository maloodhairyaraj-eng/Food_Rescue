
const ISO_WITH_TIMEZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/;

function parseTimestamp(value) {
  if (typeof value !== "string") {
    return null;
  }

  if (!ISO_WITH_TIMEZONE.test(value)) {
    return null;
  }

  const time = Date.parse(value);

  return Number.isFinite(time) ? time : null;
}

function validateFoodTimeline(data, options = {}) {
  const {
    requireFuturePickupStart = true,
    now = Date.now(),
  } = options;

  const expires = parseTimestamp(data.expiresAt);
  const start = parseTimestamp(data.pickupStartAt);
  const end = parseTimestamp(data.pickupEndAt);

  const prepared = data.preparedAt == null
    ? null
    : parseTimestamp(data.preparedAt);

  if (
    expires === null ||
    start === null ||
    end === null
  ) {
    return "Timestamps must include a timezone";
  }

  if (data.preparedAt != null && prepared === null) {
    return "Invalid preparation timestamp";
  }

  if (expires <= now) {
    return "Food expiry must be in the future";
  }

  if (
    requireFuturePickupStart &&
    start < now - 60000
  ) {
    return "Pickup start cannot be in the past";
  }

  if (end <= now) {
    return "Pickup window has already ended";
  }

  if (end <= start || end > expires) {
    return "Invalid pickup window";
  }

  if (
    prepared !== null &&
    (
      prepared > now ||
      prepared >= expires ||
      prepared >= end
    )
  ) {
    return "Invalid preparation time";
  }

  return null;
}

module.exports = {
  parseTimestamp,
  validateFoodTimeline,
};
