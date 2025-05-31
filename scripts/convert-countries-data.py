#!/usr/bin/env python3
"""
Convert countries data from various formats to CSV
Usage: python3 convert-countries-data.py
"""

# If you have data in this format from the eToro page, paste it here:
raw_data = """
# Example format - replace with your actual data:
# JeppeKirkBonde,United Arab Emirates
# thomaspj,United Kingdom
# CPHequities,Denmark
# FundManagerZech,Australia
# Add your data here...
"""

# Or if you have a different format, modify this script accordingly

def parse_country_data(data):
    """Parse country data and create mappings"""
    country_to_id = {}
    username_to_country = {}
    
    # Known mappings
    known_mappings = {
        'Greece': 82,
        'United Kingdom': 218,
        'United Arab Emirates': 217,
        'Denmark': 57,
        'Australia': 12
    }
    
    lines = data.strip().split('\n')
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
            
        parts = line.split(',')
        if len(parts) == 2:
            username, country = parts
            username = username.strip()
            country = country.strip()
            username_to_country[username] = country
            
            # If we know the country ID, track it
            if country in known_mappings:
                country_to_id[country] = known_mappings[country]
    
    return username_to_country, country_to_id

def save_results(username_to_country, country_to_id):
    """Save the results to files"""
    
    # Save username -> country mapping
    with open('username_countries.csv', 'w') as f:
        f.write('Username,Country\n')
        for username, country in sorted(username_to_country.items()):
            f.write(f'{username},{country}\n')
    
    # Save country -> ID mapping
    with open('country_ids.csv', 'w') as f:
        f.write('CountryID,CountryName\n')
        for country, country_id in sorted(country_to_id.items(), key=lambda x: x[1]):
            f.write(f'{country_id},{country}\n')
    
    print(f"Saved {len(username_to_country)} username mappings to username_countries.csv")
    print(f"Saved {len(country_to_id)} country ID mappings to country_ids.csv")

if __name__ == '__main__':
    # Parse the data
    username_to_country, country_to_id = parse_country_data(raw_data)
    
    # Print summary
    print(f"Found {len(username_to_country)} users")
    print(f"Found {len(set(username_to_country.values()))} unique countries")
    
    # Show sample
    if username_to_country:
        print("\nSample data:")
        for i, (username, country) in enumerate(list(username_to_country.items())[:5]):
            print(f"  {username} -> {country}")
    
    # Save results
    if username_to_country:
        save_results(username_to_country, country_to_id)
    else:
        print("\nNo data found! Please add your data to the raw_data variable in this script.")