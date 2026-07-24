// scratch/post_top_list_to_acw.js
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');
const { buildTopListEmbed, buildTopListDropdown } = require('../utils/topListHelper');

const ACW_SERVER_ID = '1525985063143997691';
const TOP_LIST_CHANNEL_ID = '1526005799933968444';

const userIdsToCache = [
  '749376790795124737',
  '1266298590351986792',
  '1486852030596386947',
  '725135133568663633',
  '1456171646745444506',
  '1481784863521771705',
  '1059699158212169758',
  '1476415131666743376',
  '819375803556560907',
  '1273443757718769676',
  '1483275547290243185',
  '1479638735321567408',
  '531550641336877057',
  '1473692183860215810',
  '1279863242767990807',
  '1378986194205151242',
  '1515886618232225892'
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', async () => {
  try {
    console.log('--- Posting Top List to Official ACW Channel ---');
    const guild = await client.guilds.fetch(ACW_SERVER_ID);
    console.log(`Guild: ${guild.name} (${guild.id})`);

    // Pre-fetch all user profiles so Discord client caches their handles
    console.log('Pre-fetching user profiles for member mentions...');
    for (const uid of userIdsToCache) {
      await client.users.fetch(uid).catch(() => {});
      await guild.members.fetch(uid).catch(() => {});
    }

    const channel = await client.channels.fetch(TOP_LIST_CHANNEL_ID);

    // Clean up existing bot messages in #top-list channel
    const fetched = await channel.messages.fetch({ limit: 20 });
    for (const msg of fetched.values()) {
      if (msg.author.id === client.user.id) {
        await msg.delete().catch(() => {});
      }
    }

    const embed = buildTopListEmbed('all', guild);
    const row   = buildTopListDropdown('all');

    await channel.send({
      embeds: [embed],
      components: [row]
    });

    console.log('🎉 Successfully posted Official Top List embed & dropdown in ACW #top-list with cached user mentions!');
    process.exit(0);
  } catch (err) {
    console.error('Error posting top list:', err);
    process.exit(1);
  }
});

client.login(config.token);
