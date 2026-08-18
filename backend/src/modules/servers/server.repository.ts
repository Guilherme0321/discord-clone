import { Server } from "./server.entity";

export interface IServerRepository {
  findById(id: string): Promise<Server | null>;
  create(server: Server): Promise<Server>;
  listByMember(userId: string): Promise<Server[]>;
  addMember(serverId: string, userId: string): Promise<Server | null>;
  list(): Promise<Server[]>;
}
