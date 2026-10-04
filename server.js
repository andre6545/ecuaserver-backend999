const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configurar CORS para permitir que tu sitio de Vercel lea los datos
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Almacén en memoria de los camioneros activos
const activeDrivers = {};

// Limpiar conductores inactivos (si no envían datos en 10 segundos)
setInterval(() => {
  const now = Date.now();
  let updated = false;

  Object.keys(activeDrivers).forEach(driverId => {
    if (now - activeDrivers[driverId].lastUpdate > 10000) {
      delete activeDrivers[driverId];
      updated = true;
    }
  });

  if (updated) {
    io.emit('telemetry_stream', activeDrivers);
  }
}, 5000);

io.on('connection', (socket) => {
  // Enviar el estado actual al conectarse un cliente web
  socket.emit('telemetry_stream', activeDrivers);

  // Recibir actualización de telemetría desde el conector del camionero
  socket.on('driver_telemetry_update', (data) => {
    if (!data.driverId) return;

    activeDrivers[data.driverId] = {
      ...data,
      lastUpdate: Date.now()
    };

    // Emitir inmediatamente la posición y estado a todos los visores web
    io.emit('telemetry_stream', activeDrivers);
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend de Telemetría activo en puerto ${PORT}`);
});
