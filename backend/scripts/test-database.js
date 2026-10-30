
require("dotenv").config();

const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const { pool } = require("../src/config/db");

const EXPECTED_DATABASE = "zero_waste_db";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTests() {
  const client = await pool.connect();
  let transactionStarted = false;
  let passed = 0;

  function pass(message) {
    passed++;
    console.log(`PASS: ${message}`);
  }

  try {
    // -----------------------------------------
    // SAFETY: VERIFY DATABASE
    // -----------------------------------------

    const databaseResult = await client.query(
      "SELECT current_database() AS name"
    );

    const databaseName = databaseResult.rows[0].name;

    assert(
      databaseName === EXPECTED_DATABASE,
      `Wrong database: ${databaseName}`
    );

    console.log(`Database verified: ${databaseName}`);

    // -----------------------------------------
    // START TEST TRANSACTION
    // -----------------------------------------

    await client.query("BEGIN");
    transactionStarted = true;

    const uniqueId = crypto.randomUUID();

    // -----------------------------------------
    // TEST 1: POSTGIS EXTENSION
    // -----------------------------------------

    const postgisResult = await client.query(
      "SELECT PostGIS_Version() AS version"
    );

    assert(
      Boolean(postgisResult.rows[0].version),
      "PostGIS extension unavailable"
    );

    pass("PostGIS extension available");

    // -----------------------------------------
    // TEST 2: CREATE DONOR USER
    // -----------------------------------------

    const passwordHash = await bcrypt.hash(
      "SecureDatabaseTest123!",
      10
    );

    const donorResult = await client.query(
      `
      INSERT INTO users (
        full_name,
        email,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [
        "Database Test Donor",
        `db-donor-${uniqueId}@example.com`,
        passwordHash,
        "donor",
        true,
      ]
    );

    const donorUserId = donorResult.rows[0].id;

    assert(donorUserId, "Donor creation failed");

    pass("Donor user created");

    // -----------------------------------------
    // TEST 3: CREATE DONOR ORGANIZATION
    // -----------------------------------------

    const donorOrgResult = await client.query(
      `
      INSERT INTO organizations (
        owner_user_id,
        name,
        organization_type,
        description,
        address,
        location
      )
      VALUES (
        $1, $2, $3, $4, $5,
        ST_SetSRID(
          ST_MakePoint($6, $7),
          4326
        )::geography
      )
      RETURNING id
      `,
      [
        donorUserId,
        "Database Test Restaurant",
        "restaurant",
        "Automated database testing",
        "Jaipur, Rajasthan",
        75.7873,
        26.9124,
      ]
    );

    const donorOrganizationId =
      donorOrgResult.rows[0].id;

    assert(
      donorOrganizationId,
      "Donor organization creation failed"
    );

    pass("Donor organization created");

    // -----------------------------------------
    // TEST 4: CREATE FOOD LISTING
    // -----------------------------------------

    const now = Date.now();

    const preparedAt = new Date(
      now - 10 * 60 * 1000
    );

    const pickupStartAt = new Date(
      now + 10 * 60 * 1000
    );

    const pickupEndAt = new Date(
      now + 2 * 60 * 60 * 1000
    );

    const expiresAt = new Date(
      now + 4 * 60 * 60 * 1000
    );

    const foodResult = await client.query(
      `
      INSERT INTO food_listings (
        donor_organization_id,
        title,
        description,
        food_type,
        quantity,
        quantity_unit,
        prepared_at,
        expires_at,
        pickup_start_at,
        pickup_end_at,
        pickup_address,
        pickup_location
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        ST_SetSRID(
          ST_MakePoint($12, $13),
          4326
        )::geography
      )
      RETURNING id, quantity
      `,
      [
        donorOrganizationId,
        "Database Test Meals",
        "Fresh surplus meals",
        "veg",
        25,
        "meals",
        preparedAt,
        expiresAt,
        pickupStartAt,
        pickupEndAt,
        "Jaipur, Rajasthan",
        75.7873,
        26.9124,
      ]
    );

    const foodListingId = foodResult.rows[0].id;
    const foodQuantity = foodResult.rows[0].quantity;

    assert(foodListingId, "Food listing creation failed");

    pass("Food listing created");

    // -----------------------------------------
    // TEST 5: POSTGIS DISTANCE
    // -----------------------------------------

    const distanceResult = await client.query(
      `
      SELECT ST_Distance(
        ST_SetSRID(
          ST_MakePoint(75.7873, 26.9124),
          4326
        )::geography,
        ST_SetSRID(
          ST_MakePoint(75.8000, 26.9200),
          4326
        )::geography
      ) AS distance
      `
    );

    assert(
      Number(distanceResult.rows[0].distance) > 0,
      "PostGIS distance calculation failed"
    );

    pass("PostGIS distance calculation");

    // -----------------------------------------
    // TEST 6: UPDATED_AT TRIGGER
    // -----------------------------------------

    const timestampResult = await client.query(
      `
      UPDATE food_listings
      SET title = 'Updated Database Test Meals'
      WHERE id = $1
      RETURNING updated_at
      `,
      [foodListingId]
    );

    assert(
      timestampResult.rows[0].updated_at,
      "updated_at trigger failed"
    );

    pass("updated_at trigger works");

    // -----------------------------------------
    // TEST 7: NEGATIVE QUANTITY REJECTED
    // -----------------------------------------

    await client.query("SAVEPOINT invalid_quantity");

    let negativeQuantityRejected = false;

    try {
      await client.query(
        `
        UPDATE food_listings
        SET quantity = -5
        WHERE id = $1
        `,
        [foodListingId]
      );
    } catch (error) {
      negativeQuantityRejected = true;
    }

    await client.query(
      "ROLLBACK TO SAVEPOINT invalid_quantity"
    );

    assert(
      negativeQuantityRejected,
      "Negative quantity was not rejected"
    );

    pass("Negative quantity rejected");

    // -----------------------------------------
    // TEST 8: CREATE NGO USER
    // -----------------------------------------

    const ngoUserResult = await client.query(
      `
      INSERT INTO users (
        full_name,
        email,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING id
      `,
      [
        "Database Test NGO",
        `db-ngo-${uniqueId}@example.com`,
        passwordHash,
        "ngo",
      ]
    );

    const ngoUserId = ngoUserResult.rows[0].id;

    assert(ngoUserId, "NGO user creation failed");

    // -----------------------------------------
    // TEST 9: CREATE NGO ORGANIZATION
    // -----------------------------------------

    const ngoOrgResult = await client.query(
      `
      INSERT INTO organizations (
        owner_user_id,
        name,
        organization_type,
        address,
        location
      )
      VALUES (
        $1, $2, $3, $4,
        ST_SetSRID(
          ST_MakePoint($5, $6),
          4326
        )::geography
      )
      RETURNING id
      `,
      [
        ngoUserId,
        "Database Test NGO",
        "ngo",
        "Jaipur, Rajasthan",
        75.7873,
        26.9124,
      ]
    );

    const ngoOrganizationId =
      ngoOrgResult.rows[0].id;

    assert(
      ngoOrganizationId,
      "NGO organization creation failed"
    );

    pass("NGO organization created");

    // -----------------------------------------
    // TEST 10: FULL-LISTING PICKUP REQUEST
    // -----------------------------------------

    // The quantity comes directly from food_listings.
    // This satisfies our Step 8.1 database trigger.

    const pickupResult = await client.query(
      `
      INSERT INTO pickup_requests (
        food_listing_id,
        ngo_organization_id,
        requested_by_user_id,
        requested_quantity
      )
      SELECT
        f.id,
        $2,
        $3,
        f.quantity
      FROM food_listings f
      WHERE f.id = $1
      RETURNING id, requested_quantity, status
      `,
      [
        foodListingId,
        ngoOrganizationId,
        ngoUserId,
      ]
    );

    assert(
      pickupResult.rowCount === 1,
      "Pickup request creation failed"
    );

    assert(
      Number(pickupResult.rows[0].requested_quantity) ===
        Number(foodQuantity),
      "Pickup quantity does not match listing quantity"
    );

    pass("Full-listing pickup request created");

    // -----------------------------------------
    // TEST 11: DUPLICATE ACTIVE REQUEST REJECTED
    // -----------------------------------------

    await client.query("SAVEPOINT duplicate_pickup");

    let duplicateRejected = false;

    try {
      await client.query(
        `
        INSERT INTO pickup_requests (
          food_listing_id,
          ngo_organization_id,
          requested_by_user_id,
          requested_quantity
        )
        SELECT
          f.id,
          $2,
          $3,
          f.quantity
        FROM food_listings f
        WHERE f.id = $1
        `,
        [
          foodListingId,
          ngoOrganizationId,
          ngoUserId,
        ]
      );
    } catch (error) {
      if (error.code === "23505") {
        duplicateRejected = true;
      } else {
        throw error;
      }
    } finally {
      await client.query(
        "ROLLBACK TO SAVEPOINT duplicate_pickup"
      );
    }

    assert(
      duplicateRejected,
      "Duplicate active pickup request was accepted"
    );

    pass("Duplicate active pickup request rejected");

    // -----------------------------------------
    // TEST 12: VERIFY PICKUP PERSISTENCE
    // -----------------------------------------

    const pickupCheck = await client.query(
      `
      SELECT
        p.id,
        p.status,
        p.requested_quantity,
        f.quantity AS listing_quantity
      FROM pickup_requests p
      JOIN food_listings f
        ON f.id = p.food_listing_id
      WHERE p.id = $1
      `,
      [pickupResult.rows[0].id]
    );

    assert(
      pickupCheck.rowCount === 1,
      "Pickup request not persisted"
    );

    assert(
      Number(pickupCheck.rows[0].requested_quantity) ===
        Number(pickupCheck.rows[0].listing_quantity),
      "Incorrect pickup quantity persisted"
    );

    pass("Pickup request persisted correctly");

    // -----------------------------------------
    // ROLLBACK ALL TEST RECORDS
    // -----------------------------------------

    await client.query("ROLLBACK");
    transactionStarted = false;

    console.log("Test transaction rolled back.");
    console.log(
      `SUCCESS: All ${passed} database tests passed.`
    );

  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
        console.log("Test transaction rolled back.");
      } catch (rollbackError) {
        console.error(
          "Rollback failed:",
          rollbackError.message
        );
      }
    }

    console.error(
      "Database test failed:",
      error
    );

    process.exitCode = 1;

  } finally {
    client.release();
    await pool.end();
  }
}

runTests().catch((error) => {
  console.error("Unexpected test error:", error);
  process.exitCode = 1;
});
