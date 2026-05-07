import { Server, createServer } from 'http';
import { Socket } from 'net';
import app from './app';
import { config } from './config/env';
import { ALGO } from './helpers/constants';
import { startTelegramBotListener } from './helpers/telegram';

/**
 * The HTTP server.
 * @type {Server}
 */
const server: Server = createServer(app);

// Start Telegram Bot Listener
startTelegramBotListener();

let connections: Socket[] = [];

server.listen(config.port, () => {
  console.log(`${ALGO}: Server running on PORT number ${config.port}`);
});

server.on('connection', connection => {
  connections.push(connection);
  connection.on('close', () => {
    connections = connections.filter(curr => curr !== connection);
  });
});

/**
 * Gracefully shuts down the server.
 */
export const shutdown = () => {
  console.log('Received kill signal, shutting down gracefully');
  server.close(() => {
    console.log('Closed out remaining connections');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);

  connections.forEach(curr => curr.end());
  setTimeout(() => connections.forEach(curr => curr.destroy()), 5000);
};

process.on('uncaughtException', err => {
  console.error(err);
});

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Optional /kill route (instead of process signal)
app.get('/kill', (req, res) => {
  setTimeout(shutdown, 1000);
  res.send("Execution of the 'Kill Algo' command has been initiated.");
});
