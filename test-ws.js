const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8788/api/ws');

ws.on('open', () => {
  console.log('Connected to WS');
  ws.send('Hello server!');
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
  ws.close();
});

ws.on('error', (err) => {
  console.error('Error:', err.message);
});

ws.on('close', () => {
  console.log('Closed');
});
