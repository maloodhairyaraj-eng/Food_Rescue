
const {
  expireReservations,
} = require("../src/services/reservation-expiry.service");

function mockDatabase(responses = []) {
  const query = jest.fn();

  let index = 0;

  query.mockImplementation(async (sql) => {
    const text = String(sql).trim();

    if (
      text === "BEGIN" ||
      text === "COMMIT" ||
      text === "ROLLBACK"
    ) {
      return { rows: [], rowCount: 0 };
    }

    const response = responses[index++];

    if (response instanceof Error) {
      throw response;
    }

    return response || {
      rows: [],
      rowCount: 0,
    };
  });

  const release = jest.fn();

  return {
    db: {
      connect: jest.fn().mockResolvedValue({
        query,
        release,
      }),
    },
    query,
    release,
  };
}

describe("Reservation expiry service", () => {
  test("rejects invalid batch size", async () => {
    await expect(
      expireReservations({ batchSize: 0 })
    ).rejects.toThrow("Invalid batch size");
  });

  test("commits when no reservations are expired", async () => {
    const mock = mockDatabase([
      { rows: [], rowCount: 0 },
    ]);

    const result = await expireReservations({
      db: mock.db,
    });

    expect(result.expiredListings).toBe(0);
    expect(result.expiredRequests).toBe(0);
    expect(result.expiredAssignments).toBe(0);

    expect(mock.query).toHaveBeenCalledWith("COMMIT");
    expect(mock.release).toHaveBeenCalled();
  });

  test("expires an eligible reservation atomically", async () => {
    const listingId =
      "11111111-1111-4111-8111-111111111111";

    const mock = mockDatabase([
      {
        rows: [{ id: listingId }],
        rowCount: 1,
      },
      {
        rows: [{
          id: "22222222-2222-4222-8222-222222222222",
        }],
        rowCount: 1,
      },
      {
        rows: [],
        rowCount: 0,
      },
      {
        rows: [],
        rowCount: 0,
      },
      {
        rows: [{
          id: "22222222-2222-4222-8222-222222222222",
        }],
        rowCount: 1,
      },
      {
        rows: [],
        rowCount: 1,
      },
    ]);

    const result = await expireReservations({
      db: mock.db,
    });

    expect(result.expiredListings).toBe(1);
    expect(result.expiredRequests).toBe(1);
    expect(result.expiredAssignments).toBe(0);
    expect(result.listingIds).toContain(listingId);

    expect(mock.query).toHaveBeenCalledWith("COMMIT");
  });

  test("rolls back if database operation fails", async () => {
    const mock = mockDatabase([
      new Error("Simulated database failure"),
    ]);

    await expect(
      expireReservations({ db: mock.db })
    ).rejects.toThrow("Simulated database failure");

    expect(mock.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mock.release).toHaveBeenCalled();
  });

  test("does not expire already picked-up assignments", async () => {
    const mock = mockDatabase([
      {
        rows: [{
          id: "11111111-1111-4111-8111-111111111111",
        }],
        rowCount: 1,
      },
      {
        rows: [],
        rowCount: 0,
      },
      {
        rows: [{
          id: "33333333-3333-4333-8333-333333333333",
          status: "picked_up",
        }],
        rowCount: 1,
      },
    ]);

    const result = await expireReservations({
      db: mock.db,
    });

    expect(result.expiredListings).toBe(0);
    expect(mock.query).toHaveBeenCalledWith("COMMIT");
  });
});
