const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

// Initialize data structure
let data = {
  lastCheck: null,
  lastChange: null,
  currentData: null,
  history: []
};

// Load existing data on startup
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
      data = JSON.parse(fileContent);
      console.log('Loaded existing data from file');
    } else {
      console.log('No existing data file found, starting fresh');
    }
  } catch (error) {
    console.error('Error loading data:', error);
    // Keep default data structure if file is corrupted
  }
}

// Save data to file
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Getters
function getLastCheck() {
  return data.lastCheck;
}

function getLastChange() {
  return data.lastChange;
}

function getCurrentData() {
  return data.currentData;
}

function getHistory() {
  return data.history;
}

// Setters
function setLastCheck(timestamp) {
  data.lastCheck = timestamp;
  saveData();
}

function setLastChange(timestamp) {
  data.lastChange = timestamp;
  saveData();
}

function setCurrentData(newData) {
  // Store previous data in history before updating
  if (data.currentData) {
    data.history.unshift({
      timestamp: new Date().toISOString(),
      data: data.currentData
    });
    
    // Keep only last 50 history entries
    if (data.history.length > 50) {
      data.history = data.history.slice(0, 50);
    }
  }
  
  data.currentData = newData;
  saveData();
}

// Initialize on module load
loadData();

module.exports = {
  getLastCheck,
  getLastChange,
  getCurrentData,
  getHistory,
  setLastCheck,
  setLastChange,
  setCurrentData
};