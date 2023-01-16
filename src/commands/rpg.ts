import {
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  User,
} from "discord.js";
import {ChatInputCommand} from "../types/ChatInputCommand";
import logger from "../helpers/logger";
import {formatError, formatStandard} from "../helpers/replyFormatter";
import {readdirSync, rmSync} from "fs";
import {join} from "node:path";
import {random, sortedUniqBy} from "lodash";

const DICE = 'dé'
const DICE_NB = 'nombre'
const PRIVATE = 'privé'
const VALUE = 'valeur'

const roll = (dice: number, diceNb: number, user: User) => {

  const _dice = Math.abs(dice)
  const _diceNb = Math.abs(diceNb)
  let value = 0
  for (let i = 0; i < _diceNb; i++) {
    value += random(1, _dice)
  }
  let valueInfo = ''
  const min = _diceNb
  const max = _diceNb * _dice
  if (value === min)
    valueInfo = ' - MINIMUM'
  else if (value === max)
    valueInfo = ' - MAXIMUM'

  logger.info(`Roll from user ${user.tag} ${_diceNb}d${_dice} : ${value}`)
  return formatStandard({name: `Jet de ${_diceNb}d${_dice} (min: ${_diceNb}, max: ${_dice*_diceNb})`, description: `${value}${valueInfo}`})
}
const subcommands = {
  roll: async (interaction: ChatInputCommandInteraction) => {
    const dice = interaction.options.getNumber(DICE, true)
    const diceNb = interaction.options.getNumber(DICE_NB) || 1
    await interaction.editReply(roll(dice, diceNb, interaction.user))
  },
  '1d6': async (interaction: ChatInputCommandInteraction) => {
    await interaction.editReply(roll(6, 1, interaction.user))
  },
  flip: async (interaction: ChatInputCommandInteraction) => {
    await interaction.editReply(roll(2, 1, interaction.user))
  },
  bid: async (interaction: ChatInputCommandInteraction) => {
    const value = interaction.options.getNumber(VALUE, true)
    if (!process.env.GAME_MASTER_ID) {
      logger.error('process.env.GAME_MASTER_ID missing')
      await interaction.editReply(formatError('L\'identifiant du MJ n\'a pas été renseigné'))
      return
    }
    const user = await interaction.client?.users.fetch(process.env.GAME_MASTER_ID)
    logger.info(`Fetched game master informations - ${user.tag}`)
    await user.send(formatStandard({name: interaction.user.tag, description: String(value)}))
    await interaction.editReply(formatStandard({description: String(value), name: 'Pari envoyé'}))
    logger.info(`Bid ${value} from user ${interaction.user.tag}`)
  }
}
const getSubcommandFn = (subcommand?: string) => {
  switch (subcommand) {
    case 'roll':
      return subcommands.roll
    case '1d6':
      return subcommands['1d6']
    case 'flip':
      return subcommands.flip
    case 'bid':
      return subcommands.bid
    default:
      return null
  }
}
module.exports = {
  data: new SlashCommandBuilder()
    .setName('rpg')
    .setDescription('Commandes pour du jeu de rôle')
    .addSubcommand(subcommand => subcommand
      .setName('roll')
      .setDescription('Jet de dé(s)')
      .addNumberOption(option => option.setName(DICE).setDescription("Nombre de faces du dé joué").setRequired(true))
      .addNumberOption(option => option.setName(DICE_NB).setDescription("Nombre de dés joués"))
      .addBooleanOption(option => option.setName(PRIVATE).setDescription("Information privée")))
    .addSubcommand(subcommand => subcommand
      .setName('1d6')
      .setDescription('Jet de 1d6')
      .addBooleanOption(option => option.setName(PRIVATE).setDescription("Information privée")))
    .addSubcommand(subcommand => subcommand
      .setName('flip')
      .setDescription('Jet de 1d2')
      .addBooleanOption(option => option.setName(PRIVATE).setDescription("Information privée")))
    .addSubcommand(subcommand => subcommand
      .setName('bid')
      .setDescription('Faites un pari avec une valeur - envoie un PM au maître du jeu')
      .addNumberOption(option => option.setName(VALUE).setDescription("Valeur pariée").setRequired(true)
      )),

  async execute(interaction: ChatInputCommandInteraction) {
    let ephemeral
    const subcommand = interaction.options.getSubcommand()
    if (subcommand === 'bid') {
      ephemeral = true
    } else {
      ephemeral = interaction.options.getBoolean(PRIVATE) || false
    }
    await interaction.deferReply({ephemeral});

    const subcommandFn = getSubcommandFn(subcommand)

    if (!subcommandFn) {
      logger.error('No subcommand found for admin')
      await interaction.editReply(formatError('Erreur interne'))
      return
    }

    await subcommandFn(interaction)
  },
} as ChatInputCommand;
