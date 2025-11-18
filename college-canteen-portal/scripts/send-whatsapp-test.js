const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

client.messages
  .create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: 'whatsapp:+918383934397', // change to your verified number
    body: 'Test message from SkipQ webhook',
  })
  .then(msg => console.log('Sent', msg.sid))
  .catch(err => console.error(err));