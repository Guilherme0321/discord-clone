import { Router } from "express";
import { ServerController } from "./server.controller";
import { authMiddleware } from "../../shared/auth.middleware";

export function createServerRouter(serverController: ServerController): Router {
  const router = Router();

  router.use(authMiddleware);

  router.post("/", serverController.create);
  router.get("/", serverController.listMine);
  router.get("/:serverId", serverController.getOne);
  router.post("/:serverId/join", serverController.join);
  router.post("/:serverId/channels", serverController.createChannel);

  return router;
}
