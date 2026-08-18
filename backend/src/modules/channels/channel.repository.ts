import { Channel } from "./channel.entity";

export interface IChannelRepository {
  findById(id: string): Promise<Channel | null>;
  create(channel: Channel): Promise<Channel>;
  listByServer(serverId: string): Promise<Channel[]>;
}
