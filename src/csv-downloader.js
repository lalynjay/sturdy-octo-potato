const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class CSVDownloader {
  constructor() {
    this.browser = null;
    this.page = null;
    this.downloadPath = path.join(__dirname, '..', 'downloads');
  }

  async initialize() {
    try {
      // Create downloads directory if it doesn't exist
      if (!fs.existsSync(this.downloadPath)) {
        fs.mkdirSync(this.downloadPath, { recursive: true });
      }

      console.log('=== INITIALIZING CSV DOWNLOADER ===');
      
      // Launch browser with download settings
      this.browser = await puppeteer.launch({
        headless: false, // Set to true in production
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set download behavior
      await this.page._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: this.downloadPath
      });

      console.log('Browser initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize browser:', error.message);
      return false;
    }
  }

  async downloadUserTicks(userUrl) {
    try {
      console.log(`=== DOWNLOADING TICKS FROM: ${userUrl} ===`);
      
      // Navigate to the user's tick page
      await this.page.goto(userUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      console.log('Page loaded successfully');

      // Wait for the page to fully load
      await this.page.waitForTimeout(3000);

      // Look for the Export CSV button/link
      console.log('Looking for Export CSV button...');
      
      // Try multiple selectors for the export button
      const exportSelectors = [
        'a[href*="export"]',
        'a:contains("Export CSV")',
        'button:contains("Export CSV")',
        '[data-export="csv"]',
        'a[href*="csv"]',
        '.export-csv',
        '#export-csv'
      ];

      let exportButton = null;
      for (const selector of exportSelectors) {
        try {
          exportButton = await this.page.$(selector);
          if (exportButton) {
            console.log(`Found export button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!exportButton) {
        // Try to find by text content
        console.log('Trying to find export button by text content...');
        exportButton = await this.page.evaluateHandle(() => {
          const elements = Array.from(document.querySelectorAll('a, button'));
          return elements.find(el => 
            el.textContent.toLowerCase().includes('export') || 
            el.textContent.toLowerCase().includes('csv')
          );
        });
      }

      if (!exportButton) {
        console.log('Export CSV button not found. Available links:');
        const links = await this.page.evaluate(() => {
          return Array.from(document.querySelectorAll('a')).map(a => ({
            text: a.textContent.trim(),
            href: a.href
          }));
        });
        links.forEach(link => console.log(`  ${link.text} -> ${link.href}`));
        return false;
      }

      console.log('Clicking Export CSV button...');
      
      // Click the export button
      await exportButton.click();
      
      // Wait for download to start
      console.log('Waiting for download to complete...');
      await this.page.waitForTimeout(5000);

      // Check if file was downloaded
      const files = fs.readdirSync(this.downloadPath);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      if (csvFiles.length > 0) {
        const latestFile = csvFiles.sort().pop();
        const filePath = path.join(this.downloadPath, latestFile);
        console.log(`CSV downloaded successfully: ${filePath}`);
        
        // Read and parse the CSV
        const csvContent = fs.readFileSync(filePath, 'utf8');
        console.log(`CSV content preview (first 500 chars):`);
        console.log(csvContent.substring(0, 500));
        
        return {
          success: true,
          filePath: filePath,
          content: csvContent
        };
      } else {
        console.log('No CSV file found in downloads directory');
        return false;
      }

    } catch (error) {
      console.error('Error downloading CSV:', error.message);
      return false;
    }
  }

  async downloadRouteTicks(routeUrl) {
    try {
      console.log(`=== DOWNLOADING ROUTE TICKS FROM: ${routeUrl} ===`);
      
      // Navigate to the route page
      await this.page.goto(routeUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      console.log('Route page loaded successfully');

      // Look for tick data or export options
      console.log('Looking for tick data or export options...');
      
      // Check if there's a tick section
      const tickSection = await this.page.evaluate(() => {
        const sections = Array.from(document.querySelectorAll('div, section'));
        return sections.find(section => 
          section.textContent.toLowerCase().includes('tick') ||
          section.textContent.toLowerCase().includes('climb') ||
          section.textContent.toLowerCase().includes('recent')
        );
      });

      if (tickSection) {
        console.log('Found tick section, extracting data...');
        
        // Extract tick data from the page
        const tickData = await this.page.evaluate(() => {
          const ticks = [];
          
          // Look for user links that might indicate recent climbs
          const userLinks = document.querySelectorAll('a[href*="/user/"]');
          userLinks.forEach(link => {
            const user = link.textContent.trim();
            const parent = link.parentElement;
            const text = parent.textContent;
            
            // Look for date patterns
            const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|today|yesterday|recent)/i);
            const date = dateMatch ? dateMatch[1] : 'Unknown';
            
            if (user && user.length > 0 && user.length < 50) {
              ticks.push({
                user: user,
                date: date,
                notes: text.substring(0, 100)
              });
            }
          });
          
          return ticks;
        });

        console.log(`Extracted ${tickData.length} ticks from page`);
        return {
          success: true,
          ticks: tickData,
          source: 'page-extraction'
        };
      } else {
        console.log('No tick section found on route page');
        return false;
      }

    } catch (error) {
      console.error('Error downloading route ticks:', error.message);
      return false;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('Browser closed');
    }
  }
}

module.exports = CSVDownloader; 