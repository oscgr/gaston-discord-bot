import {EmbedBuilder, InteractionEditReplyOptions, MessagePayload} from "discord.js";

export interface StandardReplyOptions {
  name: string
  description: string
}
const formatStandard = (options: StandardReplyOptions):MessagePayload | InteractionEditReplyOptions => {
  const embeds = new EmbedBuilder()
    .setColor('#0e8300')
    .addFields([{name: options.name, value: options.description}])

  return { embeds: [embeds], options: {ephemeral: true} }
}
const formatError = (description: string):MessagePayload | InteractionEditReplyOptions => {
  const embeds = new EmbedBuilder()
    .setColor('#830000')
    .addFields([{name: 'Erreur', value: description}])

  return { embeds: [embeds], options: {ephemeral: true} }
}

export {
  formatStandard,
  formatError,
}
