
const {
  getSmartFoodMatches,
} = require("../services/food-matching.service");

async function getMatches(req, res, next) {
  try {
    const result = await getSmartFoodMatches(
      req.user,
      req.query
    );

    return res.status(200).json({
      success: true,
      message: "Smart food matches retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMatches };
