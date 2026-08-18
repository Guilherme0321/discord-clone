import { Request, Response } from "express";
import { UserService } from "./user.service";

export class UserController {
  constructor(private userService: UserService) {}

  login = async (req: Request, res: Response) => {
    try {
      const { username } = req.body as { username?: string };
      if (!username) {
        return res.status(400).json({ error: "username is required" });
      }
      const result = await this.userService.login(username);
      return res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(400).json({ error: message });
    }
  };

  me = async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;
    const user = await this.userService.getById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json(user);
  };
}
