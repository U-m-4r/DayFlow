/** HTTP and Socket.IO bootstrap, kept separate from app.ts to make API testing simple. */
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
const http = createServer(app);
const io = new Server(http, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || origin === process.env.CLIENT_URL) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  },
});
app.set('io', io);
io.on('connection', (socket) => socket.on('authenticate', (userId: string) => socket.join(`user:${userId}`)));
http.listen(Number(process.env.PORT || 4000), () => console.log('Dayflow API listening on :4000'));
