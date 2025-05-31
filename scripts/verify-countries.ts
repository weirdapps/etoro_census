import { getUsersDetailsByUsernames } from '../src/lib/services/user-service';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

// List of users with KNOWN countries (that we need to verify)
// Format: username -> expected country
const knownUsers: Record<string, string> = {
  // Add users here whose countries you know for certain
  // Example:
  // 'username': 'Country Name',
  'plessas': 'Greece', // We know this is Greece (82)
  
  // Add more known users here after checking their profiles
  // when NOT logged in to see their country
};

// Users to check (add usernames you want to investigate)
const usersToCheck = [
  // Top investors from different regions
  'JeppeKirkBonde',   // Need to check profile
  'thomaspj',         // Need to check profile
  'CPHequities',      // Might be Denmark?
  'jaynemesis',       // Need to check profile
  'FundManagerZech',  // Might be Austria?
  'Napoleon-X',       // Need to check profile
  'AmitKup',          // Need to check profile
  'rubymza',          // Need to check profile
  'defense_investor', // Need to check profile
  'misterg23',        // Need to check profile
  // Add more as needed
];

async function verifyCountries() {
  console.log('Country Verification Tool');
  console.log('========================\n');
  
  // First, verify known users
  if (Object.keys(knownUsers).length > 0) {
    console.log('Verifying known users...\n');
    const knownUsernames = Object.keys(knownUsers);
    
    try {
      const details = await getUsersDetailsByUsernames(knownUsernames);
      
      console.log('Username'.padEnd(20) + 'Expected'.padEnd(15) + 'Country ID');
      console.log('-'.repeat(50));
      
      for (const [username, expectedCountry] of Object.entries(knownUsers)) {
        const userDetail = details.get(username);
        const countryId = userDetail?.country || 'null';
        console.log(
          username.padEnd(20) + 
          expectedCountry.padEnd(15) + 
          countryId
        );
      }
    } catch (error) {
      console.error('Error fetching known users:', error);
    }
  }
  
  // Then check unknown users
  if (usersToCheck.length > 0) {
    console.log('\n\nChecking unknown users...\n');
    console.log('To verify these, visit their profiles when NOT logged in:');
    console.log('https://www.etoro.com/people/USERNAME\n');
    
    try {
      const details = await getUsersDetailsByUsernames(usersToCheck);
      
      console.log('Username'.padEnd(20) + 'Country ID' + '  Profile URL');
      console.log('-'.repeat(70));
      
      for (const username of usersToCheck) {
        const userDetail = details.get(username);
        const countryId = userDetail?.country || 'null';
        const profileUrl = `https://www.etoro.com/people/${username}`;
        console.log(
          username.padEnd(20) + 
          countryId.toString().padEnd(10) + 
          profileUrl
        );
      }
      
      console.log('\nInstructions:');
      console.log('1. Open each profile URL in an incognito/private window (not logged in)');
      console.log('2. Look for the country in the "About" section or breadcrumbs');
      console.log('3. Add confirmed mappings to the knownUsers object above');
      console.log('4. Re-run this script to verify');
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }
  
  // Show current confirmed mappings
  console.log('\n\nCurrent confirmed mappings:');
  console.log('Country ID -> Country Name');
  console.log('-'.repeat(30));
  console.log('82 -> Greece');
  console.log('218 -> United Kingdom');
  console.log('13 -> Austria (from API docs)');
  console.log('79 -> Germany (from API docs)');
}

// Run verification
verifyCountries().catch(console.error);