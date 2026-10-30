
function getFoodListingsAccess(req, res) {
  return res.status(200).json({
    success: true,
    message: "Food listing access granted",
    data: {
      userId: req.user.id,
      role: req.user.role,
      feature: "food:read",
    },
  });
}

function getDonorAccess(req, res) {
  return res.status(200).json({
    success: true,
    message: "Food creation access granted",
    data: {
      userId: req.user.id,
      role: req.user.role,
      feature: "food:create",
    },
  });
}

function getNgoAccess(req, res) {
  return res.status(200).json({
    success: true,
    message: "Pickup request access granted",
    data: {
      userId: req.user.id,
      role: req.user.role,
      feature: "pickup:request:create",
    },
  });
}

function getVolunteerAccess(req, res) {
  return res.status(200).json({
    success: true,
    message: "Delivery management access granted",
    data: {
      userId: req.user.id,
      role: req.user.role,
      feature: "delivery:manage",
    },
  });
}

function getAdminAccess(req, res) {
  return res.status(200).json({
    success: true,
    message: "Admin dashboard access granted",
    data: {
      userId: req.user.id,
      role: req.user.role,
      feature: "admin:dashboard:read",
    },
  });
}

module.exports = {
  getFoodListingsAccess,
  getDonorAccess,
  getNgoAccess,
  getVolunteerAccess,
  getAdminAccess,
};
