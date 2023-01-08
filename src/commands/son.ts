import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource, demuxProbe,
  getVoiceConnection,
  joinVoiceChannel
} from "@discordjs/voice";
import {join} from "node:path";
import {ButtonStyle, ChannelType, ChatInputCommandInteraction, GuildMember, SlashCommandBuilder,} from "discord.js";

import {ChatInputCommand} from "../types/ChatInputCommand";
import {formatError, formatStandard} from "../helpers/replyFormatter";
import {createReadStream, existsSync, readdirSync} from "fs";
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

async function probeAndCreateResource(file: string) {
  const { stream, type } = await demuxProbe(createReadStream(file));
  logger.info(`Playing file ${file} of type ${type}...`)
  return createAudioResource(stream, { inputType: type, inlineVolume: true });
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
    await interaction.followUp(formatStandard({name: 'Son', description: prettifyFileName(sound), thumbnail: 'https://cdn-icons-png.flaticon.com/512/6707/6707113.png'}, false))
    return String(join(__dirname, PATH_TO_ASSETS, PATH_TO_BITS, sound)) || null
  },
  fichier: async (interaction: ChatInputCommandInteraction) => {
    const userFile = interaction.options.getAttachment(FILE, true)

    if (userFile && userFile.size > Number(process.env.MAX_FILE_SIZE)) {
      logger.error('File too large')
      await interaction.editReply(formatError(`Veuillez envoyer un fichier audio pesant moins de ${Number(process.env.MAX_FILE_SIZE) / 1000} ko. Le votre fait ${Math.round(userFile.size / 1000)} ko`))
      return null
    }
    await interaction.followUp(formatStandard({name: 'Fichier perso', description: userFile?.name || 'nom inconnu', thumbnail: 'https://cdn-icons-png.flaticon.com/512/8233/8233457.png'}, false))

    return String(userFile?.attachment) || null
  },
  youtube: async (interaction: ChatInputCommandInteraction) => {
    const link = interaction.options.getString(URL, true)

    logger.info(`Trying to read link ${link}...`)

    // INFO This does not return file, only informations - downloaded file is in project root

    const output = join(__dirname, PATH_TO_ASSETS, PATH_TO_TEMP, '%(id)s.%(ext)s')

    logger.info(`Output format: ${output}`)

    // const file = await youtubeDl.default(link, {
    const [file] = await Promise.all([
    // @ts-ignore // todo ts typing is wrong
      youtubeDl(link, {
        dumpSingleJson: true, // to output infos in promise
        noCheckCertificates: true, // ignore https check
        format: 'ba', // best audio todo worst video?
        audioQuality: 0,
        addHeader: [ // recommended
          'referer:youtube.com',
          'user-agent:googlebot'
        ]
      }),
    // @ts-ignore // todo ts typing is wrong
      youtubeDl(link, {
        noCheckCertificates: true, // ignore https check
        output,
        noPlaylist: true, // TODO in the future...
        format: 'ba', // best audio todo worst video?
        audioQuality: 0,
        addHeader: [ // recommended
          'referer:youtube.com',
          'user-agent:googlebot'
        ]
      })
    ])


    await interaction.followUp(formatStandard({
      name: 'Vidéo YouTube',
      description: file.title || 'nom inconnu',
      thumbnail: file.thumbnail
    }, false)) // TODO desc

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
    if (!file || !existsSync(file)) {
      logger.error(`File ${file} not found`)
      await interaction.editReply(formatError('Le fichier n\'a pas pu être lu'))
      return
    }

    const player = createAudioPlayer({})

    // Will connect to existing connection if no channel is provided - even if connection is not in same user channel
    const connection = useExistingConnection ? existingConnection : joinVoiceChannel({
      channelId: channel.id,
      // @ts-ignore - watch for patches
      guildId: channel.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    })

    const subscription = connection.subscribe(player)

    const resource = await probeAndCreateResource(file)
    resource.volume.setVolume(0.5)
    player.play(resource)

    player.on(AudioPlayerStatus.AutoPaused, async () => {
      // await wait(1000)
      // subscription?.unsubscribe()
      // player.play(getNextResource());
    })
  },
} as ChatInputCommand;
