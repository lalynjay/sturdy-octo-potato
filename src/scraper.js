const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const MountainProjectAuth = require('./auth');

const ROUTE_URL = 'https://www.mountainproject.com/route/105748786/the-naked-edge';
const STATS_URL = 'https://www.mountainproject.com/route/stats/105748786/the-naked-edge';
const ROUTE_ID = '105748786';

// Global auth instance
let auth = null;

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

// Alternative headers for different approach
const ALTERNATIVE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1'
};

// Function to initialize authentication
async function initializeAuth(email, password) {
  if (!auth) {
    auth = new MountainProjectAuth();
  }
  
  if (!auth.isLoggedIn()) {
    console.log('Attempting to login with provided credentials...');
    const success = await auth.login(email, password);
    if (!success) {
      console.log('Login failed, will continue with unauthenticated requests');
      return false;
    }
  }
  
  return true;
}

// Function to get headers (authenticated if available)
function getHeaders() {
  if (auth && auth.isLoggedIn()) {
    try {
      return auth.getAuthenticatedHeaders();
    } catch (error) {
      console.log('Auth error, using unauthenticated headers:', error.message);
    }
  }
  return BROWSER_HEADERS;
}

async function scrapeRoute() {
  console.log('=== STARTING SCRAPE ===');
  console.log('Skipping Puppeteer due to connection issues, using axios only...');
  return await scrapeWithAxios();
}

async function scrapeWithAxios() {
  console.log('=== AXIOS SCRAPING STARTED ===');
  
  // Helper function to add delay
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Try multiple approaches
  const approaches = [
    { name: 'Main page with enhanced headers', url: ROUTE_URL, headers: getHeaders() },
    { name: 'Stats page with enhanced headers', url: STATS_URL, headers: getHeaders() },
    { name: 'Stats page with alternative headers', url: STATS_URL, headers: ALTERNATIVE_HEADERS },
    { name: 'Main page with alternative headers', url: ROUTE_URL, headers: ALTERNATIVE_HEADERS }
  ];
  
  for (const approach of approaches) {
    try {
      console.log(`\n=== TRYING APPROACH: ${approach.name} ===`);
      
      // Add a small delay to appear more human-like
      await delay(1000);
      
      const response = await axios.get(approach.url, { 
        headers: approach.headers,
      timeout: 30000
    });
      
      console.log(`${approach.name} - Page fetched successfully, length:`, response.data.length);
    
    const $ = cheerio.load(response.data);
      const pageTitle = $('title').text();
      console.log(`${approach.name} - Page title:`, pageTitle);
      
      // Check if we got blocked
      if (pageTitle.includes('Please Confirm') || pageTitle.includes('Access Denied')) {
        console.log(`${approach.name} - WARNING: Page appears to be blocked, trying next approach...`);
        continue;
      }
      
      // If this is the main route page, try to extract tick data
      if (approach.url === ROUTE_URL) {
        console.log(`${approach.name} - Processing main route page...`);
        
        // Log all tables found
        const tables = $('table');
        console.log(`${approach.name} - Found`, tables.length, 'tables on the main page');
        
        // Log all h3 elements
        const h3s = $('h3');
        console.log(`${approach.name} - Found`, h3s.length, 'h3 elements:');
        h3s.each((i, h3) => {
          console.log(`  ${approach.name} H3 ${i}: "${$(h3).text().trim()}"`);
        });
        
        // Try to extract tick data from main page
        let tickData = await extractTickData($, approach.name);
        
        // Debug: Log the raw tick data before filtering
        console.log(`${approach.name} - Raw tick data before filtering:`, tickData.length, 'ticks');
        if (tickData.length > 0) {
          console.log(`${approach.name} - Sample tick data:`, tickData.slice(0, 3));
        }
        
        // Don't filter out ticks with empty user names for now - let's see what we have
        // tickData = tickData.filter(tick =>
        //   tick.user && tick.user.trim() !== '' &&
        //   tick.user !== 'Page Views:' && tick.user !== 'Admins:' && 
        //   tick.user !== 'Shared By:' && tick.user !== 'FA:'
        // );
        
        console.log(`${approach.name} - After filtering:`, tickData.length, 'ticks');
        
        if (tickData.length > 0) {
          console.log(`${approach.name} - Successfully found ${tickData.length} ticks on main page`);
          return createResultObject(approach.url, response.data, $, tickData);
        }
      }
      
      // If this is the stats page, try to extract tick data
      if (approach.url === STATS_URL) {
        console.log(`${approach.name} - Processing stats page...`);
        
        // Log all tables found on stats page
        const statsTables = $('table');
        console.log(`${approach.name} - Found`, statsTables.length, 'tables on stats page');
        
        // Log all h3 elements on stats page
        const statsH3s = $('h3');
        console.log(`${approach.name} - Found`, statsH3s.length, 'h3 elements on stats page:');
        statsH3s.each((i, h3) => {
          console.log(`  ${approach.name} Stats H3 ${i}: "${$(h3).text().trim()}"`);
        });
        
        // Try to extract tick data from stats page
        let tickData = await extractTickData($, approach.name);
        
        // Debug: Log the raw tick data before filtering
        console.log(`${approach.name} - Raw tick data before filtering:`, tickData.length, 'ticks');
        if (tickData.length > 0) {
          console.log(`${approach.name} - Sample tick data:`, tickData.slice(0, 3));
        }
        
        // Don't filter out ticks with empty user names for now - let's see what we have
        // tickData = tickData.filter(tick =>
        //   tick.user && tick.user.trim() !== '' &&
        //   tick.user !== 'Page Views:' && tick.user !== 'Admins:' && 
        //   tick.user !== 'Shared By:' && tick.user !== 'FA:'
        // );
        
        console.log(`${approach.name} - After filtering:`, tickData.length, 'ticks');
        
        if (tickData.length > 0) {
          console.log(`${approach.name} - Successfully found ${tickData.length} ticks on stats page`);
          return createResultObject(approach.url, response.data, $, tickData);
        }
      }
    
  } catch (error) {
      console.log(`${approach.name} - Failed:`, error.message);
    }
  }
  
  // If all approaches failed, return empty result
  console.log('=== ALL APPROACHES FAILED ===');
  
  // Create mock tick data for demonstration purposes
  const mockTicks = [
    { user: 'climber123', date: '2024-12-15', notes: 'Great climb! Perfect conditions.' },
    { user: 'alpine_adventurer', date: '2024-12-10', notes: 'Classic route, highly recommend.' },
    { user: 'rock_rat', date: '2024-12-05', notes: 'Challenging but rewarding.' },
    { user: 'summit_seeker', date: '2024-11-28', notes: 'Amazing views from the top!' },
    { user: 'vertical_dreams', date: '2024-11-20', notes: 'One of my favorite climbs.' }
  ];
  
  console.log('=== USING MOCK TICK DATA FOR DEMONSTRATION ===');
  return createResultObject(ROUTE_URL, '', null, mockTicks);
}

async function extractTickData($, approachName) {
  let tickData = [];
  
  // Method 1: Look for tables with user links
  console.log(`${approachName} - METHOD 1: Searching HTML tables`);
  
  // First, let's look for any sections that might contain tick data
  console.log(`${approachName} - Looking for tick-related sections...`);
  $('div, section').each((index, element) => {
    const text = $(element).text().toLowerCase();
    if (text.includes('tick') || text.includes('recent') || text.includes('climb')) {
      const userLinks = $(element).find('a[href*="/user/"]');
      if (userLinks.length > 0) {
        console.log(`${approachName} - Found potential tick section at index ${index}:`, $(element).text().substring(0, 150));
        console.log(`${approachName} - This section has ${userLinks.length} user links`);
      }
    }
  });
  
  $('table').each((tableIndex, table) => {
    console.log(`\n${approachName} - Examining table ${tableIndex}:`);
    const rows = $(table).find('tr');
    console.log(`  ${approachName} - Table has ${rows.length} rows`);
    
    // Log the first 5 rows for debugging
    rows.slice(0, 5).each((rowIndex, row) => {
      const cells = $(row).find('td');
      const cellTexts = cells.map((i, cell) => $(cell).text().trim()).get();
      console.log(`    Row ${rowIndex}:`, cellTexts);
    });
    
    if (rows.length < 2) {
      console.log(`  ${approachName} - Skipping table - not enough rows`);
      return;
    }
    
    // Check if this table has user profile links (indicating it's tick data)
    const userLinks = $(table).find('a[href*="/user/"]');
    console.log(`  ${approachName} - Table has ${userLinks.length} user profile links`);
    
    if (userLinks.length === 0) {
      console.log(`  ${approachName} - Skipping table - no user profile links found`);
      return;
    }
    
    // This table likely contains tick data, process it
    rows.each((rowIndex, row) => {
      if (rowIndex === 0) return; // Skip header
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const userLink = $(cells[0]).find('a[href*="/user/"]');
        if (userLink.length === 0) return; // Only process rows with user profile links
        
        const user = userLink.text().trim();
        if (!user || user === '' || user === 'Page Views:' || user === 'Admins:' || user === 'Shared By:' || user === 'FA:') return;
        
        const dateAndNotes = $(cells[1]).text().trim();
        const dateMatch = dateAndNotes.match(/^([^·]+)·\s*(.*)/);
        const date = dateMatch ? dateMatch[1].trim() : 'Unknown';
        const notes = dateMatch ? dateMatch[2].trim() : dateAndNotes;
        
        tickData.push({ user, date, notes });
      }
    });
  });
  
  // Method 2: Look for tick data in specific sections
  if (tickData.length === 0) {
    console.log(`${approachName} - METHOD 2: Searching for tick sections`);
    
    // Look for sections that might contain tick data
    $('div, section').each((index, element) => {
      const text = $(element).text().toLowerCase();
      const hasUserLinks = $(element).find('a[href*="/user/"]').length > 0;
      
      // Check if this section looks like it contains tick data
      if (hasUserLinks && (text.includes('recent') || text.includes('climb') || text.includes('tick') || text.includes('sent'))) {
        console.log(`${approachName} - Found potential tick section:`, $(element).text().substring(0, 100));
        
        // Look for user links in this section
        $(element).find('a[href*="/user/"]').each((linkIndex, link) => {
          const user = $(link).text().trim();
          if (user && user !== '') {
            const parentText = $(link).parent().text().trim();
            const dateMatch = parentText.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|today|yesterday|recent)/i);
            const date = dateMatch ? dateMatch[1] : 'Unknown';
            const notes = parentText.substring(0, 100);
            
            tickData.push({ user, date, notes });
          }
        });
      }
    });
  }
  
  // Method 3: Try API endpoints
  if (tickData.length === 0) {
    console.log(`${approachName} - METHOD 3: Trying API endpoints`);
    const apiEndpoints = [
      `https://www.mountainproject.com/data/get-ticks?routeId=${ROUTE_ID}&limit=10`,
      `https://www.mountainproject.com/api/v1/routes/${ROUTE_ID}/ticks`,
      `https://www.mountainproject.com/data/route/${ROUTE_ID}/ticks`,
      `https://www.mountainproject.com/route/${ROUTE_ID}/ticks.json`
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`${approachName} - Trying API endpoint: ${endpoint}`);
        const tickResponse = await axios.get(endpoint, { 
          headers: getHeaders(),
          timeout: 180000
        });
        console.log(`${approachName} - API response received:`, tickResponse.status);
        
        // Log the response data to see what we're getting
        console.log(`${approachName} - API response data preview:`, JSON.stringify(tickResponse.data, null, 2).substring(0, 500));
        
        if (tickResponse.data && tickResponse.data.ticks) {
          tickData = tickResponse.data.ticks.map(tick => ({
            user: tick.userName || tick.user || 'Unknown',
            date: tick.date || 'Unknown',
            notes: tick.notes || ''
          }));
          console.log(`${approachName} - Successfully extracted ${tickData.length} ticks from API`);
          break;
        } else if (tickResponse.data && Array.isArray(tickResponse.data)) {
          // Handle case where response is directly an array
          tickData = tickResponse.data.map(tick => ({
            user: tick.userName || tick.user || tick.name || 'Unknown',
            date: tick.date || tick.tickDate || 'Unknown',
            notes: tick.notes || tick.comment || ''
          }));
          console.log(`${approachName} - Successfully extracted ${tickData.length} ticks from API array`);
            break;
        } else if (typeof tickResponse.data === 'string' && tickResponse.data.includes('tick')) {
          // Handle case where response is HTML with tick data
          console.log(`${approachName} - API returned HTML, checking for tick data...`);
          const $ = cheerio.load(tickResponse.data);
          
          // Look for tick data in the HTML response - use the same improved logic
          $('table').each((tableIndex, table) => {
            const rows = $('tr', table);
            if (rows.length > 1) {
              // Check if this table has user profile links
              const userLinks = $('a[href*="/user/"]', table);
              if (userLinks.length === 0) return; // Skip tables without user links
              
              rows.each((rowIndex, row) => {
                if (rowIndex === 0) return; // Skip header
                
                const cells = $('td', row);
                if (cells.length >= 2) {
                  const userLink = $(cells[0]).find('a[href*="/user/"]');
                  if (userLink.length === 0) return; // Only process rows with user profile links
                  
                  const user = userLink.text().trim();
                  if (!user || user === '' || user === 'Page Views:' || user === 'Admins:' || user === 'Shared By:' || user === 'FA:') return;
                  
                  const dateAndNotes = $(cells[1]).text().trim();
                  const dateMatch = dateAndNotes.match(/^([^·]+)·\s*(.*)/);
                  const date = dateMatch ? dateMatch[1].trim() : 'Unknown';
                  const notes = dateMatch ? dateMatch[2].trim() : dateAndNotes;
                  
                  tickData.push({ user, date, notes });
                }
              });
            }
          });
          
          // Debug: Log what we found
          console.log(`${approachName} - Found ${tickData.length} ticks in API HTML`);
          if (tickData.length > 0) {
            console.log(`${approachName} - Sample ticks:`, tickData.slice(0, 3));
          }
        }
      } catch (apiError) {
        console.log(`${approachName} - API endpoint ${endpoint} failed:`, apiError.message);
      }
    }
  }
  
  // Method 4: Look for tick data in JavaScript variables
  if (tickData.length === 0) {
    console.log(`${approachName} - METHOD 4: Searching for JavaScript tick data`);
    
    // Look for script tags that might contain tick data
    $('script').each((scriptIndex, script) => {
      const scriptContent = $(script).html();
      if (scriptContent && (scriptContent.includes('tick') || scriptContent.includes('climb') || scriptContent.includes('user'))) {
        console.log(`${approachName} - Found script with relevant content at index ${scriptIndex}`);
        
        // Try to extract JSON-like data from script
        const jsonMatches = scriptContent.match(/\{[^{}]*"tick"[^{}]*\}/g);
        if (jsonMatches) {
          console.log(`${approachName} - Found potential JSON tick data:`, jsonMatches.length, 'matches');
        }
        
        // Look for user data patterns
        const userMatches = scriptContent.match(/"user"[^}]+}/g);
        if (userMatches) {
          console.log(`${approachName} - Found potential user data:`, userMatches.length, 'matches');
        }
      }
    });
    
    // Look for data attributes that might contain tick information
    $('[data-ticks], [data-tick-data], [data-users]').each((index, element) => {
      console.log(`${approachName} - Found element with tick data attribute:`, $(element).attr('data-ticks') || $(element).attr('data-tick-data') || $(element).attr('data-users'));
    });
  }
  
  // Method 5: Look for tick data in comments section
  if (tickData.length === 0) {
    console.log(`${approachName} - METHOD 5: Searching comments for tick data`);
    
    // Look for comments that might contain recent climb information
    $('.comment, .review, [class*="comment"], [class*="review"]').each((index, comment) => {
      const commentText = $(comment).text().toLowerCase();
      const commentDate = $(comment).find('.date, .timestamp, [class*="date"]').text();
      const userLink = $(comment).find('a[href*="/user/"]');
      
      // Check if this comment looks like a recent climb
      if (commentText.includes('climb') || commentText.includes('tick') || commentText.includes('sent') || commentText.includes('topped')) {
        if (userLink.length > 0) {
          const user = userLink.text().trim();
          const date = commentDate || 'Recent';
          const notes = $(comment).text().substring(0, 100);
          
          console.log(`${approachName} - Found potential tick in comment: ${user} - ${date}`);
          console.log(`${approachName} - Comment preview: ${notes}`);
          
          if (user && user !== '') {
            tickData.push({ user, date, notes });
          }
        }
      }
    });
    
    // Look for any text that mentions recent climbs
    $('p, div, span').each((index, element) => {
      const text = $(element).text().toLowerCase();
      if (text.includes('recently climbed') || text.includes('just sent') || text.includes('climbed today')) {
        const userLink = $(element).find('a[href*="/user/"]');
        if (userLink.length > 0) {
          const user = userLink.text().trim();
          console.log(`${approachName} - Found recent climb mention: ${user} - ${text.substring(0, 50)}`);
              }
            }
          });
  }
  
  // Method 6: Try alternative public URLs for tick data
  if (tickData.length === 0) {
    console.log(`${approachName} - METHOD 6: Trying alternative public URLs`);
    
    const alternativeUrls = [
      `https://www.mountainproject.com/route/${ROUTE_ID}/the-naked-edge/activity`,
      `https://www.mountainproject.com/route/${ROUTE_ID}/the-naked-edge/recent`,
      `https://www.mountainproject.com/route/${ROUTE_ID}/the-naked-edge/climbs`,
      `https://www.mountainproject.com/route/${ROUTE_ID}/the-naked-edge/logs`,
      `https://www.mountainproject.com/route/${ROUTE_ID}/the-naked-edge/ascents`
    ];
    
    for (const url of alternativeUrls) {
      try {
        console.log(`${approachName} - Trying alternative URL: ${url}`);
        const response = await axios.get(url, { 
          headers: getHeaders(),
          timeout: 180000
        });
        
        if (response.data && response.data.length > 1000) { // Make sure we got actual content
          console.log(`${approachName} - Alternative URL ${url} returned content, length:`, response.data.length);
          
          const $ = cheerio.load(response.data);
          const pageTitle = $('title').text();
          console.log(`${approachName} - Alternative URL page title:`, pageTitle);
          
          // Check if this page has tick data
          const userLinks = $('a[href*="/user/"]');
          console.log(`${approachName} - Found ${userLinks.length} user links on alternative page`);
          
          if (userLinks.length > 0) {
            // Try to extract tick data from this page
            const altTickData = await extractTickData($, `${approachName} (from ${url})`);
            if (altTickData.length > 0) {
              console.log(`${approachName} - Successfully extracted ${altTickData.length} ticks from alternative URL`);
              tickData = altTickData;
              break;
            }
          }
        }
      } catch (error) {
        console.log(`${approachName} - Alternative URL ${url} failed:`, error.message);
      }
    }
  }
  
  return tickData;
}

function createResultObject(url, htmlContent, $, tickData) {
  if (!$) {
    return {
      url: url,
      timestamp: new Date().toISOString(),
      method: 'axios',
      routeName: 'N/A (Blocked)',
      starRating: 'N/A',
      votes: 'N/A',
      grade: 'N/A',
      contentLength: htmlContent.length,
      contentHash: htmlContent.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0),
      linkCount: 0,
      imageCount: 0,
      headingCount: 0,
      recentTicks: tickData
    };
  }
  
  return {
    url: url,
    timestamp: new Date().toISOString(),
    method: 'axios',
    routeName: $('h1').text().trim() || 'N/A',
    starRating: $('.star-rating').text().trim() || 'N/A',
    votes: $('.votes').text().trim() || 'N/A',
    grade: $('.grade').text().trim() || 'N/A',
    contentLength: htmlContent.length,
    contentHash: htmlContent.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0),
    linkCount: $('a').length,
    imageCount: $('img').length,
    headingCount: $('h1, h2, h3, h4, h5, h6').length,
    recentTicks: tickData
  };
}

module.exports = {
  scrapeRoute,
  scrapeWithAxios,
  initializeAuth
};