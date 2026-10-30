
const {
  createOrganization,
  getMyOrganization,
  getOrganizationById,
  updateOrganization,
} = require("../services/organization.service");

async function create(req, res, next) {
  try {
    const organization = await createOrganization(
      req.user,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Organization created successfully",
      data: { organization },
    });
  } catch (error) {
    next(error);
  }
}

async function getMine(req, res, next) {
  try {
    const organization = await getMyOrganization(
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Organization retrieved successfully",
      data: { organization },
    });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const organization = await getOrganizationById(
      req.params.id,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Organization retrieved successfully",
      data: { organization },
    });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const organization = await updateOrganization(
      req.params.id,
      req.user,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Organization updated successfully",
      data: { organization },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  getMine,
  getById,
  update,
};
