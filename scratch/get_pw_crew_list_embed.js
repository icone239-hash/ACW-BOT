// scratch/get_pw_crew_list_embed.js
const USER_TOKEN = 'MTE4Njc4MTkxODQxNTU2OTAwOQ.GuMnOY.cxJ0rptCbz24gQf3JhkldeQeuMFVOwO85lPwOA';
const SOURCE_CHANNEL_ID = '1477890477108887665';

async function run() {
  try {
    console.log(`Fetching messages from source channel: ${SOURCE_CHANNEL_ID}...`);
    const res = await fetch(`https://discord.com/api/v9/channels/${SOURCE_CHANNEL_ID}/messages?limit=10`, {
      headers: {
        Authorization: USER_TOKEN
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const messages = await res.json();
    console.log(`Fetched ${messages.length} messages. Inspecting embeds...`);

    messages.forEach((msg, idx) => {
      console.log(`\n--- Message ${idx + 1} (ID: ${msg.id}) by ${msg.author.username} ---`);
      console.log(`Content: "${msg.content}"`);
      if (msg.embeds && msg.embeds.length > 0) {
        console.log('Embeds:');
        console.log(JSON.stringify(msg.embeds, null, 2));
      } else {
        console.log('No embeds in this message.');
      }
    });

  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

run();
