const { default: User } = require("../models/users.mongo");

const authorize = (resource, requiredAction) => async (req, res, next) => {
  try {
    const user = await User.findById(req.decoded._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (
      !user.privileges ||
      !user.privileges[resource] ||
      !user.privileges[resource][requiredAction]
    ) {
      return res.status(403).json({
        message: `Forbidden: No ${requiredAction} privilege for ${resource}.`,
      });
    }

    next();
  } catch (error) {
    return res
      .status(403)
      .json({ message: "Invalid token", error: error.message });
  }
};

module.exports = authorize;
