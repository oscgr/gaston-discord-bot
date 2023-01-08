import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel
} from "@discordjs/voice";
import {join} from "node:path";
import {ButtonStyle, ChannelType, ChatInputCommandInteraction, GuildMember, SlashCommandBuilder,} from "discord.js";

import {setTimeout as wait} from "node:timers/promises";
import {ChatInputCommand} from "../types/ChatInputCommand";
import {formatError, formatStandard} from "../helpers/replyFormatter";
import {existsSync, readdirSync} from "fs";
import logger from "../helpers/logger";
import * as youtubeDl from 'youtube-dl-exec'

const CHANNEL = 'canal'
const SOUND = 'son'
const FILE = 'fichier'
const URL = 'lien'
const PATH_TO_ASSETS = '../assets'
const PATH_TO_BITS = '/bits/'
const PATH_TO_TEMP = '/temp/'

const prettifyFileName = (file: string) => file.replaceAll('_', ' ').split('.')[0]
const extractFileOptions = () => {
  const dir = readdirSync(join(__dirname, PATH_TO_ASSETS, PATH_TO_BITS))
  return dir.map(file => ({
    value: file,
    name: prettifyFileName(file)
  }))
}

const getSubcommandFn = (subcommand?: string) => {
  switch (subcommand) {
    case 'liste':
      return subcommands.liste
    case 'fichier':
      return subcommands.fichier
    case 'youtube':
      return subcommands.youtube
    default:
      return null
  }
}
const subcommands = {
  liste: async (interaction: ChatInputCommandInteraction) => {
    const sound = interaction.options.getString(SOUND, true)
    await interaction.editReply(formatStandard({name: 'Son', description: prettifyFileName(sound)}))
    return String(join(__dirname, PATH_TO_ASSETS, sound)) || null
  },
  fichier: async (interaction: ChatInputCommandInteraction) => {
    const userFile = interaction.options.getAttachment(FILE, true)

    if (userFile && userFile.size > Number(process.env.MAX_FILE_SIZE)) {
      logger.error('File too large')
      await interaction.editReply(formatError(`Veuillez envoyer un fichier audio pesant moins de ${Number(process.env.MAX_FILE_SIZE) / 1000} ko. Le votre fait ${Math.round(userFile.size / 1000)} ko`))
      return null
    }
    await interaction.editReply(formatStandard({name: 'Fichier perso', description: userFile?.name || 'nom inconnu'}))

    return String(userFile?.attachment) || null
  },
  youtube: async (interaction: ChatInputCommandInteraction) => {
    const link = interaction.options.getString(URL, true)

    logger.info(`Trying to read link ${link}...`)

    // INFO This does not return file, only informations - downloaded file is in project root

    const output = join(__dirname, PATH_TO_ASSETS, PATH_TO_TEMP, '%(id)s.%(ext)s')

    logger.info(`Output format: ${output}`)

    // @ts-ignore // todo ts typing is wrong
    // const file = await youtubeDl.default(link, {
    const [file] = await Promise.all([
      youtubeDl(link, {
        dumpSingleJson: true, // to output infos in promise
        noCheckCertificates: true, // ignore https check
        // format: 'ba', // best audio todo worst video?
        // extractAudio: true, // worsen cpu load as it does not download in format but converts after download (ffmpeg)
        // audioFormat: 'mp3', // see above
        addHeader: [ // recommended
          'referer:youtube.com',
          'user-agent:googlebot'
        ]
      }),
      youtubeDl(link, {
        noCheckCertificates: true, // ignore https check
        output,
        noPlaylist: true, // TODO in the future...
        // format: 'ba', // best audio todo worst video?
        // extractAudio: true, // worsen cpu load as it does not download in format but converts after download (ffmpeg)
        // audioFormat: 'mp3', // see above
        // audioQuality: 0,
        addHeader: [ // recommended
          'referer:youtube.com',
          'user-agent:googlebot'
        ]
      })
    ])


    await interaction.editReply(formatStandard({
      name: 'Vidéo YouTube',
      description: file.title || 'nom inconnu',
      thumbnail: file.thumbnail
    })) // TODO desc

    return String(join(__dirname, PATH_TO_ASSETS, PATH_TO_TEMP, `${file.id}.${file.ext}`)) || null // TODO
  }
}
module.exports = {
  data: new SlashCommandBuilder()
    .setName('son')
    .setDescription('Son à jouer')
    .addSubcommand(subcommand => subcommand
      .setName('liste')
      .setDescription('Jouer un son enregistré')
      .addStringOption(option => option.setName(SOUND).setChoices(...extractFileOptions()).setDescription("Son").setRequired(true))
      .addChannelOption(option => option.setName(CHANNEL).setDescription("Canal à rejoindre").addChannelTypes(ChannelType.GuildVoice)))
    .addSubcommand(subcommand => subcommand
      .setName('fichier')
      .setDescription('Jouer un fichier audio personnel')
      .addAttachmentOption(option => option.setName(FILE).setDescription("Fichier audio").setRequired(true))
      .addChannelOption(option => option.setName(CHANNEL).setDescription("Canal à rejoindre").addChannelTypes(ChannelType.GuildVoice)))
    .addSubcommand(subcommand => subcommand
      .setName('youtube')
      .setDescription('Jouer le son d\'une vidéo YouTube')
      .addStringOption(option => option.setName(URL).setDescription("Lien de la vidéo YouTube").setRequired(true))
      .addChannelOption(option => option.setName(CHANNEL).setDescription("Canal à rejoindre").addChannelTypes(ChannelType.GuildVoice))),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ephemeral: true});

    if (!interaction.guild) {
      logger.error('interaction.guild not found')
      await interaction.editReply(formatError('Problème interne'))
      return
    }

    const existingConnection = getVoiceConnection(interaction.guild.id)
    const member = interaction.member as GuildMember
    const fetchedMember = await member.fetch()
    const channel = interaction.options.getChannel(CHANNEL) || fetchedMember.voice.channel
    const useExistingConnection = !!existingConnection && !interaction.options.getChannel(CHANNEL)

    if (!channel) {
      logger.error('No channel provided')
      await interaction.editReply(formatError('Aucun canal vocal trouvé'))
      return
    }

    const subcommandFn = getSubcommandFn(interaction.options.getSubcommand())

    const file = subcommandFn ? await subcommandFn(interaction) : null
    if (!file)
      return

    const player = createAudioPlayer({debug: true})

    // Will connect to existing connection if no channel is provided - even if connection is not in same user channel
    const connection = useExistingConnection ? existingConnection : joinVoiceChannel({
      channelId: channel.id,
      // @ts-ignore - watch for patches
      guildId: channel.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    })

    const subscription = connection.subscribe(player)


    if (!existsSync(file)) {
      logger.error(`File ${file} not found`)
      await interaction.editReply(formatError('Le fichier n\'a pas pu être lu'))
      return
    }

    logger.info(`Playing file ${file}...`)
    player.play(createAudioResource(file))

    player.on(AudioPlayerStatus.AutoPaused, async () => {
      // await wait(1000)
      // subscription?.unsubscribe()
    })
  },
} as ChatInputCommand;
