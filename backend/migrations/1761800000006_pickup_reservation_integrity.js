
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE food_listings
      ADD COLUMN reserved_at TIMESTAMPTZ;

    -- At most one pending or approved request
    -- can hold a listing at a time.
    CREATE UNIQUE INDEX unique_active_listing_reservation
      ON pickup_requests(food_listing_id)
      WHERE status IN ('pending', 'approved');

    CREATE INDEX pickup_requests_status_idx
      ON pickup_requests(status, created_at);

    -- Pending and approved requests must
    -- reserve the complete listing quantity.
    CREATE OR REPLACE FUNCTION enforce_full_listing_request()
    RETURNS TRIGGER AS $$
    DECLARE
      listing_quantity INTEGER;
    BEGIN
      SELECT quantity INTO listing_quantity
      FROM food_listings
      WHERE id = NEW.food_listing_id;

      IF listing_quantity IS NULL THEN
        RAISE EXCEPTION 'Food listing does not exist';
      END IF;

      IF NEW.requested_quantity <> listing_quantity THEN
        RAISE EXCEPTION
          'Pickup request must reserve the full listing quantity';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER pickup_request_full_quantity
      BEFORE INSERT OR UPDATE OF requested_quantity, food_listing_id
      ON pickup_requests
      FOR EACH ROW
      EXECUTE FUNCTION enforce_full_listing_request();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS
      pickup_request_full_quantity ON pickup_requests;

    DROP FUNCTION IF EXISTS enforce_full_listing_request();

    DROP INDEX IF EXISTS pickup_requests_status_idx;
    DROP INDEX IF EXISTS unique_active_listing_reservation;

    ALTER TABLE food_listings
      DROP COLUMN IF EXISTS reserved_at;
  `);
};
