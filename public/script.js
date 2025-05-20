const socket = io();

// DOM Elements
const moistureValue = document.getElementById('moistureValue');
const waterValue = document.getElementById('waterValue');
const pumpStatus = document.getElementById('pumpStatus');
const warnings = document.getElementById('warnings');
const systemStatus = document.getElementById('systemStatus');

// Troubleshoot Mode Elements
const troubleshootToggle = document.getElementById('troubleshootToggle');
const troubleshootLabel = document.getElementById('troubleshootLabel');
const rawData = document.getElementById('rawData');
const rawMoisture = document.getElementById('rawMoisture');
const rawWater = document.getElementById('rawWater');
const manualControl = document.getElementById('manualControl');
const pumpOnButton = document.getElementById('pumpOnButton');
const pumpOffButton = document.getElementById('pumpOffButton');
const currentThreshold = document.getElementById('currentThreshold'); // Current threshold display
const soilThresholdInput = document.getElementById('soilThreshold'); // Input for new threshold

// System Uptime
const uptimeValue = document.getElementById('uptimeValue');
let uptimeSeconds = 0;
let uptimeInterval;

// Historical Data
const historyData = {
  moisture: [],
  water: [],
  pump: []
};
const ctx = document.getElementById('historyChart').getContext('2d');
const historyChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: 'Soil Moisture (%)', data: [], borderColor: 'green', borderWidth: 2, fill: false },
      { label: 'Water Level (%)', data: [], borderColor: 'blue', borderWidth: 2, fill: false },
      { label: 'Pump Status', data: [], borderColor: 'red', borderWidth: 2, fill: false }
    ]
  },
  options: {
    scales: {
      x: { title: { display: true, text: 'Time' } },
      y: { title: { display: true, text: 'Value' } }
    }
  }
});

// Function to set progress bar color
function setBarColor(bar, percent) {
  const r = percent < 50 ? 255 : Math.floor(255 - (percent - 50) * 5.1);
  const g = percent > 50 ? 255 : Math.floor(percent * 5.1);
  bar.style.backgroundColor = `rgb(${r}, ${g}, 0)`;
}

// Handle Troubleshoot Mode Toggle
troubleshootToggle.addEventListener('change', () => {
  const isTroubleshootMode = troubleshootToggle.checked;
  troubleshootLabel.textContent = `Troubleshoot Mode: ${isTroubleshootMode ? 'ON' : 'OFF'}`;
  rawData.classList.toggle('hidden', !isTroubleshootMode);
  manualControl.classList.toggle('hidden', !isTroubleshootMode);

  // Reset pump and messages when toggling Troubleshoot Mode
  socket.emit('command', isTroubleshootMode ? 'MODE:TROUBLESHOOT' : 'MODE:AUTO');
  socket.emit('command', 'PUMP:OFF'); // Turn off the pump
  warnings.innerHTML = ''; // Clear warnings
});

// Handle Manual Pump Control
pumpOnButton.addEventListener('click', () => {
  socket.emit('command', 'PUMP:ON');
});

pumpOffButton.addEventListener('click', () => {
  socket.emit('command', 'PUMP:OFF');
});

// Handle Custom Thresholds
document.getElementById('saveThresholds').addEventListener('click', () => {
  const soilThreshold = parseInt(soilThresholdInput.value);

  // Validate the input
  if (isNaN(soilThreshold) || soilThreshold < 0 || soilThreshold > 100) {
    alert('Please enter a valid percentage value between 0 and 100.');
    return;
  }

  // Update the current threshold display immediately
  currentThreshold.textContent = `${soilThreshold}%`;

  // Send the new threshold to the Arduino
  socket.emit('command', `THRESHOLD:SOIL:${soilThreshold}`);
});

// Start System Uptime Timer
window.onload = () => {
  uptimeInterval = setInterval(() => {
    uptimeSeconds++;
    uptimeValue.textContent = `${uptimeSeconds}s`;
  }, 1000);
};

// Update UI based on sensor data
socket.on('sensorData', data => {
  console.log('Received sensor data:', data);

  // Extract values from parsed data
  const moisture = parseInt(data.moisture || 0);
  const water = parseInt(data.water || 0);
  const pump = data.pump; // Pump status as boolean
  const warning = data.warning || {};
  const soilthreshold = parseInt(data.soilthreshold || 30); // Default to 30 if undefined
  const rawMoistureValue = parseInt(data.raw?.moisture || 0); // Raw moisture value
  const rawWaterValue = parseFloat(data.raw?.water || 0);     // Raw water value

  // Update UI elements
  moistureValue.textContent = moisture + '%';
  waterValue.textContent = water + '%';
  pumpStatus.textContent = pump ? 'ON' : 'OFF';
  pumpStatus.className = pump ? 'running' : '';

  // Update progress bars
  const moistureBar = document.getElementById('moistureBar');
  const waterBar = document.getElementById('waterBar');
  moistureBar.style.width = moisture + '%';
  waterBar.style.width = water + '%';
  setBarColor(moistureBar, moisture);
  setBarColor(waterBar, water);

  // Update raw values in Troubleshoot Mode
  rawMoisture.textContent = rawMoistureValue;
  rawWater.textContent = rawWaterValue.toFixed(1) + ' cm';

  // Handle warnings (fix flickering)
  handleWarnings(warning);

  // Update historical data every 1 second
  const timestamp = new Date().toLocaleTimeString();
  historyData.moisture.push(moisture);
  historyData.water.push(water);
  historyData.pump.push(pump ? 50 : 0); // Map pump status to 0 (OFF) or 50 (ON)

  historyChart.data.labels.push(timestamp);
  historyChart.data.datasets[0].data = historyData.moisture;
  historyChart.data.datasets[1].data = historyData.water;
  historyChart.data.datasets[2].data = historyData.pump; // Use mapped values

  if (historyChart.data.labels.length > 20) {
    historyChart.data.labels.shift();
    historyData.moisture.shift();
    historyData.water.shift();
    historyData.pump.shift();
  }

  historyChart.update();

  // Handle system status
  if (!warning.lowWater && !warning.cooldown) {
    startSystemStatusTimer();
  } else {
    stopSystemStatusTimer();
  }
});

// Handle warnings dynamically (fix flickering)
let currentWarnings = {};
function handleWarnings(warning) {
  // Avoid unnecessary updates
  if (JSON.stringify(warning) === JSON.stringify(currentWarnings)) return;

  warnings.innerHTML = ''; // Clear previous warnings

  if (warning.lowWater) {
    const lowWaterMessage = document.createElement('p');
    lowWaterMessage.classList.add('warning');
    lowWaterMessage.textContent = '⚠️ Low Water Level';
    warnings.appendChild(lowWaterMessage);
  }

  if (warning.cooldown) {
    const cooldownMessage = document.createElement('p');
    cooldownMessage.classList.add('warning');
    cooldownMessage.textContent = '⏳ Pump is in Cooldown';
    warnings.appendChild(cooldownMessage);
  }

  currentWarnings = { ...warning }; // Update current warnings
}

// Start or update the system running timer
let systemStatusTimer;
let systemRunningTime = 0;
function startSystemStatusTimer() {
  if (!systemStatusTimer) {
    systemRunningTime = 0;
    systemStatus.textContent = `✅ System Running with No Fault Detected (${systemRunningTime}s)`;

    systemStatusTimer = setInterval(() => {
      systemRunningTime++;
      systemStatus.textContent = `✅ System Running with No Fault Detected (${systemRunningTime}s)`;
    }, 1000);
  }
}

// Stop the system running timer
function stopSystemStatusTimer() {
  if (systemStatusTimer) {
    clearInterval(systemStatusTimer);
    systemStatusTimer = null;
    systemStatus.textContent = '';
  }
}