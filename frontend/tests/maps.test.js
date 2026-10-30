
import test from "node:test";
import assert from "node:assert/strict";

import {
  isValidCoordinates,
  getGoogleMapsDirectionsUrl,
} from "../lib/maps.js";

test("valid Jaipur coordinates", () => {
  assert.equal(
    isValidCoordinates({
      latitude: 26.9124,
      longitude: 75.7873,
    }),
    true
  );
});

test("invalid latitude rejected", () => {
  assert.equal(
    isValidCoordinates({
      latitude: 100,
      longitude: 75,
    }),
    false
  );
});

test("invalid longitude rejected", () => {
  assert.equal(
    isValidCoordinates({
      latitude: 26,
      longitude: 200,
    }),
    false
  );
});

test("missing coordinates rejected", () => {
  assert.equal(isValidCoordinates(null), false);
});

test("Google Maps URL is generated correctly", () => {
  const url = getGoogleMapsDirectionsUrl({
    latitude: 26.9124,
    longitude: 75.7873,
  });

  const parsed = new URL(url);

  assert.equal(parsed.hostname, "www.google.com");
  assert.equal(parsed.pathname, "/maps/dir/");

  assert.equal(
    parsed.searchParams.get("destination"),
    "26.9124,75.7873"
  );

  assert.equal(
    parsed.searchParams.get("travelmode"),
    "driving"
  );
});

test("invalid location produces no URL", () => {
  assert.equal(
    getGoogleMapsDirectionsUrl({
      latitude: 999,
      longitude: 75,
    }),
    null
  );
});
