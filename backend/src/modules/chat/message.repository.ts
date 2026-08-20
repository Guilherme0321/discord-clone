import { Message } from "./message.entity";

export interface IMessageRepository {
  create(message: Message): Promise<Message>;
  listByChannel(channelId: string, limit?: number): Promise<Message[]>;
  // Usado pelo "catch-up" ao reconectar: mensagens que chegaram depois de
  // `since`, sem o corte de `limit` (o cliente já tinha tudo até ali).
  listByChannelSince(channelId: string, since: Date): Promise<Message[]>;
}
