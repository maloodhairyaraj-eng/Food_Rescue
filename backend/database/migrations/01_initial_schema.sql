-- Enable PostGIS extension for geospatial operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Donors Table
CREATE TABLE donors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) UNIQUE NOT NULL,
    location geography(Point, 4326)
);

-- 2. NGOs Table (Updated with Demand Profile fields)
CREATE TABLE ngos (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    capacity_kg INT,
    accepts_buffet BOOLEAN,
    location geography(Point, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Food Listings Table
CREATE TABLE food_listings (
    id SERIAL PRIMARY KEY,
    donor_id INT REFERENCES donors(id),
    title VARCHAR(255) NOT NULL,
    quantity VARCHAR(50) NOT NULL,
    available_until TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'AVAILABLE',
    pickup_location geography(Point, 4326)
);

-- 4. Pickup Requests Table
CREATE TABLE pickup_requests (
    id SERIAL PRIMARY KEY,
    listing_id INT REFERENCES food_listings(id),
    ngo_id INT REFERENCES ngos(id),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create GiST indexes for rapid distance/radius calculations
CREATE INDEX idx_ngos_location ON ngos USING GIST (location);
CREATE INDEX idx_food_listings_location ON food_listings USING GIST (pickup_location);
CREATE INDEX idx_donors_location ON donors USING GIST (location);