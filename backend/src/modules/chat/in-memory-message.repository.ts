import { Message } from "./message.entity";
import { IMessageRepository } from "./message.repository";

export class InMemoryMessageRepository implements IMessageRepository {
  private messagesByChannel: Map<string, Message[]> = new Map();

  async create(message: Message): Promise<Message> {
    const list = this.messagesByChannel.get(message.channelId) ?? [];
    list.push(message);
    this.messagesByChannel.set(message.channelId, list);
    return message;
  }

  async listByChannel(channelId: string, limit = 50): Promise<Message[]> {
    const list = this.messagesByChannel.get(channelId) ?? [];
    return list.slice(-limit);
  }

  async listByChannelSince(channelId: string, since: Date): Promise<Message[]> {
    const list = this.messagesByChannel.get(channelId) ?? [];
    return list.filter((message) => message.createdAt > since);
  }
}
