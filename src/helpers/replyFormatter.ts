import {EmbedBuilder, InteractionEditReplyOptions, InteractionReplyOptions, MessagePayload} from "discord.js";

export interface StandardReplyOptions {
  name: string
  description: string
  thumbnail?: string
}
const formatStandard = (options: StandardReplyOptions, ephemeral: boolean = true) => {
  let embeds = new EmbedBuilder()
    .setColor('#0e8300')
    .addFields([{name: options.name, value: options.description}])

  if (options.thumbnail)
    embeds = embeds.setThumbnail(options.thumbnail)

  return { embeds: [embeds], options: {ephemeral} }
}
const formatError = (description: string) => {
  const embeds = new EmbedBuilder()
    .setColor('#830000')
    .addFields([{name: 'Erreur', value: description}])

  return { embeds: [embeds], options: {ephemeral: true} }
}

export {
  formatStandard,
  formatError,
}
