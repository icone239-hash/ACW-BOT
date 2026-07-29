require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');

function getBotToken() {
  if (process.env.DISCORD_TOKEN) return process.env.DISCORD_TOKEN.trim().replace(/^["']|["']$/g, '');
  for (const key of Object.keys(process.env)) {
    if (key.toLowerCase().includes('token')) {
      const val = process.env[key];
      if (val && val.length > 20 && val !== 'YOUR_DISCORD_BOT_TOKEN_HERE') {
        return val.trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  const fallbackB64 = "TVRVeU9USTFNak16T0RBM016YzJOREF3TXcuR2k3T2VJLlkyMnUtT2hhQmE2UlZQMnp3VUFzczRuU3NadHBxT1BiS2w3dmFN";
  return Buffer.from(fallbackB64, 'base64').toString('utf8');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get(config.guildId) || client.guilds.cache.first();
  const channel = guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('scores') || c.name.includes('score')));

  let allMessages = [];
  let lastId = null;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const fetched = await channel.messages.fetch(options).catch(() => null);
    if (!fetched || fetched.size === 0) break;
    allMessages.push(...fetched.values());
    lastId = fetched.last().id;
    if (fetched.size < 100) break;
  }

  console.log(`Searching ${allMessages.length} messages for slant academy...`);

  allMessages.forEach((msg, idx) => {
    const content = msg.content || '';
    let embedStr = '';
    if (msg.embeds && msg.embeds.length > 0) {
      const e = msg.embeds[0];
      embedStr = `${e.title || ''} | ${e.description || ''} | ${e.footer ? e.footer.text : ''}`;
    }
    const fullText = (content + ' ' + embedStr).toLowerCase();
    if (fullText.includes('slant') || fullText.includes('51')) {
      console.log(`Msg #${idx+1} (ID ${msg.id}, ${msg.createdAt}):`);
      console.log(` Content: ${msg.content}`);
      if (embedStr) console.log(` Embed: ${embedStr}`);
    }
  });

  client.destroy();
  process.exit(0);
});

client.login(getBotToken());
