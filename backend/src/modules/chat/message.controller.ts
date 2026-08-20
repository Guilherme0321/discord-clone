import { Request, Response } from "express";
import { MessageService } from "./message.service";

export class MessageController {
  constructor(private messageService: MessageService) {}

  getHistory = async (
    req: Request<{ channelId: string }, unknown, unknown, { since?: string }>,
    res: Response
  ) => {
    const { channelId } = req.params;
    const since = req.query.since ? new Date(req.query.since) : undefined;

    if (since && Number.isNaN(since.getTime())) {
      return res.status(400).json({ error: "Invalid 'since' timestamp" });
    }

    const messages = await this.messageService.getHistory(channelId, since);
    return res.status(200).json(messages);
  };
}
