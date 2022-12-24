import {joinVoiceChannel} from "@discordjs/voice";

import {join} from "node:path";

import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {ChatInputCommand} from "../types/ChatInputCommand";


module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Rejoindre le vocal')
    .addChannelOption(option => option.setName("channel").setDescription("Canal à rejoindre").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {

    const channel = interaction.options.getChannel('channel', true)

    joinVoiceChannel({
      channelId: channel.id || '', // TODO default
      guildId: channel.guildId || '', // TODO default
      adapterCreator: interaction.guild.voiceAdapterCreator, // TODO null safe
      selfDeaf: false,
      selfMute: false,
      debug: true,
    })

    await interaction.reply({content: `J'ai rejoint ${channel.name} !`, ephemeral: true, tts: true})
  },
} as ChatInputCommand;
