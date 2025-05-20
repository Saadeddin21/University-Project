const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const portName = 'COM8'; // Change to your COM port
const serialPort = new SerialPort({
  path: portName,
  baudRate: 9600
});

const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

app.use(express.static('public'));

server.listen(3000, () => {
  console.log('Server started on port 3000.');
});

// Parsing incoming data from Arduino
parser.on('data', line => {
  try {
    const data = {};
    line.trim().split(',').forEach(pair => {
      const [key, val] = pair.split(':');
      data[key.toLowerCase()] = val;
    });

    // Log parsed data for debugging
    console.log('Parsed data from Arduino:', data);

    // Convert to proper types
    const moisture = parseInt(data.moisture || 0);
    const water = parseInt(data.water || 0);
    const pump = data.pump === '1';
    const rawMoisture = parseFloat(data.rawmoisture || 0);
    const rawWater = parseFloat(data.rawwater || 0);

    // Determine warnings
    const warning = {
      lowWater: data.warning === 'lowWater',
      cooldown: data.warning === 'cooldown'
    };

    // Broadcast sensor data to clients
    io.emit('sensorData', {
      moisture,
      water,
      pump,
      warning,
      troubleshootMode: data.troubleshootmode === '1', // Include Troubleshoot Mode status
      raw: {
        moisture: rawMoisture,
        water: rawWater
      }
    });
  } catch (err) {
    console.error('Error parsing serial data:', err);
  }
});

// Handle commands from the client
io.on('connection', socket => {
  console.log('Client connected');

  socket.on('command', cmd => {
    console.log(`Received command: ${cmd}`);
    serialPort.write(`${cmd}\n`); // Forward command to Arduino
  });
});