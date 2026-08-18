import { Request, Response } from "express";
import { ServerService } from "./server.service";

export class ServerController {
  constructor(private serverService: ServerService) {}

  create = async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;
    const { name } = req.body as { name?: string };
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const server = await this.serverService.createServer(name, userId);
    return res.status(201).json(server);
  };

  listMine = async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;
    const servers = await this.serverService.listServersForUser(userId);
    return res.status(200).json(servers);
  };

  getOne = async (req: Request<{ serverId: string }>, res: Response) => {
    const { serverId } = req.params;
    const server = await this.serverService.getServerWithChannels(serverId);
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }
    return res.status(200).json(server);
  };

  join = async (req: Request<{ serverId: string }>, res: Response) => {
    const userId = (req as any).userId as string;
    const { serverId } = req.params;
    const server = await this.serverService.joinServer(serverId, userId);
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }
    return res.status(200).json(server);
  };

  createChannel = async (req: Request<{ serverId: string }>, res: Response) => {
    const { serverId } = req.params;
    const { name, type } = req.body as { name?: string; type?: "text" | "voice" };
    if (!name || !type) {
      return res.status(400).json({ error: "name and type are required" });
    }
    const channel = await this.serverService.createChannel(serverId, name, type);
    if (!channel) {
      return res.status(404).json({ error: "Server not found" });
    }
    return res.status(201).json(channel);
  };
}
