import { getUsersDetailsByUsernames } from '../src/lib/services/user-service';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

async function testCountryFetch() {
  console.log('Testing country data fetch from eToro API...\n');
  
  // Test with known investors
  const testUsernames = [
    'plessas',         // Greece (from your screenshot)
    'jeppekirkbonde',  // UAE
    'thomaspj',        // UK
    'cphequities',     // Denmark
    'rubymza',
    'fundmanagerzech',
    'jaynemesis',
    'amitkup',
    'napoleon-x'
  ];
  
  try {
    console.log('Fetching user details for:', testUsernames.join(', '));
    
    const userDetails = await getUsersDetailsByUsernames(testUsernames);
    
    console.log('\nCountry IDs found:');
    console.log('Username'.padEnd(20) + 'Country ID');
    console.log('-'.repeat(35));
    
    for (const username of testUsernames) {
      const details = userDetails.get(username);
      if (details) {
        console.log(`${username.padEnd(20)}${details.country || 'null'}`);
      } else {
        console.log(`${username.padEnd(20)}(no details)`);
      }
    }
    
    // Get unique country IDs
    const countryIds = new Set<number>();
    userDetails.forEach(user => {
      if (user.country) countryIds.add(user.country);
    });
    
    console.log('\nUnique country IDs found:', Array.from(countryIds).sort((a, b) => a - b).join(', '));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testCountryFetch().catch(console.error);