import os
import requests
from bs4 import BeautifulSoup
import re

def create_image_folder():
    if not os.path.exists('public/images'):
        os.makedirs('public/images')
        print("Created 'public/images' folder")

def get_logo_url(url):
    try:
        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Look for logo in different possible locations
        logo = None
        
        # Try to find logo in img tags
        img_tags = soup.find_all('img')
        for img in img_tags:
            if any(keyword in img.get('alt', '').lower() for keyword in ['logo', 'brand']):
                logo = img.get('src')
                break
        
        # If no logo found in img tags, try to find in SVG elements
        if not logo:
            svg_tags = soup.find_all('svg')
            if svg_tags:
                # Save the SVG content directly
                return svg_tags[0].prettify()
        
        return logo
    except Exception as e:
        print(f"Error scraping {url}: {str(e)}")
        return None

def save_logo(url, filename):
    try:
        # If the content is already SVG markup
        if url.startswith('<svg'):
            with open(f'public/images/{filename}', 'w', encoding='utf-8') as f:
                f.write(url)
            print(f"Successfully saved {filename}")
            return

        # If it's a URL
        if url.startswith(('http://', 'https://')):
            response = requests.get(url)
            response.raise_for_status()
            content = response.content
        else:
            print(f"Invalid URL format: {url}")
            return

        # Save the logo
        with open(f'public/images/{filename}', 'wb') as f:
            f.write(content)
        print(f"Successfully saved {filename}")
    except Exception as e:
        print(f"Error saving {filename}: {str(e)}")

def main():
    create_image_folder()
    
    websites = [
        ('https://luih.com', 'luih_logo.svg'),
        ('https://invisto.us', 'invisto_logo.svg')
    ]
    
    for url, filename in websites:
        print(f"\nProcessing {url}...")
        logo_content = get_logo_url(url)
        
        if logo_content:
            # If the logo URL is relative, make it absolute
            if isinstance(logo_content, str) and not logo_content.startswith(('<svg', 'http://', 'https://')):
                logo_content = f"{url.rstrip('/')}/{logo_content.lstrip('/')}"
            
            save_logo(logo_content, filename)
        else:
            print(f"Could not find logo for {url}")

if __name__ == "__main__":
    main() 