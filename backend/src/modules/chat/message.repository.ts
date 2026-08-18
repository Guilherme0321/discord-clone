import { Message } from "./message.entity";

export interface IMessageRepository {
  create(message: Message): Promise<Message>;
  listByChannel(channelId: string, limit?: number): Promise<Message[]>;
}
