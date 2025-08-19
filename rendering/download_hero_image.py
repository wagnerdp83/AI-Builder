import os
import requests
from bs4 import BeautifulSoup

def create_image_folder():
    if not os.path.exists('public/images'):
        os.makedirs('public/images')
        print("Created 'public/images' folder")

def download_hero_image():
    try:
        # Create the images folder if it doesn't exist
        create_image_folder()

        # URL of the Preline example page
        url = "https://preline.co/examples/html/hero-with-image-and-reviews.html"
        
        # Get the page content
        response = requests.get(url)
        response.raise_for_status()
        
        # Parse the HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find the hero image
        hero_image = soup.find('img', {'alt': 'Hero Image'})
        
        if hero_image and hero_image.get('src'):
            # Get the image URL
            image_url = hero_image['src']
            
            # If the URL is relative, make it absolute
            if not image_url.startswith(('http://', 'https://')):
                image_url = f"https://preline.co{image_url}"
            
            # Download the image
            image_response = requests.get(image_url)
            image_response.raise_for_status()
            
            # Save the image
            with open('public/images/hero-image.png', 'wb') as f:
                f.write(image_response.content)
            print("Successfully downloaded hero image")
        else:
            print("Could not find hero image on the page")
            
    except Exception as e:
        print(f"Error downloading hero image: {str(e)}")

if __name__ == "__main__":
    download_hero_image() 