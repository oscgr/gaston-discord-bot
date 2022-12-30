import {ButtonStyle, ChannelType, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder,} from "discord.js";
import {ChatInputCommand} from "../types/ChatInputCommand";

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quid')
    .setDescription('Besoin d\'aide ?'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed1 = new EmbedBuilder()
      .setColor('#09a99d')
      .setFields(
        {name: '/son liste', value: 'Permet de jouer un son issue d\'une liste prédéfinie'},
        {name: '/son fichier', value: 'Permet de jouer un son à partir d\'un fichier audio personnel'},
        )
    const embed2 = new EmbedBuilder()
      .setColor('#09a99d')
      .setFields(
        {name: '/quid', value: 'Aide (vous l\'utilisez déjà)'},
        )
    await interaction.reply({embeds: [embed1, embed2], ephemeral: true})
  },
} as ChatInputCommand;