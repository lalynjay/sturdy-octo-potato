const CSVIntegration = require('./src/csv-integration');

async function testNakedEdgeTicks() {
  const csvIntegration = new CSVIntegration();
  
  try {
    console.log('=== TESTING NAKED EDGE TICKS FROM CSV ===');
    
    // Test with Crag Cat's data
    const userId = '110713768';
    const username = 'crag-cat';
    const routeName = 'The Naked Edge';
    
    console.log(`Looking for ticks of "${routeName}" by ${username}...`);
    
    // Get recent ticks for The Naked Edge
    const routeTicks = await csvIntegration.getRecentTicksForRoute(routeName, userId, username, 365); // Last year
    
    if (routeTicks.length > 0) {
      console.log(`\n✅ Found ${routeTicks.length} tick(s) for The Naked Edge:`);
      routeTicks.forEach((tick, index) => {
        console.log(`\n${index + 1}. Date: ${tick.date}`);
        console.log(`   Route: ${tick.route}`);
        console.log(`   Rating: ${tick.rating}`);
        console.log(`   Notes: ${tick.notes}`);
        console.log(`   Location: ${tick.location}`);
      });
    } else {
      console.log(`\n❌ No recent ticks found for The Naked Edge`);
      
      // Let's check all recent ticks to see what they've been climbing
      console.log('\n--- Checking all recent ticks ---');
      const allRecentTicks = await csvIntegration.getAllRecentTicks(userId, username, 30); // Last 30 days
      
      if (allRecentTicks.length > 0) {
        console.log(`\nRecent climbs by ${username} (last 30 days):`);
        allRecentTicks.slice(0, 10).forEach((tick, index) => {
          console.log(`${index + 1}. ${tick.date} - ${tick.route} (${tick.rating})`);
        });
      }
    }
    
    // Also check for any routes that might be similar to The Naked Edge
    console.log('\n--- Checking for similar routes ---');
    const result = await csvIntegration.downloadUserTicks(userId, username);
    
    if (result && result.success) {
      const similarRoutes = result.ticks.filter(tick => 
        tick.route.toLowerCase().includes('naked') ||
        tick.route.toLowerCase().includes('edge') ||
        tick.route.toLowerCase().includes('redgarden') ||
        tick.route.toLowerCase().includes('eldorado')
      );
      
      if (similarRoutes.length > 0) {
        console.log(`\nFound ${similarRoutes.length} routes that might be related:`);
        similarRoutes.forEach((tick, index) => {
          console.log(`${index + 1}. ${tick.date} - ${tick.route} (${tick.rating}) - ${tick.location}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testNakedEdgeTicks(); 