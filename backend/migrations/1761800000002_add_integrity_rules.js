
exports.up = (pgm) => {
  pgm.sql(`
    -- Automatically update timestamps on record changes
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

    CREATE TRIGGER organizations_updated_at
      BEFORE UPDATE ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

    CREATE TRIGGER volunteers_updated_at
      BEFORE UPDATE ON volunteers
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

    CREATE TRIGGER food_listings_updated_at
      BEFORE UPDATE ON food_listings
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

    CREATE TRIGGER pickup_requests_updated_at
      BEFORE UPDATE ON pickup_requests
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

    CREATE TRIGGER pickup_assignments_updated_at
      BEFORE UPDATE ON pickup_assignments
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

    -- One active request per NGO per food listing.
    -- Rejected and cancelled requests can be retried.
    CREATE UNIQUE INDEX unique_active_ngo_pickup_request
    ON pickup_requests (
      food_listing_id,
      ngo_organization_id
    )
    WHERE status IN (
      'pending',
      'approved',
      'completed'
    );

    -- Prevent duplicate assignment of a request
    -- (also enforced by existing UNIQUE constraint).
    -- No additional assignment index is required.

    -- Ensure pickup window does not extend past expiry
    ALTER TABLE food_listings
    ADD CONSTRAINT pickup_before_expiry
    CHECK (pickup_end_at <= expires_at);

    -- Ensure a requested quantity is positive
    -- (already enforced in the original schema).
    -- Additional quantity availability checks will
    -- be handled using transactions in the API layer.
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE food_listings
      DROP CONSTRAINT IF EXISTS pickup_before_expiry;

    DROP INDEX IF EXISTS unique_active_ngo_pickup_request;

    DROP TRIGGER IF EXISTS
      pickup_assignments_updated_at ON pickup_assignments;

    DROP TRIGGER IF EXISTS
      pickup_requests_updated_at ON pickup_requests;

    DROP TRIGGER IF EXISTS
      food_listings_updated_at ON food_listings;

    DROP TRIGGER IF EXISTS
      volunteers_updated_at ON volunteers;

    DROP TRIGGER IF EXISTS
      organizations_updated_at ON organizations;

    DROP TRIGGER IF EXISTS
      users_updated_at ON users;

    DROP FUNCTION IF EXISTS set_updated_at();
  `);
};
