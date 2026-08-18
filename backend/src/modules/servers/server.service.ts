import { v4 as uuid } from "uuid";
import { IServerRepository } from "./server.repository";
import { IChannelRepository } from "../channels/channel.repository";
import { Server } from "./server.entity";
import { Channel } from "../channels/channel.entity";

export interface ServerWithChannels extends Server {
  channels: Channel[];
}

export class ServerService {
  constructor(
    private serverRepository: IServerRepository,
    private channelRepository: IChannelRepository
  ) {}

  async createServer(name: string, ownerId: string): Promise<ServerWithChannels> {
    const server: Server = {
      id: uuid(),
      name: name.trim(),
      ownerId,
      iconLetter: name.trim().charAt(0).toUpperCase(),
      memberIds: [ownerId],
      createdAt: new Date(),
    };
    await this.serverRepository.create(server);

    const textChannel: Channel = {
      id: uuid(),
      serverId: server.id,
      name: "geral",
      type: "text",
      createdAt: new Date(),
    };
    const voiceChannel: Channel = {
      id: uuid(),
      serverId: server.id,
      name: "Geral",
      type: "voice",
      createdAt: new Date(),
    };
    await this.channelRepository.create(textChannel);
    await this.channelRepository.create(voiceChannel);

    return { ...server, channels: [textChannel, voiceChannel] };
  }

  async listServersForUser(userId: string): Promise<ServerWithChannels[]> {
    const servers = await this.serverRepository.listByMember(userId);
    return Promise.all(
      servers.map(async (server) => ({
        ...server,
        channels: await this.channelRepository.listByServer(server.id),
      }))
    );
  }

  async getServerWithChannels(serverId: string): Promise<ServerWithChannels | null> {
    const server = await this.serverRepository.findById(serverId);
    if (!server) return null;
    const channels = await this.channelRepository.listByServer(server.id);
    return { ...server, channels };
  }

  async joinServer(serverId: string, userId: string): Promise<ServerWithChannels | null> {
    const server = await this.serverRepository.addMember(serverId, userId);
    if (!server) return null;
    const channels = await this.channelRepository.listByServer(server.id);
    return { ...server, channels };
  }

  async createChannel(
    serverId: string,
    name: string,
    type: "text" | "voice"
  ): Promise<Channel | null> {
    const server = await this.serverRepository.findById(serverId);
    if (!server) return null;

    const channel: Channel = {
      id: uuid(),
      serverId,
      name: name.trim(),
      type,
      createdAt: new Date(),
    };
    return this.channelRepository.create(channel);
  }
}
