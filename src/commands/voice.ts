import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  StreamType
} from "@discordjs/voice";

import {join} from "node:path";

import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";

import {setTimeout as wait} from "node:timers/promises";
import {ChatInputCommand} from "../types/ChatInputCommand";

// const start = async (player, resource) => {
//   player.play(resource);
//   try {
//     await entersState(player, AudioPlayerStatus.Playing, 5_000);
//     // The player has entered the Playing state within 5 seconds
//     console.log('Playback has started! Resource lasts for ' + resource.playbackDuration + 's');
//   } catch (error) {
//     // The player has not entered the Playing state and either:
//     // 1) The 'error' event has been emitted and should be handled
//     // 2) 5 seconds have passed
//     console.error(error);
//   }
// }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test-voice')
    .setDescription('test voice')
    .addChannelOption(option => option.setName("channel").setDescription("Canal à rejoindre").setRequired(true))
    .addAttachmentOption(option => option.setName("file").setDescription("Fichier à lire"))
    .addStringOption(option => option.setName("intern_file").setChoices({
      value: 'prout.ogg',
      name: 'prout'
    }).setDescription("Fichier interne à lire")),
  async execute(interaction: ChatInputCommandInteraction) {

    const channel = interaction.options.getChannel('channel', true)
    const _file = interaction.options.getAttachment('file')
    const _internFile = interaction.options.getString('intern_file')
    console.log(_file)
    console.log(_internFile)


    const player = createAudioPlayer({debug: true})

    player.on('debug', (e) => console.log(e))


    const connection = joinVoiceChannel({
      channelId: channel.id || '', // TODO default
      guildId: channel.guildId || '', // TODO default
      adapterCreator: interaction.guild.voiceAdapterCreator, // TODO null safe
      // selfDeaf: false,
      // selfMute: false,
      // debug: true,
    })

    connection.on('debug', (e) => console.log(e))
    const subscription = connection.subscribe(player)

    await wait(500)

    const file = join(__dirname, '../assets/', _internFile || 'prout.ogg')
    let resource = createAudioResource(file, {inputType: StreamType.OggOpus});

    player.play(resource)
    await interaction.reply(`Now playing ${_internFile || 'prout.ogg'}`)

    await wait(5000)

    player.on(AudioPlayerStatus.AutoPaused, async () => {
      await wait(1000)
      subscription?.unsubscribe()
      connection.destroy()
    })
  },
} as ChatInputCommand;
