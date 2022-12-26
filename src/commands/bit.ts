import {AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel} from "@discordjs/voice";
import {join} from "node:path";

import {ChannelType, ChatInputCommandInteraction, GuildMember, SlashCommandBuilder} from "discord.js";

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

const CHANNEL = 'canal'
const SOUND = 'son'
const FILE = 'fichier'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bit')
    .setDescription('Sound bit à jouer')
    .addChannelOption(option => option.setName(CHANNEL).setDescription("Canal à rejoindre").addChannelTypes(ChannelType.GuildVoice))
    .addStringOption(option => option.setName(SOUND).setChoices(
      {value: 'prout.ogg', name: 'prout'},
      {value: 'bah_oui_connard.mp3', name: 'bah oui connard'},
    ).setDescription("Son parmi ceux dispos"))
    .addAttachmentOption(option => option.setName(FILE).setDescription("Utiliser son propre fichier audio"))
  ,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    if (!interaction.guild) {
      console.error('interaction.guild not found')
      await interaction.editReply('Problème interne :(')
      return
    }

    const member = interaction.member as GuildMember
    const fetchedMember = await member.fetch()
    const channel = interaction.options.getChannel(CHANNEL) || fetchedMember.voice.channel

    if (!channel) {
      console.error('No channel provided')
      await interaction.editReply('Aucun canal vocal trouvé')
      return
    }

    if (channel.type !== ChannelType.GuildVoice) {
      console.error('Selected channel is not of type voice')
      await interaction.editReply('La canal choisi n\'est pas de type audio')
      return
    }


    // Optionals
    const sound = interaction.options.getString(SOUND)
    const userFile = interaction.options.getAttachment(FILE)

    if (!sound && !userFile) {
      console.error('No sound or userFile found')
      await interaction.editReply('Veuillez renseigner au minimum un son ou un fichier audio')
      return

    }
    if (sound && userFile) {
      console.error('Both sound and userFile found')
      await interaction.editReply('Veuillez renseigner soit un son, soit un fichier audio')
      return

    }

    // Limit files to 5 Mo for now - todo env var ?
    if (userFile && userFile.size > 5000000) {
      console.error('Both sound and userFile found')
      await interaction.editReply(`Veuillez envoyer un fichier audio pesant moins de 5 Mo. Le votre fait ${Math.round(userFile.size / 1000000)} Mo`)
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
      const file = join(__dirname, '../assets/', sound)
      player.play(createAudioResource(String(file)))
      await interaction.editReply(`Son joué : ${sound}`)
    } else if (userFile) {
      player.play(createAudioResource(String(userFile?.attachment)))
      await interaction.editReply(`Fichier personnel utilisé : ${userFile?.name}`)
    }


    player.on(AudioPlayerStatus.AutoPaused, async () => {
      await wait(1000)
      subscription?.unsubscribe()
      connection.destroy()
    })
  },
} as ChatInputCommand;
