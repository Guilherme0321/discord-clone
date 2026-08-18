export interface User {
  id: string;
  username: string;
  avatarColor: string;
}

export type ChannelType = "text" | "voice";

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  type: ChannelType;
}

export interface Server {
  id: string;
  name: string;
  ownerId: string;
  iconLetter: string;
  memberIds: string[];
  channels: Channel[];
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  createdAt: string;
}

export interface VoiceParticipant {
  userId: string;
  username: string;
  avatarColor: string;
  muted: boolean;
}
