import { Router } from "express";
import { UserController } from "./user.controller";
import { authMiddleware } from "../../shared/auth.middleware";

export function createUserRouter(userController: UserController): Router {
  const router = Router();

  router.post("/login", userController.login);
  router.get("/me", authMiddleware, userController.me);

  return router;
}
