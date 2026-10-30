exports.up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    -- 1. USERS
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password_hash TEXT NOT NULL,
      phone VARCHAR(20),
      role VARCHAR(20) NOT NULL
        CHECK (role IN (
          'admin', 'ngo', 'donor', 'volunteer'
        )),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX users_email_unique_idx
      ON users (LOWER(email));

    -- 2. ORGANIZATIONS
    CREATE TABLE organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
      name VARCHAR(200) NOT NULL,
      organization_type VARCHAR(30) NOT NULL
        CHECK (organization_type IN (
          'ngo', 'restaurant', 'hostel',
          'caterer', 'other_donor'
        )),
      description TEXT,
      contact_phone VARCHAR(20),
      address TEXT,
      location GEOGRAPHY(POINT, 4326),
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 3. VOLUNTEERS
    CREATE TABLE volunteers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE
        REFERENCES users(id) ON DELETE RESTRICT,
      location GEOGRAPHY(POINT, 4326),
      is_available BOOLEAN NOT NULL DEFAULT FALSE,
      vehicle_type VARCHAR(30)
        CHECK (vehicle_type IN (
          'walking', 'bicycle', 'bike', 'car', 'van'
        )),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 4. FOOD LISTINGS
    CREATE TABLE food_listings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      donor_organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE RESTRICT,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      food_type VARCHAR(30) NOT NULL
        CHECK (food_type IN (
          'veg', 'non_veg', 'vegan', 'mixed'
        )),
      quantity INTEGER NOT NULL
        CHECK (quantity > 0),
      quantity_unit VARCHAR(30) NOT NULL
        DEFAULT 'meals',
      prepared_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL,
      pickup_start_at TIMESTAMPTZ NOT NULL,
      pickup_end_at TIMESTAMPTZ NOT NULL,
      pickup_address TEXT NOT NULL,
      pickup_location GEOGRAPHY(POINT, 4326) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'available'
        CHECK (status IN (
          'available', 'reserved',
          'picked_up', 'completed',
          'expired', 'cancelled'
        )),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT valid_pickup_window
        CHECK (pickup_end_at > pickup_start_at),

      CONSTRAINT valid_expiry_window
        CHECK (expires_at >= pickup_start_at),

      CONSTRAINT valid_preparation_time
        CHECK (
          prepared_at IS NULL OR
          expires_at > prepared_at
        )
    );

    -- 5. PICKUP REQUESTS
    CREATE TABLE pickup_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      food_listing_id UUID NOT NULL
        REFERENCES food_listings(id) ON DELETE RESTRICT,
      ngo_organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE RESTRICT,
      requested_by_user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
      requested_quantity INTEGER NOT NULL
        CHECK (requested_quantity > 0),
      status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
          'pending', 'approved',
          'rejected', 'cancelled',
          'completed'
        )),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 6. PICKUP ASSIGNMENTS
    CREATE TABLE pickup_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pickup_request_id UUID NOT NULL UNIQUE
        REFERENCES pickup_requests(id) ON DELETE RESTRICT,
      volunteer_id UUID NOT NULL
        REFERENCES volunteers(id) ON DELETE RESTRICT,
      status VARCHAR(30) NOT NULL DEFAULT 'assigned'
        CHECK (status IN (
          'assigned', 'accepted',
          'in_transit', 'delivered',
          'cancelled'
        )),
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      picked_up_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT valid_assignment_times CHECK (
        (picked_up_at IS NULL OR picked_up_at >= assigned_at)
        AND
        (delivered_at IS NULL OR picked_up_at IS NOT NULL)
        AND
        (delivered_at IS NULL OR delivered_at >= picked_up_at)
      )
    );

    -- SPATIAL INDEXES
    CREATE INDEX organizations_location_idx
      ON organizations USING GIST (location);

    CREATE INDEX volunteers_location_idx
      ON volunteers USING GIST (location);

    CREATE INDEX food_listings_location_idx
      ON food_listings USING GIST (pickup_location);

    -- RELATIONAL INDEXES
    CREATE INDEX organizations_owner_idx
      ON organizations(owner_user_id);

    CREATE INDEX food_listings_donor_idx
      ON food_listings(donor_organization_id);

    CREATE INDEX food_listings_status_expiry_idx
      ON food_listings(status, expires_at);

    CREATE INDEX pickup_requests_listing_idx
      ON pickup_requests(food_listing_id);

    CREATE INDEX pickup_requests_ngo_idx
      ON pickup_requests(ngo_organization_id);

    CREATE INDEX pickup_assignments_volunteer_idx
      ON pickup_assignments(volunteer_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS pickup_assignments;
    DROP TABLE IF EXISTS pickup_requests;
    DROP TABLE IF EXISTS food_listings;
    DROP TABLE IF EXISTS volunteers;
    DROP TABLE IF EXISTS organizations;
    DROP TABLE IF EXISTS users;
  `);
};
