import 'dotenv/config';

import express from 'express';

import { Client, Events, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from 'discord-interactions';

import { VerifyDiscordRequest, getRandomEmoji, DiscordRequest } from './utils.js';
import {
  RIDETHEWAVE_COMMAND,
  HasGuildCommands,
} from './commands.js';
import { detectStravaLastActivity } from './strava.js';


const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let channel = null

client.once(Events.ClientReady, c => {
  channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
  console.log('Ready! Logged in as ' + c.user.tag);
  console.log('Currently sending updates in :' + channel)
});

client.login(process.env.DISCORD_TOKEN);

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "ridethewave" guild command
    if (name === 'ridethewave') {
      const exampleEmbed = new EmbedBuilder()
        .setColor('#5563fa')
        .setTitle('MLC Wave Runners')
        .setAuthor({ name: 'Strava' })
        .setURL('https://strava.com/clubs/mlc-wave-runners/')
        .setThumbnail('https://asweinrich.dev/media/WAVERUNNERS.png')
        .setDescription('Join the club and run with the best')         
        .setTimestamp()
        .setFooter({ text: 'MLC Wave Runners', iconURL: 'https://asweinrich.dev/media/WAVERUNNERS.png' });
      // Send a message into the channel where command was triggered from
      return res.send({ 
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [exampleEmbed] 
        }
      });
    }
    // additional guild commands go here: 
  }

});

let channel_msg = ""

app.listen(PORT, async () => {
  console.log('Listening on port', PORT);

  // Check if guild commands from commands.js are installed (if not, install them)
  HasGuildCommands(process.env.DISCORD_APP_ID, process.env.DISCORD_SERVER_ID, [
    RIDETHEWAVE_COMMAND,
  ]);

  await new Promise(r => setTimeout(r, 2000));
  channel_msg = detectStravaLastActivity();
  if(channel_msg === ""){
    console.log("There was an error creating the channel_msg!");
  }else{
    channel.send(channel_msg);
  }
});

setInterval(() => {
  channel_msg = detectStravaLastActivity()
  if(channel_msg === ""){
    console.log("There was an error creating the channel_msg!");
  }else{
    channel.send(channel_msg);
  }
}, 300000);
