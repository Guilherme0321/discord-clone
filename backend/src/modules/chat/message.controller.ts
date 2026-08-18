import { Request, Response } from "express";
import { MessageService } from "./message.service";

export class MessageController {
  constructor(private messageService: MessageService) {}

  getHistory = async (req: Request<{ channelId: string }>, res: Response) => {
    const { channelId } = req.params;
    const messages = await this.messageService.getHistory(channelId);
    return res.status(200).json(messages);
  };
}
