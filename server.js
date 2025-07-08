const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const CSVIntegration = require('./src/csv-integration');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Data storage
let currentData = {};
let lastCheck = null;
let lastChange = null;
let recentTicks = [];
let userData = {}; // Store user tick data

// Load existing data
const dataFile = 'data.json';
if (fs.existsSync(dataFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    currentData = data.currentData || {};
    lastCheck = data.lastCheck || null;
    lastChange = data.lastChange || null;
    recentTicks = data.recentTicks || [];
    userData = data.userData || {};
    console.log('Loaded existing data from file');
  } catch (error) {
    console.error('Error loading data file:', error.message);
  }
}

// Save data function
function saveData() {
  const data = {
    currentData,
    lastCheck,
    lastChange,
    recentTicks,
    userData
  };
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// CSV Integration
const csvIntegration = new CSVIntegration();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
  res.json({
    lastCheck,
    lastChange,
    currentData,
    recentTicks
  });
});

app.post('/api/check-now', async (req, res) => {
  try {
    console.log('Manual check triggered...');
    const changes = await checkForChanges();
    
    if (changes && changes.length > 0) {
      res.json({ status: 'changes-detected', changes });
    } else {
      res.json({ status: 'no-changes' });
    }
  } catch (error) {
    console.error('Manual check failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint for downloading user ticks
app.post('/api/download-ticks', async (req, res) => {
  try {
    const { userUrl } = req.body;
    
    if (!userUrl) {
      return res.status(400).json({ error: 'User URL is required' });
    }
    
    console.log(`Downloading ticks for URL: ${userUrl}`);
    
    // Extract user ID and username from URL
    const urlMatch = userUrl.match(/\/user\/(\d+)\/([^\/]+)/);
    if (!urlMatch) {
      return res.status(400).json({ error: 'Invalid Mountain Project user URL' });
    }
    
    const userId = urlMatch[1];
    const username = urlMatch[2];
    
    console.log(`User ID: ${userId}, Username: ${username}`);
    
    // Download the user's ticks
    const result = await csvIntegration.downloadUserTicks(userId, username);
    
    if (result && result.success) {
      // Store the user data
      userData[username] = {
        userId,
        username,
        lastDownload: new Date().toISOString(),
        totalTicks: result.totalTicks,
        allTicks: result.ticks, // Store all ticks for analysis
        recentTicks: result.ticks.slice(0, 10) // Store last 10 ticks for display
      };
      // Update recent ticks for display
      recentTicks = result.ticks.slice(0, 5).map(tick => ({
        user: username,
        date: tick.date,
        route: tick.route,
        rating: tick.rating,
        notes: tick.notes
      }));
      saveData();
      // Notify connected clients
      io.emit('notification', {
        type: 'ticks-downloaded',
        message: `Downloaded ${result.totalTicks} ticks for ${username}`,
        userData: userData[username],
        recentTicks
      });
      res.json({
        success: true,
        message: `Successfully downloaded ${result.totalTicks} ticks for ${username}`,
        userData: userData[username],
        recentTicks
      });
    } else {
      res.status(400).json({ error: result.error || 'Failed to download or parse ticks (CSV may be invalid or user data is private)' });
    }
    
  } catch (error) {
    console.error('Download ticks error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint to get user data
app.get('/api/user/:username', (req, res) => {
  const { username } = req.params;
  const user = userData[username];
  
  if (user) {
    res.json({ success: true, userData: user });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// New endpoint to remove a user
app.delete('/api/user/:username', (req, res) => {
  const { username } = req.params;
  
  if (userData[username]) {
    delete userData[username];
    saveData();
    
    // Notify connected clients
    io.emit('notification', {
      type: 'user-removed',
      message: `Removed ${username} from monitored users`,
      username: username
    });
    
    res.json({ success: true, message: `Removed ${username} from monitored users` });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// New endpoint to get all users
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    users: Object.keys(userData).map(username => ({
      username,
      ...userData[username]
    }))
  });
});

// New endpoint to get recent tick counts (last 30 days) for all users
app.get('/api/recent-ticks', (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTickCounts = [];
    
    for (const username in userData) {
      const user = userData[username];
      if (user.allTicks && Array.isArray(user.allTicks)) {
        const recentTicks = user.allTicks.filter(tick => {
          const tickDate = new Date(tick.date);
          return tickDate >= thirtyDaysAgo;
        });
        
        recentTickCounts.push({
          username: username,
          tickCount: recentTicks.length,
          lastTickDate: recentTicks.length > 0 ? recentTicks[0].date : null,
          totalTicks: user.allTicks.length
        });
      } else {
        // Fallback if allTicks not available
        recentTickCounts.push({
          username: username,
          tickCount: 0,
          lastTickDate: null,
          totalTicks: user.totalTicks || 0
        });
      }
    }
    
    // Sort by tick count (highest first)
    recentTickCounts.sort((a, b) => b.tickCount - a.tickCount);
    
    res.json({
      success: true,
      recentTickCounts,
      period: 'Last 30 days',
      cutoffDate: thirtyDaysAgo.toISOString()
    });
    
  } catch (error) {
    console.error('Error getting recent tick counts:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint to refresh all users' tick data and get recent counts
app.post('/api/refresh-all-ticks', async (req, res) => {
  try {
    console.log('=== REFRESHING ALL USERS TICK DATA ===');
    
    const results = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (const username in userData) {
      const user = userData[username];
      console.log(`Refreshing ticks for ${username}...`);
      
      try {
        const result = await csvIntegration.downloadUserTicks(user.userId, username);
        
        if (result && result.success) {
          // Update user data with all ticks
          userData[username] = {
            ...user,
            lastDownload: new Date().toISOString(),
            totalTicks: result.totalTicks,
            allTicks: result.ticks, // Store all ticks
            recentTicks: result.ticks.slice(0, 10) // Store last 10 ticks for display
          };
          
          // Count recent ticks
          const recentTicks = result.ticks.filter(tick => {
            const tickDate = new Date(tick.date);
            return tickDate >= thirtyDaysAgo;
          });
          
          results.push({
            username: username,
            success: true,
            totalTicks: result.totalTicks,
            recentTickCount: recentTicks.length,
            lastTickDate: recentTicks.length > 0 ? recentTicks[0].date : null
          });
          
          console.log(`✅ ${username}: ${recentTicks.length} ticks in last 30 days (${result.totalTicks} total)`);
        } else {
          results.push({
            username: username,
            success: false,
            error: result.error || 'Failed to download ticks'
          });
          console.log(`❌ ${username}: Failed to refresh ticks`);
        }
      } catch (error) {
        results.push({
          username: username,
          success: false,
          error: error.message
        });
        console.log(`❌ ${username}: Error refreshing ticks - ${error.message}`);
      }
    }
    
    // Save updated data
    saveData();
    
    // Sort results by recent tick count
    const successfulResults = results.filter(r => r.success);
    successfulResults.sort((a, b) => b.recentTickCount - a.recentTickCount);
    
    // Notify connected clients
    io.emit('notification', {
      type: 'ticks-refreshed',
      message: `Refreshed tick data for ${successfulResults.length} users`,
      results: successfulResults
    });
    
    res.json({
      success: true,
      message: `Refreshed tick data for ${successfulResults.length} users`,
      results: successfulResults,
      period: 'Last 30 days',
      cutoffDate: thirtyDaysAgo.toISOString()
    });
    
  } catch (error) {
    console.error('Error refreshing all ticks:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Username and password are required' 
    });
  }
  
  try {
    // Set credentials in the CSV API
    csvIntegration.csvApi.setCredentials(username, password);
    
    // Attempt to login
    const loginSuccess = await csvIntegration.csvApi.login();
    
    if (loginSuccess) {
      res.json({ 
        success: true, 
        message: 'Successfully logged in to Mountain Project' 
      });
    } else {
      res.status(401).json({ 
        success: false, 
        error: 'Login failed - please check your username and password' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to login: ' + error.message 
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    // Clear credentials
    csvIntegration.csvApi.clearCredentials();
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to logout: ' + error.message 
    });
  }
});

app.get('/api/auth/status', (req, res) => {
  const isAuthenticated = csvIntegration.csvApi.isAuthenticated;
  res.json({ 
    success: true, 
    isAuthenticated,
    username: isAuthenticated ? csvIntegration.csvApi.username : null
  });
});

// Legacy route monitoring function (simplified)
async function checkForChanges() {
  try {
    console.log('Checking for changes...');
    
    // For now, just update the timestamp
    const now = new Date().toISOString();
    lastCheck = now;
    
    // If this is the first check, set it as the last change
    if (!lastChange) {
      lastChange = now;
    }
    
    saveData();
    
    // Notify clients
    io.emit('status', {
      lastCheck,
      lastChange,
      currentData,
      recentTicks
    });
    
    return []; // No changes for now
    
  } catch (error) {
    console.error('Error checking for changes:', error.message);
    return [];
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current status
  socket.emit('status', {
    lastCheck,
    lastChange,
    currentData,
    recentTicks
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Schedule daily checks (simplified)
console.log('Scheduled to check for changes daily at 5 PM');
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 17 && now.getMinutes() === 0) {
    console.log('Scheduled check starting at 5 PM...');
    checkForChanges();
  }
}, 60000); // Check every minute