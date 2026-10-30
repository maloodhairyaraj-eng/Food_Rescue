
const foodService = require("../services/food.service");

async function create(req, res, next) {
  try {
    const listing = await foodService.createFoodListing(
      req.user,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Food listing created successfully",
      data: { listing },
    });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await foodService.listFoodListings(
      req.query
    );

    return res.status(200).json({
      success: true,
      message: "Food listings retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getMine(req, res, next) {
  try {
    const result = await foodService.getMyFoodListings(
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Your food listings retrieved",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const listing = await foodService.getFoodListingById(
      req.params.id,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Food listing retrieved",
      data: { listing },
    });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const listing = await foodService.updateFoodListing(
      req.params.id,
      req.user,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Food listing updated successfully",
      data: { listing },
    });
  } catch (error) {
    next(error);
  }
}

async function cancel(req, res, next) {
  try {
    const result = await foodService.cancelFoodListing(
      req.params.id,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Food listing cancelled",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  list,
  getMine,
  getById,
  update,
  cancel,
};
