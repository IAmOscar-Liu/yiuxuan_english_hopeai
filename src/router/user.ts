import { Router } from "express";
import { createUser, getUserDoc, updateUserDoc } from "../firebase/user";
import { handleServiceError } from "../lib/error";
import { sendJsonResponse } from "../lib/helper";
import { generateToken } from "../lib/token";
import authenticateToken from "../middleware/authenticateToken";
import { RequestWithUserId } from "../types";

const router = Router();

router.get("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await getUserDoc(userId);
    if (!user) return sendJsonResponse(res, { success: true, data: null });
    sendJsonResponse(res, {
      success: true,
      data: { user, token: generateToken(user) },
    });
  } catch (error) {
    sendJsonResponse(res, handleServiceError(error));
  }
});

router.post("/register", async (req, res) => {
  try {
    const { userId, data } = req.body;
    const isSuccess = await createUser(userId, data);
    if (!isSuccess) throw new Error("Failed to create user");
    const user = await getUserDoc(userId);
    sendJsonResponse(res, { success: true, data: user });
  } catch (error) {
    sendJsonResponse(res, handleServiceError(error));
  }
});

router.post(
  "/update",
  authenticateToken,
  async (req: RequestWithUserId, res) => {
    try {
      const userId = req.userId;
      const isSuccess = await updateUserDoc(userId!, req.body);
      if (!isSuccess) throw new Error("Failed to update user");
      const user = await getUserDoc(userId!);
      sendJsonResponse(res, { success: true, data: user });
    } catch (error) {
      sendJsonResponse(res, handleServiceError(error));
    }
  },
);

export default router;
