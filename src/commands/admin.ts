import {ButtonStyle, ChannelType, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder,} from "discord.js";
import {ChatInputCommand} from "../types/ChatInputCommand";
import logger from "../helpers/logger";
import {formatError, formatStandard} from "../helpers/replyFormatter";
import {readdirSync, rmSync} from "fs";
import {join} from "node:path";

const subcommands = {
  cleanup: async (interaction: ChatInputCommandInteraction) => {

    const files = readdirSync(join(__dirname, '../assets/temp'))
    files.forEach(file => {
      if (file ==='.gitkeep')
        return
      rmSync(join(__dirname, '../assets/temp/', file))
      logger.info(`File removed ${file}`)
    })

    await interaction.editReply(formatStandard({name: 'ADMIN', description: `Nettoyage terminé - ${files.length - 1} fichiers retirés`}))

  }
}
const getSubcommandFn = (subcommand?: string) => {
  switch (subcommand) {
    case 'cleanup':
      return subcommands.cleanup
    default:
      return null
  }
}
module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Commandes admin')
    .addSubcommand(subcommand => subcommand
      .setName('cleanup')
      .setDescription('Nettoyage des fichiers temporaires')),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ephemeral: true});

    const subcommandFn = getSubcommandFn(interaction.options.getSubcommand())

    if (!subcommandFn) {
      logger.error('No subcommand found for admin')
      await interaction.editReply(formatError('Erreur interne'))
      return
    }

    await subcommandFn(interaction)
  },
} as ChatInputCommand;
