import { Channel } from "./channel.entity";
import { IChannelRepository } from "./channel.repository";

export class InMemoryChannelRepository implements IChannelRepository {
  private channels: Map<string, Channel> = new Map();

  async findById(id: string): Promise<Channel | null> {
    return this.channels.get(id) ?? null;
  }

  async create(channel: Channel): Promise<Channel> {
    this.channels.set(channel.id, channel);
    return channel;
  }

  async listByServer(serverId: string): Promise<Channel[]> {
    return Array.from(this.channels.values()).filter(
      (channel) => channel.serverId === serverId
    );
  }
}
