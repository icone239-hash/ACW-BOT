// scratch/post_suspension_rules.js
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const TARGET_GUILD_ID = '1528909271633363185';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', async () => {
  try {
    const guild = client.guilds.cache.get(TARGET_GUILD_ID);
    if (!guild) process.exit(1);

    // Find or create #suspension-rules channel
    let channel = guild.channels.cache.find(
      c => c.isTextBased() && (c.name.includes('suspension-rules') || c.name.includes('suspension_rules'))
    );

    if (!channel) {
      channel = await guild.channels.create({
        name: '📜ㆍsuspension-rules',
        reason: 'Create suspension rules channel'
      });
    }

    console.log(`Posting rules in channel ${channel.name}...`);
    const fetched = await channel.messages.fetch({ limit: 50 });
    for (const msg of fetched.values()) {
      await msg.delete().catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setAuthor({ name: 'ACW S1 | League Guidelines', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('📜 Official ACW Suspension Rules & Bail System')
      .setDescription('Below are the official league suspension rules, offense tiers, and bail requirements:')
      .addFields(
        {
          name: '⚠️ Possession Of Exploits / Exploiting',
          value: 
            '**1st offense:** 7 day suspension | **$10 bail**\n' +
            '**2nd offense:** 14 day suspension | **$30 bail**\n' +
            '**3rd offense:** Full season suspension | **No bail**',
          inline: false
        },
        {
          name: '🦆 Ducking SS (Screen Share)',
          value:
            '**1st offense:** 1 day suspension | **$5 bail**\n' +
            '**2nd offense:** 2 day suspension | **$10 bail**\n' +
            '**3rd offense:** 3 day suspension | **$15 bail**\n' +
            '**4th offense:** Full season suspension | **$30 bail**',
          inline: false
        },
        {
          name: '🔨 Admin Abuse',
          value:
            '**1st offense:** 1 day suspension | **$5 bail**\n' +
            '**2nd offense:** 3 day suspension | **$8 bail**\n' +
            '**3rd offense:** Full season suspension | **$20 bail**',
          inline: false
        },
        {
          name: '🚫 Doxxing Private Photos',
          value:
            '**1st offense:** 2 day suspension + 1 day timeout | **$15 bail**\n' +
            '**2nd offense:** Banned (**No appeal if banned for doxing**)',
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) });

    await channel.send({ embeds: [embed] });
    console.log('🎉 Suspension rules posted successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

client.login(config.token);
