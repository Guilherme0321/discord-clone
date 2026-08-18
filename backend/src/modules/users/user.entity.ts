export interface User {
  id: string;
  username: string;
  avatarColor: string;
  createdAt: Date;
}

export type PublicUser = Omit<User, "createdAt">;

export function toPublicUser(user: User): PublicUser {
  const { createdAt, ...publicUser } = user;
  return publicUser;
}
