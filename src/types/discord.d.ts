import { Collection } from "discord.js";
import {ChatInputCommand} from "./ChatInputCommand";

declare module "discord.js" {
  export interface Client {
    commands: Collection<string, ChatInputCommand>
  }
}
