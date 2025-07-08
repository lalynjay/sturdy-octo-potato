const CSVAPI = require('./src/csv-api');

async function testCSVAPI() {
  const csvApi = new CSVAPI();
  
  try {
    console.log('=== TESTING CSV API APPROACH ===');
    
    // Extract user ID and username from the URL
    const userUrl = 'https://www.mountainproject.com/user/110713768/crag-cat/ticks';
    const urlMatch = userUrl.match(/\/user\/(\d+)\/([^\/]+)/);
    
    if (!urlMatch) {
      console.log('Could not parse user ID and username from URL');
      return;
    }
    
    const userId = urlMatch[1];
    const username = urlMatch[2];
    
    console.log(`User ID: ${userId}`);
    console.log(`Username: ${username}`);
    
    // First, try to download CSV directly
    console.log('\n--- TRYING DIRECT CSV DOWNLOAD ---');
    const csvResult = await csvApi.downloadUserTicksCSV(userId, username);
    
    if (csvResult && csvResult.success) {
      console.log('✅ Direct CSV download successful!');
      return;
    }
    
    // If CSV download fails, try to extract from the page
    console.log('\n--- TRYING PAGE EXTRACTION ---');
    const pageResult = await csvApi.extractTicksFromPage(userUrl);
    
    if (pageResult && pageResult.success) {
      console.log('✅ Page extraction successful!');
      console.log(`Found ${pageResult.ticks.length} ticks`);
      
      // Save the extracted data as a simple CSV
      const csvContent = ['User,Date,Source\n'];
      pageResult.ticks.forEach(tick => {
        csvContent.push(`${tick.user},${tick.date},${tick.source}\n`);
      });
      
      const fileName = `${username}_extracted_ticks_${Date.now()}.csv`;
      const filePath = require('path').join(csvApi.downloadPath, fileName);
      
      require('fs').writeFileSync(filePath, csvContent.join(''));
      console.log(`Extracted data saved to: ${filePath}`);
      
      return;
    }
    
    console.log('❌ Both methods failed');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testCSVAPI(); 