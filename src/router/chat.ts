import { Router } from "express";
import { getChatDocumentById, listChatDocuments } from "../firebase/chat";
import { handleServiceError } from "../lib/error";
import { sendJsonResponse } from "../lib/helper";
import authenticateToken from "../middleware/authenticateToken";
import { RequestWithUserId } from "../types";

const router = Router();

router.get("/list", authenticateToken, async (req: RequestWithUserId, res) => {
  try {
    const userId = req.userId;
    const { startAt, endAt } = req.query;

    const startDate = startAt ? new Date(startAt as string) : undefined;
    const endDate = endAt ? new Date(endAt as string) : undefined;

    const chats = await listChatDocuments({
      userId: userId!,
      startAt: startDate,
      endAt: endDate,
    });

    sendJsonResponse(res, {
      success: true,
      data: chats,
    });
  } catch (error) {
    sendJsonResponse(res, handleServiceError(error));
  }
});

router.get(
  "/:chatId",
  authenticateToken,
  async (req: RequestWithUserId, res) => {
    try {
      const chatId = req.params.chatId;
      const chat = await getChatDocumentById(String(chatId));
      sendJsonResponse(res, {
        success: true,
        data: chat,
      });
    } catch (error) {
      sendJsonResponse(res, handleServiceError(error));
    }
  },
);

export default router;
