
const {
  listOrganizations,
  updateVerification,
} = require("../services/admin.service");

async function getOrganizations(req, res, next) {
  try {
    const result = await listOrganizations(req.query);

    return res.status(200).json({
      success: true,
      message: "Organizations retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function verifyOrganization(req, res, next) {
  try {
    const organization = await updateVerification(
      req.params.id,
      req.user.id,
      req.body.status,
      req.body.reason
    );

    return res.status(200).json({
      success: true,
      message: "Verification status updated",
      data: { organization },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOrganizations,
  verifyOrganization,
};
