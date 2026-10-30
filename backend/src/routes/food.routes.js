
const express = require("express");

const {
    authenticate,
} = require("../middleware/auth.middleware");

const {
    authorize,
} = require("../middleware/authorize.middleware");

const {
    PERMISSIONS,
} = require("../config/permissions");


const {
    validateNearbyFood,
} = require("../validators/nearby-food.validator");

const {
    getNearby,
} = require("../controllers/nearby-food.controller");


const {
    validateFoodMatching,
} = require("../validators/food-matching.validator");

const {
    getMatches,
} = require("../controllers/food-matching.controller");


const {
    createFoodValidation,
    updateFoodValidation,
    listFoodValidation,
    foodIdValidation,
} = require("../validators/food.validator");

const {
    create,
    list,
    getMine,
    getById,
    update,
    cancel,
} = require("../controllers/food.controller");

const router = express.Router();

router.use(authenticate);

// Browse available food
router.get(
    "/",
    authorize(PERMISSIONS.FOOD_READ),
    listFoodValidation,
    list
);

// Create food listing
router.post(
    "/",
    authorize(PERMISSIONS.FOOD_CREATE),
    createFoodValidation,
    create
);


router.get(
    "/nearby",
    authorize(PERMISSIONS.FOOD_READ),
    validateNearbyFood,
    getNearby
);


// Donor's own listings
router.get(
    "/mine",
    authorize(PERMISSIONS.FOOD_CREATE),
    getMine
);


router.get(
  "/matches",
  authorize(PERMISSIONS.FOOD_READ),
  validateFoodMatching,
  getMatches
);


// Listing details
router.get(
    "/:id",
    authorize(PERMISSIONS.FOOD_READ),
    foodIdValidation,
    getById
);

// Update listing
router.patch(
    "/:id",
    authorize(PERMISSIONS.FOOD_CREATE),
    updateFoodValidation,
    update
);

// Cancel listing
router.patch(
    "/:id/cancel",
    authorize(PERMISSIONS.FOOD_CREATE),
    foodIdValidation,
    cancel
);

module.exports = router;
