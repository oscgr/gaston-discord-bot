import {AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel} from "@discordjs/voice";
import {join} from "node:path";
import {ChannelType, ChatInputCommandInteraction, GuildMember, SlashCommandBuilder} from "discord.js";

import {setTimeout as wait} from "node:timers/promises";
import {ChatInputCommand} from "../types/ChatInputCommand";
import {formatError, formatStandard} from "../helpers/replyFormatter";
import {readdirSync} from "fs";
import logger from "../helpers/logger";

const CHANNEL = 'canal'
const SOUND = 'son'
const FILE = 'fichier'
const PATH_TO_ASSETS = '../assets/bits'

const extractFileOptions = () => {
  const dir = readdirSync(join(__dirname, PATH_TO_ASSETS))
  return dir.map(file => ({
    value: file,
    name: file.replaceAll('_', ' ').split('.')[0]
  }))
}
module.exports = {
  data: new SlashCommandBuilder()
    .setName('bit')
    .setDescription('Sound bit à jouer')
    .addChannelOption(option => option.setName(CHANNEL).setDescription("Canal à rejoindre").addChannelTypes(ChannelType.GuildVoice))
    .addStringOption(option => option.setName(SOUND).setChoices(...extractFileOptions()).setDescription("Son parmi ceux dispos"))
    .addAttachmentOption(option => option.setName(FILE).setDescription("Utiliser son propre fichier audio"))
  ,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ephemeral: true});

    extractFileOptions()
    if (!interaction.guild) {
      logger.error('interaction.guild not found')
      await interaction.editReply(formatError('Problème interne'))
      return
    }

    const member = interaction.member as GuildMember
    const fetchedMember = await member.fetch()
    const channel = interaction.options.getChannel(CHANNEL) || fetchedMember.voice.channel

    if (!channel) {
      logger.error('No channel provided')
      await interaction.editReply(formatError('Aucun canal vocal trouvé'))
      return
    }

    if (channel.type !== ChannelType.GuildVoice) {
      logger.error('Selected channel is not of type voice')
      await interaction.editReply(formatError('Le canal choisi n\'est pas de type audio'))
      return
    }


    // Optionals
    const sound = interaction.options.getString(SOUND)
    const userFile = interaction.options.getAttachment(FILE)

    if (!sound && !userFile) {
      logger.error('No sound or userFile found')
      await interaction.editReply(formatError('Veuillez renseigner au minimum un son ou un fichier audio'))
      return

    }
    if (sound && userFile) {
      logger.error('Both sound and userFile found')
      await interaction.editReply(formatError('Veuillez renseigner soit un son, soit un fichier audio'))
      return

    }

    if (userFile && userFile.size > Number(process.env.MAX_FILE_SIZE)) {
      logger.error('File too large')
      await interaction.editReply(formatError(`Veuillez envoyer un fichier audio pesant moins de ${process.env.MAX_FILE_SIZE/1000} ko. Le votre fait ${Math.round(userFile.size / 1000)} ko`))
      return

    }
    const player = createAudioPlayer()

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    })

    const subscription = connection.subscribe(player)

    await wait(500)

    if (sound) {
      const file = join(__dirname, PATH_TO_ASSETS, sound)
      player.play(createAudioResource(String(file)))
      await interaction.editReply(formatStandard({name: 'Son joué', description: sound, author: fetchedMember.user.username}))
    } else if (userFile) {
      player.play(createAudioResource(String(userFile?.attachment)))
      await interaction.editReply(formatStandard({name: 'Fichier perso joué', description: userFile?.name || 'nom inconnu', author: fetchedMember.user.username}))
    }


    player.on(AudioPlayerStatus.AutoPaused, async () => {
      await wait(1000)
      subscription?.unsubscribe()
      connection.destroy()
    })
  },
} as ChatInputCommand;
