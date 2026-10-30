
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function getGoogleMapsUrl(
  location: Coordinates
): string {
  const { latitude, longitude } = location;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Invalid coordinates");
  }

  const query = encodeURIComponent(
    `${latitude},${longitude}`
  );

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function getGoogleMapsDirectionsUrl(
  destination: Coordinates
): string {
  const { latitude, longitude } = destination;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Invalid coordinates");
  }

  const query = encodeURIComponent(
    `${latitude},${longitude}`
  );

  return (
    "https://www.google.com/maps/dir/" +
    `?api=1&destination=${query}` +
    "&travelmode=driving"
  );
}
