import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import {ActivityType, Client, Collection, Events, GatewayIntentBits} from "discord.js";
import commands from './commands'
import logger from "./helpers/logger";
import {deployCommands} from "./deployCommands";
import ms = require("ms");
import {formatStandard} from "./helpers/replyFormatter";

(async () => {
  dotenv.config()

  if (process.env.DEPLOY_COMMANDS)
    await deployCommands()

// Create a new client instance
  const client = new Client({
    presence: {activities: [{name: '/quid', type: ActivityType.Watching}]},
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildBans,
      GatewayIntentBits.GuildEmojisAndStickers,
      GatewayIntentBits.GuildIntegrations,
      GatewayIntentBits.GuildWebhooks,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMessageTyping,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.DirectMessageTyping,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildScheduledEvents,
      GatewayIntentBits.AutoModerationConfiguration,
      GatewayIntentBits.AutoModerationExecution,
    ]
  });

  client.commands = new Collection();


  for (const command of commands) {
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    }
  }

  client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        logger.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        const start = Date.now();
        const subcommand = interaction.options.getSubcommand(false)
        logger.info(`Executing slash command "${interaction.commandName}${subcommand ? ' ' : ''}${subcommand ? subcommand : ''}"...`)
        await command.execute(interaction);
        logger.info(`Executed slash command "${interaction.commandName}${subcommand ? ' ' : ''}${subcommand ? subcommand : ''}" in ${ms(Date.now() - start)}`)
      } catch (error) {
        logger.error(error);
        await interaction.reply({content: 'There was an error while executing this command!', ephemeral: true});
      }
    } else {
      logger.warn(`Command with interaction ID ${interaction.id} is not implemented already`)
    }

  });


  process.on('unhandledRejection', error => {
    logger.error('Unhandled promise rejection:');
    console.log(error) // pino doesn't display error todo need to find a way
  });

  client.on(Events.ClientReady, (c) => logger.info(`Bot online - logged in as ${c.user.tag}`));
  client.on(Events.Debug, m => logger.debug(m));
  client.on(Events.Warn, m => logger.warn(m));
  client.on(Events.Error, m => logger.error(m));

  // Log in to Discord with your client's token
  await client.login(process.env.TOKEN);

})()
