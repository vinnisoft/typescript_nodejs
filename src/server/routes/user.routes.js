import { Router } from "express";
const userRouter = Router();

import user from "../controllers/user.controller.js";
import fileUpload from "../middlewares/fileUpload.js";

userRouter.get("/profile", user.getUserProfile);
userRouter.get("/role", user.getRole);
userRouter.get("/privileges/:companyId", user.getUserPrivileges);
userRouter.post("/add", user.addUser);
userRouter.post("/validate-bulk-upload", user.validateBulkUsersUpload);
userRouter.post("/bulk-upload", user.bulkUploadUsers);
userRouter.get("/list", user.getAdminUsersList);
userRouter.get("/details/:id", user.getUserDetails);
userRouter.put("/update/:id", user.updateUserDetails);
userRouter.put(
  "/update-profile/admin",
  fileUpload({ companyLogo: false }),
  user.updateProfile
);
userRouter.put(
  "/update-profile/user",
  fileUpload({ profilePicture: false }),
  user.updateProfile
);
userRouter.put("/update-status/:id", user.activateDeactivate);
userRouter.put("/delete/:id", user.delete);

export default userRouter;
