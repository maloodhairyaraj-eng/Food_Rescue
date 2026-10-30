
const service = require("../services/pickup.service");

async function create(req, res, next) {
  try {
    const pickupRequest = await service.createPickupRequest(
      req.user,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Pickup request created successfully",
      data: { pickupRequest },
    });
  } catch (error) {
    next(error);
  }
}

async function getMine(req, res, next) {
  try {
    const requests = await service.getMyPickupRequests(
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Pickup requests retrieved",
      data: { requests },
    });
  } catch (error) {
    next(error);
  }
}

async function getIncoming(req, res, next) {
  try {
    const requests = await service.getIncomingPickupRequests(
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Incoming requests retrieved",
      data: { requests },
    });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const pickupRequest = await service.getPickupRequestById(
      req.params.id,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Pickup request retrieved",
      data: { pickupRequest },
    });
  } catch (error) {
    next(error);
  }
}

async function approve(req, res, next) {
  try {
    const pickupRequest = await service.decidePickupRequest(
      req.params.id,
      req.user,
      "approved"
    );

    return res.status(200).json({
      success: true,
      message: "Pickup request approved",
      data: { pickupRequest },
    });
  } catch (error) {
    next(error);
  }
}

async function reject(req, res, next) {
  try {
    const pickupRequest = await service.decidePickupRequest(
      req.params.id,
      req.user,
      "rejected",
      req.body.reason
    );

    return res.status(200).json({
      success: true,
      message: "Pickup request rejected",
      data: { pickupRequest },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  getMine,
  getIncoming,
  getById,
  approve,
  reject,
};
