const CSVAPI = require('./csv-api');
const fs = require('fs');
const path = require('path');

class CSVIntegration {
  constructor() {
    this.csvApi = new CSVAPI();
  }

  async downloadUserTicks(userId, username) {
    try {
      console.log(`=== DOWNLOADING TICKS FOR ${username} ===`);
      const result = await this.csvApi.downloadUserTicksCSV(userId, username);
      if (result && result.success) {
        console.log(`✅ Successfully downloaded ${username}'s ticks`);
        // Parse the CSV to extract recent ticks
        const ticks = this.parseCSVToTicks(result.content);
        if (!ticks.valid) {
          console.log('❌ CSV is not valid, not updating user data');
          return { success: false, error: 'Invalid or missing tick data (CSV not valid or user data is private)' };
        }
        
        // Delete the CSV file after parsing to save disk space
        if (result.filePath && fs.existsSync(result.filePath)) {
          try {
            fs.unlinkSync(result.filePath);
            console.log(`🗑️ Deleted CSV file: ${result.filePath}`);
          } catch (deleteError) {
            console.log(`⚠️ Failed to delete CSV file: ${deleteError.message}`);
          }
        }
        
        return {
          success: true,
          ticks: ticks.ticks,
          totalTicks: ticks.ticks.length
        };
      } else {
        console.log(`❌ Failed to download CSV`);
        return { success: false, error: 'Failed to download CSV' };
      }
    } catch (error) {
      console.error(`❌ Error downloading ticks for ${username}:`, error);
      return { success: false, error: error.message };
    }
  }

  parseCSVToTicks(csvContent) {
    try {
      // Check if the content is actually HTML instead of CSV
      if (csvContent.includes('<!DOCTYPE html>') || csvContent.includes('<html')) {
        console.log('❌ Received HTML instead of CSV - user data may be private or require authentication');
        return { valid: false, ticks: [] };
      }
      
      // Check for exact CSV header
      const expectedHeader = 'Date,Route,Rating,Notes,URL,Pitches,Location,"Avg Stars","Your Stars",Style,"Lead Style","Route Type","Your Rating",Length,"Rating Code"';
      const lines = csvContent.split('\n');
      const header = lines[0].trim();
      if (header !== expectedHeader) {
        console.log('❌ CSV header does not match expected format. Got:', header);
        return { valid: false, ticks: [] };
      }
      
      const ticks = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Handle CSV parsing with quotes
        const values = this.parseCSVLine(line);
        if (values.length >= 4) {
          const tick = {
            date: values[0] || 'Unknown',
            route: values[1] || 'Unknown',
            rating: values[2] || 'Unknown',
            notes: values[3] || '',
            url: values[4] || '',
            location: values[6] || '',
            user: 'CSV Download'
          };
          // Only add valid ticks (with actual route names)
          if (tick.route && tick.route !== 'Unknown' && tick.route.length > 0 && !tick.route.includes('<')) {
            ticks.push(tick);
          }
        }
      }
      // Sort by date (most recent first)
      ticks.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });
      console.log(`Parsed ${ticks.length} valid ticks from CSV`);
      return { valid: true, ticks };
    } catch (error) {
      console.error('Error parsing CSV:', error.message);
      return { valid: false, ticks: [] };
    }
  }

  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  async getRecentTicksForRoute(routeName, userId, username, daysBack = 30) {
    try {
      console.log(`=== GETTING RECENT TICKS FOR ROUTE: ${routeName} ===`);
      
      const result = await this.downloadUserTicks(userId, username);
      
      if (!result || !result.success) {
        return [];
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      
      // Filter ticks for the specific route and recent dates
      const recentTicks = result.ticks.filter(tick => {
        const tickDate = new Date(tick.date);
        const matchesRoute = tick.route.toLowerCase().includes(routeName.toLowerCase()) ||
                           routeName.toLowerCase().includes(tick.route.toLowerCase());
        
        return matchesRoute && tickDate >= cutoffDate;
      });
      
      console.log(`Found ${recentTicks.length} recent ticks for ${routeName}`);
      return recentTicks;
      
    } catch (error) {
      console.error('Error getting recent ticks for route:', error.message);
      return [];
    }
  }

  async getAllRecentTicks(userId, username, daysBack = 30) {
    try {
      console.log(`=== GETTING ALL RECENT TICKS FOR ${username} ===`);
      
      const result = await this.downloadUserTicks(userId, username);
      
      if (!result || !result.success) {
        return [];
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      
      // Filter for recent ticks
      const recentTicks = result.ticks.filter(tick => {
        const tickDate = new Date(tick.date);
        return tickDate >= cutoffDate;
      });
      
      console.log(`Found ${recentTicks.length} recent ticks in the last ${daysBack} days`);
      return recentTicks;
      
    } catch (error) {
      console.error('Error getting all recent ticks:', error.message);
      return [];
    }
  }
}

module.exports = CSVIntegration; 