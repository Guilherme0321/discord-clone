import { v4 as uuid } from "uuid";
import jwt from "jsonwebtoken";
import { IUserRepository } from "./user.repository";
import { User, toPublicUser } from "./user.entity";
import { JWT_SECRET } from "../../config/env";

const AVATAR_COLORS = ["#5865F2", "#EB459E", "#57F287", "#FEE75C", "#ED4245"];

export class UserService {
  constructor(private userRepository: IUserRepository) {}

  async login(username: string): Promise<{ user: ReturnType<typeof toPublicUser>; token: string }> {
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      throw new Error("Username must have at least 2 characters");
    }

    let user = await this.userRepository.findByUsername(trimmed);

    if (!user) {
      const newUser: User = {
        id: uuid(),
        username: trimmed,
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        createdAt: new Date(),
      };
      user = await this.userRepository.create(newUser);
    }

    const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return { user: toPublicUser(user), token };
  }

  async getById(id: string) {
    const user = await this.userRepository.findById(id);
    return user ? toPublicUser(user) : null;
  }
}
