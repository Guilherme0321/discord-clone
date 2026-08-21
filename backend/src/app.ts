import express, { Express } from "express";
import cors from "cors";
import { ALLOWED_ORIGINS } from "./config/env";

import { InMemoryUserRepository } from "./modules/users/in-memory-user.repository";
import { UserService } from "./modules/users/user.service";
import { UserController } from "./modules/users/user.controller";
import { createUserRouter } from "./modules/users/user.routes";

import { InMemoryServerRepository } from "./modules/servers/in-memory-server.repository";
import { InMemoryChannelRepository } from "./modules/channels/in-memory-channel.repository";
import { ServerService } from "./modules/servers/server.service";
import { ServerController } from "./modules/servers/server.controller";
import { createServerRouter } from "./modules/servers/server.routes";

import { InMemoryMessageRepository } from "./modules/chat/in-memory-message.repository";
import { MessageService } from "./modules/chat/message.service";
import { MessageController } from "./modules/chat/message.controller";
import { createMessageRouter } from "./modules/chat/message.routes";

// --- Repositórios (trocar por implementações reais/Prisma no futuro sem tocar em service/controller) ---
const userRepository = new InMemoryUserRepository();
const serverRepository = new InMemoryServerRepository();
export const channelRepository = new InMemoryChannelRepository();
const messageRepository = new InMemoryMessageRepository();

// --- Services ---
export const userService = new UserService(userRepository);
export const serverService = new ServerService(serverRepository, channelRepository);
export const messageService = new MessageService(messageRepository);

// --- Controllers ---
const userController = new UserController(userService);
const serverController = new ServerController(serverService);
const messageController = new MessageController(messageService);

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        // Sem Origin (curl, apps mobile nativos) ou origem na allowlist: libera.
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/users", createUserRouter(userController));
  app.use("/api/servers", createServerRouter(serverController));
  app.use("/api/channels", createMessageRouter(messageController));

  return app;
}
