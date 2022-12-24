import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import {Client, Collection, Events, GatewayIntentBits} from "discord.js";
import commands from './commands'

(async () => {
  dotenv.config()

// Create a new client instance
  const client = new Client({intents: [GatewayIntentBits.GuildVoiceStates]});

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
  client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
  });

  client.commands = new Collection();


  for (const command of commands) {
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    }
  }

  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({content: 'There was an error while executing this command!', ephemeral: true});
    }
  });


  client.user?.setPresence({activities: [{name: 'Allo'}], status: 'idle'});

  process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
  });

  // Log in to Discord with your client's token
  await client.login(process.env.TOKEN);

})()
