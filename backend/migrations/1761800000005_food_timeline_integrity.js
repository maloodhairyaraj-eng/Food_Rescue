
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE food_listings
      ADD CONSTRAINT food_preparation_before_pickup_end
      CHECK (
        prepared_at IS NULL
        OR prepared_at < pickup_end_at
      );

    CREATE INDEX food_listings_expiry_maintenance_idx
      ON food_listings(expires_at, pickup_end_at)
      WHERE status = 'available';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS
      food_listings_expiry_maintenance_idx;

    ALTER TABLE food_listings
      DROP CONSTRAINT IF EXISTS
        food_preparation_before_pickup_end;
  `);
};
