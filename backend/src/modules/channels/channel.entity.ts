export type ChannelType = "text" | "voice";

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  type: ChannelType;
  createdAt: Date;
}
