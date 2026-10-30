
const {
  getNearbyFoodListings,
} = require("../services/nearby-food.service");

async function getNearby(req, res, next) {
  try {
    const result = await getNearbyFoodListings(
      req.user,
      req.query
    );

    return res.status(200).json({
      success: true,
      message:
        "Nearby food listings retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getNearby };
