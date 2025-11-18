const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const from = process.env.TWILIO_WHATSAPP_FROM || '';
if (!from) throw new Error('Set TWILIO_WHATSAPP_FROM before running the WhatsApp test');
const formattedFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;

client.messages
  .create({
    from: formattedFrom,
    to: 'whatsapp:+918383934397', // change to your verified number
    body: 'Test message from SkipQ webhook',
  })
  .then(msg => console.log('Sent', msg.sid))
  .catch(err => console.error(err));