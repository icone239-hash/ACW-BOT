// scratch/get_pw_top_list.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';

async function run() {
  try {
    // Search for top-list channel in PW server (1477868796021833890)
    console.log('Fetching channels from PW server...');
    const channelsRes = await fetch('https://discord.com/api/v9/guilds/1477868796021833890/channels', {
      headers: { Authorization: USER_TOKEN }
    });
    const channels = await channelsRes.json();
    const topChannel = channels.find(c => c.name.includes('top'));

    if (topChannel) {
      console.log(`Found top channel "${topChannel.name}" (${topChannel.id}). Fetching messages...`);
      const msgRes = await fetch(`https://discord.com/api/v9/channels/${topChannel.id}/messages?limit=10`, {
        headers: { Authorization: USER_TOKEN }
      });
      const msgs = await msgRes.json();
      msgs.forEach((msg, idx) => {
        console.log(`\n--- Message ${idx+1} (${msg.id}) by ${msg.author.username} ---`);
        console.log(`Content: "${msg.content}"`);
        if (msg.embeds && msg.embeds.length > 0) {
          console.log('Embeds:', JSON.stringify(msg.embeds, null, 2));
        }
        if (msg.components && msg.components.length > 0) {
          console.log('Components:', JSON.stringify(msg.components, null, 2));
        }
      });
    } else {
      console.log('No top channel found in PW server.');
    }
  } catch (err) {
    console.error(err);
  }
}

run();
