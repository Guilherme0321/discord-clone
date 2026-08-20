import { v4 as uuid } from "uuid";
import { IMessageRepository } from "./message.repository";
import { Message } from "./message.entity";

export class MessageService {
  constructor(private messageRepository: IMessageRepository) {}

  async sendMessage(
    channelId: string,
    authorId: string,
    authorUsername: string,
    content: string
  ): Promise<Message> {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error("Message content cannot be empty");
    }

    const message: Message = {
      id: uuid(),
      channelId,
      authorId,
      authorUsername,
      content: trimmed,
      createdAt: new Date(),
    };

    return this.messageRepository.create(message);
  }

  async getHistory(channelId: string, since?: Date): Promise<Message[]> {
    if (since) {
      return this.messageRepository.listByChannelSince(channelId, since);
    }
    return this.messageRepository.listByChannel(channelId);
  }
}
