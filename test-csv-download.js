const CSVDownloader = require('./src/csv-downloader');

async function testCSVDownload() {
  const downloader = new CSVDownloader();
  
  try {
    console.log('Starting CSV download test...');
    
    // Initialize the browser
    const initialized = await downloader.initialize();
    if (!initialized) {
      console.log('Failed to initialize browser');
      return;
    }
    
    // Test with the user tick URL you provided
    const userUrl = 'https://www.mountainproject.com/user/110713768/crag-cat/ticks';
    
    console.log(`Testing with URL: ${userUrl}`);
    
    // Try to download user ticks
    const result = await downloader.downloadUserTicks(userUrl);
    
    if (result && result.success) {
      console.log('✅ CSV download successful!');
      console.log(`File saved to: ${result.filePath}`);
      console.log('Content preview:');
      console.log(result.content.substring(0, 1000));
    } else {
      console.log('❌ CSV download failed, trying route ticks...');
      
      // Try with The Naked Edge route
      const routeUrl = 'https://www.mountainproject.com/route/105748786/the-naked-edge';
      const routeResult = await downloader.downloadRouteTicks(routeUrl);
      
      if (routeResult && routeResult.success) {
        console.log('✅ Route tick extraction successful!');
        console.log(`Found ${routeResult.ticks.length} ticks`);
        console.log('Sample ticks:');
        routeResult.ticks.slice(0, 5).forEach(tick => {
          console.log(`  ${tick.user} - ${tick.date}: ${tick.notes}`);
        });
      } else {
        console.log('❌ Both methods failed');
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    // Close the browser
    await downloader.close();
  }
}

// Run the test
testCSVDownload(); 