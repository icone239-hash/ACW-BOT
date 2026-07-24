// scratch/get_pw_list_channel.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';

async function run() {
  const res = await fetch('https://discord.com/api/v9/channels/1480787914039365732/messages?limit=10', {
    headers: { Authorization: USER_TOKEN }
  });
  const msgs = await res.json();
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
}

run();
