
const service = require("../services/volunteer.service");

async function assign(req, res, next) {
  try {
    const assignment = await service.assignVolunteer(
      req.params.id,
      req.user,
      req.body.volunteerUserId
    );

    return res.status(201).json({
      success: true,
      message: "Volunteer assigned successfully",
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
}

async function getMine(req, res, next) {
  try {
    const assignments =
      await service.getVolunteerAssignments(req.user);

    return res.status(200).json({
      success: true,
      message: "Assignments retrieved successfully",
      data: { assignments },
    });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const assignment = await service.getAssignmentById(
      req.params.id,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Assignment retrieved successfully",
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const assignment = await service.updateAssignmentStatus(
      req.params.id,
      req.user,
      req.body.status
    );

    return res.status(200).json({
      success: true,
      message: "Delivery status updated successfully",
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  assign,
  getMine,
  getById,
  updateStatus,
};
