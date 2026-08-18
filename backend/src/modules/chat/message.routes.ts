import { Router } from "express";
import { MessageController } from "./message.controller";
import { authMiddleware } from "../../shared/auth.middleware";

export function createMessageRouter(messageController: MessageController): Router {
  const router = Router();

  router.use(authMiddleware);

  router.get("/:channelId/messages", messageController.getHistory);

  return router;
}
