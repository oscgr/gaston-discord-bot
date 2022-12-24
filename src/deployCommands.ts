import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()

import {REST, Routes} from "discord.js";

import commands from './commands'


// Construct and prepare an instance of the REST module

// and deploy your commands!
(async () => {
  try {
    if (!process.env.TOKEN)
      throw new Error('TOKEN was not found')

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    console.debug(`Started refreshing ${commands.length} application (/) commands.`);

    if (!process.env.CLIENT_ID)
      throw new Error('CLIENT_ID was not found')
    if (!process.env.GUILD_ID)
      throw new Error('GUILD_ID was not found')

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands.map(command => command.data.toJSON()) },
    ) as unknown[];


    console.debug('deploy', `Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error('deploy', String(error));
  }
})();
