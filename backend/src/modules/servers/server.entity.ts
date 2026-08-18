export interface Server {
  id: string;
  name: string;
  ownerId: string;
  iconLetter: string;
  memberIds: string[];
  createdAt: Date;
}
