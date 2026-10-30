
"use strict";

const service = require(
  "../services/volunteer-directory.service"
);

async function getDirectory(req, res, next) {
  try {
    const volunteers = await service.getDirectory(
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Volunteer directory retrieved",
      data: { volunteers },
    });
  } catch (error) {
    next(error);
  }
}

async function getAvailability(req, res, next) {
  try {
    const availability =
      await service.getMyAvailability(req.user);

    return res.status(200).json({
      success: true,
      message: "Volunteer availability retrieved",
      data: { availability },
    });
  } catch (error) {
    next(error);
  }
}

async function updateAvailability(req, res, next) {
  try {
    const availability =
      await service.updateAvailability(
        req.user,
        req.body.isAvailable
      );

    return res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      data: { availability },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDirectory,
  getAvailability,
  updateAvailability,
};
