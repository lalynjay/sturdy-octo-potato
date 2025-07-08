const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Browser-like headers to avoid being blocked
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
  'Referer': 'https://www.mountainproject.com/',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"'
};

class CSVAPI {
  constructor() {
    this.downloadPath = path.join(__dirname, '..', 'downloads');
    
    // Create downloads directory if it doesn't exist
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
    }
    
    // Session-based authentication
    this.username = null;
    this.password = null;
    this.isAuthenticated = false;
    this.sessionCookies = null;
    this.csrfToken = null;
  }

  // Set login credentials
  setCredentials(username, password) {
    this.username = username;
    this.password = password;
    this.isAuthenticated = false; // Will be set to true after successful login
    console.log('✅ Credentials set, attempting login...');
  }

  // Clear credentials
  clearCredentials() {
    this.username = null;
    this.password = null;
    this.isAuthenticated = false;
    this.sessionCookies = null;
    this.csrfToken = null;
    console.log('✅ Credentials cleared');
  }

  // Login to Mountain Project and get session
  async login() {
    if (!this.username || !this.password) {
      console.log('❌ No credentials set');
      return false;
    }

    try {
      console.log('🔐 Attempting to login to Mountain Project...');
      
      // First, get the login page to extract CSRF token
      const loginPageResponse = await axios.get('https://www.mountainproject.com/login', {
        headers: BROWSER_HEADERS,
        timeout: 180000
      });

      // Extract CSRF token from the login page
      const csrfMatch = loginPageResponse.data.match(/name="_token" value="([^"]+)"/);
      if (csrfMatch) {
        this.csrfToken = csrfMatch[1];
        console.log('✅ Found CSRF token');
      }

      // Perform login
      const loginResponse = await axios.post('https://www.mountainproject.com/login', 
        `_token=${this.csrfToken}&email=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`,
        {
          headers: {
            ...BROWSER_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://www.mountainproject.com/login'
          },
          timeout: 180000,
          maxRedirects: 5,
          validateStatus: function (status) {
            return status >= 200 && status < 400; // Accept redirects
          }
        }
      );

      // Extract session cookies
      const setCookieHeaders = loginResponse.headers['set-cookie'];
      if (setCookieHeaders) {
        this.sessionCookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
        console.log('✅ Session cookies obtained');
      }

      // Check if login was successful by looking for user-specific content
      if (loginResponse.data.includes('logout') || loginResponse.data.includes('My Account')) {
        this.isAuthenticated = true;
        console.log('✅ Successfully logged in to Mountain Project');
        return true;
      } else {
        console.log('❌ Login failed - could not find user-specific content');
        return false;
      }

    } catch (error) {
      console.log('❌ Login error:', error.message);
      return false;
    }
  }

  // Get authenticated headers
  getAuthHeaders() {
    const headers = { ...BROWSER_HEADERS };

    // Add session cookies if available
    if (this.sessionCookies) {
      headers['Cookie'] = this.sessionCookies;
    }

    return headers;
  }

  async downloadUserTicksCSV(userId, username) {
    console.log(`=== TRYING TO DOWNLOAD CSV FOR USER: ${username} (${userId}) ===`);
    
    // If we have credentials but aren't authenticated, try to login
    if (this.username && this.password && !this.isAuthenticated) {
      console.log('🔐 Attempting to login before downloading...');
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        console.log('❌ Login failed, proceeding without authentication');
      }
    }
    
    const urls = [
      `https://www.mountainproject.com/user/${userId}/${username}/tick-export`,
      `https://www.mountainproject.com/user/${userId}/${username}/ticks/export`,
      `https://www.mountainproject.com/user/${userId}/${username}/ticks.csv`,
      `https://www.mountainproject.com/user/${userId}/${username}/export/ticks`,
      `https://www.mountainproject.com/user/${userId}/${username}/ticks/export/csv`,
      `https://www.mountainproject.com/data/user/${userId}/ticks/export`,
      `https://www.mountainproject.com/api/user/${userId}/ticks/export`,
      `https://www.mountainproject.com/user/${userId}/${username}/ticks?format=csv`,
      `https://www.mountainproject.com/user/${userId}/${username}/ticks?export=csv`
    ];

    for (const url of urls) {
      try {
        console.log(`Trying URL: ${url}`);
        
        const response = await axios.get(url, {
          headers: this.getAuthHeaders(),
          timeout: 180000,
          maxRedirects: 5
        });

        console.log(`Response status: ${response.status}`);
        console.log(`Response headers:`, response.headers);

        // Check if we got CSV content
        const contentType = response.headers['content-type'] || '';
        const content = response.data;
        
        // For the first URL (tick-export), be more lenient - it should work for most users
        const isFirstUrl = url.includes('/tick-export');
        
        // First check: make sure it's not HTML (but be more lenient for the first URL)
        if (!isFirstUrl && (content.includes('<!DOCTYPE html>') || content.includes('<html') || content.includes('<title>'))) {
          console.log('❌ Response is HTML, not CSV - user data may be private');
          
          // If we got HTML and we're authenticated, try to parse it for tick data
          if (this.isAuthenticated) {
            console.log('🔍 Attempting to parse HTML for tick data...');
            const htmlTicks = this.extractTicksFromHTML(content, username);
            if (htmlTicks && htmlTicks.length > 0) {
              console.log(`✅ Successfully extracted ${htmlTicks.length} ticks from HTML`);
              
              // Convert to CSV format
              const csvContent = this.convertTicksToCSV(htmlTicks);
              
              // Save the CSV file
              const fileName = `${username}_ticks_${Date.now()}.csv`;
              const filePath = path.join(this.downloadPath, fileName);
              
              fs.writeFileSync(filePath, csvContent);
              console.log(`CSV saved to: ${filePath}`);
              
              return {
                success: true,
                filePath,
                content: csvContent
              };
            }
          }
          
          continue; // Try next URL
        }
        
        // Second check: make sure it looks like actual CSV data
        if (contentType.includes('csv') || content.includes('Date,Route') || (content.includes(',') && content.includes('Date') && content.includes('Route'))) {
          console.log('✅ CSV content detected!');
          
          // Save the CSV file
          const fileName = `${username}_ticks_${Date.now()}.csv`;
          const filePath = path.join(this.downloadPath, fileName);
          
          fs.writeFileSync(filePath, content);
          console.log(`CSV saved to: ${filePath}`);
          console.log(`CSV Preview (first 500 chars):`);
          console.log(content.substring(0, 500));
          
          return {
            success: true,
            filePath,
            content
          };
        }
        
        console.log('❌ Response does not appear to be valid CSV content');
        
      } catch (error) {
        if (error.response) {
          console.log(`URL ${url} failed: ${error.message}`);
        } else if (error.code === 'ECONNABORTED') {
          console.log(`URL ${url} failed: timeout of 180000ms exceeded`);
        } else {
          console.log(`URL ${url} failed: ${error.message}`);
        }
      }
    }
    
    console.log('❌ All CSV URLs failed');
    return false;
  }

  // Extract tick data from HTML
  extractTicksFromHTML(html, username) {
    try {
      const ticks = [];
      
      // Look for tick patterns in the HTML
      const tickPatterns = [
        // Pattern for tick entries
        /<tr[^>]*class="[^"]*tick[^"]*"[^>]*>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>([^<]+)<\/td>/gs,
        // Alternative pattern
        /<div[^>]*class="[^"]*tick[^"]*"[^>]*>.*?<span[^>]*class="[^"]*route[^"]*"[^>]*>([^<]+)<\/span>.*?<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/gs
      ];

      for (const pattern of tickPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const route = match[1]?.trim();
          const date = match[2]?.trim();
          const rating = match[3]?.trim() || '';
          
          if (route && date) {
            ticks.push({
              date: date,
              route: route,
              rating: rating,
              notes: '',
              url: '',
              pitches: '1',
              location: '',
              avgStars: '',
              yourStars: '',
              style: '',
              leadStyle: '',
              routeType: '',
              yourRating: '',
              length: '',
              ratingCode: ''
            });
          }
        }
      }

      // If no structured patterns found, try to extract from general content
      if (ticks.length === 0) {
        // Look for route names and dates in the content
        const routeMatches = html.match(/<a[^>]*href="[^"]*\/route\/[^"]*"[^>]*>([^<]+)<\/a>/g);
        const dateMatches = html.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g);
        
        if (routeMatches && dateMatches) {
          routeMatches.forEach((routeMatch, index) => {
            const route = routeMatch.match(/>([^<]+)</)?.[1]?.trim();
            const date = dateMatches[index] || 'Unknown';
            
            if (route) {
              ticks.push({
                date: date,
                route: route,
                rating: '',
                notes: '',
                url: '',
                pitches: '1',
                location: '',
                avgStars: '',
                yourStars: '',
                style: '',
                leadStyle: '',
                routeType: '',
                yourRating: '',
                length: '',
                ratingCode: ''
              });
            }
          });
        }
      }

      console.log(`Extracted ${ticks.length} ticks from HTML`);
      return ticks;
      
    } catch (error) {
      console.log('Error extracting ticks from HTML:', error.message);
      return [];
    }
  }

  // Convert tick data to CSV format
  convertTicksToCSV(ticks) {
    const headers = 'Date,Route,Rating,Notes,URL,Pitches,Location,"Avg Stars","Your Stars",Style,"Lead Style","Route Type","Your Rating",Length,"Rating Code"';
    const rows = ticks.map(tick => 
      `"${tick.date}","${tick.route}","${tick.rating}","${tick.notes}","${tick.url}","${tick.pitches}","${tick.location}","${tick.avgStars}","${tick.yourStars}","${tick.style}","${tick.leadStyle}","${tick.routeType}","${tick.yourRating}","${tick.length}","${tick.ratingCode}"`
    );
    
    return headers + '\n' + rows.join('\n');
  }

  async extractTicksFromPage(userUrl) {
    try {
      console.log(`=== EXTRACTING TICKS FROM PAGE: ${userUrl} ===`);
      
      const response = await axios.get(userUrl, {
        headers: BROWSER_HEADERS,
        timeout: 180000
      });

      const html = response.data;
      
      // Look for tick data in the HTML
      const tickPatterns = [
        /<a[^>]*href="[^"]*\/user\/[^"]*"[^>]*>([^<]+)<\/a>/g,
        /<td[^>]*>([^<]*[a-zA-Z][^<]*)<\/td>/g,
        /(\d{1,2}\/\d{1,2}\/\d{4})/g,
        /(\d{4}-\d{2}-\d{2})/g
      ];

      const ticks = [];
      
      // Extract user names and dates
      const userMatches = html.match(/<a[^>]*href="[^"]*\/user\/[^"]*"[^>]*>([^<]+)<\/a>/g);
      if (userMatches) {
        userMatches.forEach(match => {
          const userMatch = match.match(/>([^<]+)</);
          if (userMatch) {
            const user = userMatch[1].trim();
            if (user && user.length > 0 && user.length < 50) {
              ticks.push({
                user: user,
                date: 'Unknown',
                source: 'html-extraction'
              });
            }
          }
        });
      }

      // Look for date patterns
      const dateMatches = html.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g);
      if (dateMatches) {
        console.log(`Found ${dateMatches.length} date matches:`, dateMatches.slice(0, 10));
      }

      console.log(`Extracted ${ticks.length} potential ticks from HTML`);
      
      if (ticks.length > 0) {
        // Remove duplicates
        const uniqueTicks = ticks.filter((tick, index, self) => 
          index === self.findIndex(t => t.user === tick.user)
        );
        
        console.log(`Unique ticks: ${uniqueTicks.length}`);
        console.log('Sample ticks:');
        uniqueTicks.slice(0, 10).forEach(tick => {
          console.log(`  ${tick.user} - ${tick.date}`);
        });
        
        return {
          success: true,
          ticks: uniqueTicks,
          source: 'html-extraction'
        };
      }
      
      return false;
      
    } catch (error) {
      console.error('Error extracting ticks from page:', error.message);
      return false;
    }
  }
}

module.exports = CSVAPI; 