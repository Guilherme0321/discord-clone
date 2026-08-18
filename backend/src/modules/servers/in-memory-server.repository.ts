import { Server } from "./server.entity";
import { IServerRepository } from "./server.repository";

export class InMemoryServerRepository implements IServerRepository {
  private servers: Map<string, Server> = new Map();

  async findById(id: string): Promise<Server | null> {
    return this.servers.get(id) ?? null;
  }

  async create(server: Server): Promise<Server> {
    this.servers.set(server.id, server);
    return server;
  }

  async listByMember(userId: string): Promise<Server[]> {
    return Array.from(this.servers.values()).filter((server) =>
      server.memberIds.includes(userId)
    );
  }

  async addMember(serverId: string, userId: string): Promise<Server | null> {
    const server = this.servers.get(serverId);
    if (!server) return null;
    if (!server.memberIds.includes(userId)) {
      server.memberIds.push(userId);
    }
    return server;
  }

  async list(): Promise<Server[]> {
    return Array.from(this.servers.values());
  }
}
