
export function isValidCoordinates(location) {
  if (!location) return false;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function getGoogleMapsDirectionsUrl(location) {
  if (!isValidCoordinates(location)) {
    return null;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  const destination = encodeURIComponent(
    `${latitude},${longitude}`
  );

  return (
    "https://www.google.com/maps/dir/" +
    `?api=1&destination=${destination}` +
    "&travelmode=driving"
  );
}