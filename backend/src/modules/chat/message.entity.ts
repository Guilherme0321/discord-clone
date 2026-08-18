export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  createdAt: Date;
}
