from PIL import Image
import os

def convert_to_avif(input_path, output_path, quality=80):
    """
    Convert an image to AVIF format using Pillow.
    
    Args:
        input_path (str): Path to the input image
        output_path (str): Path where the AVIF image will be saved
        quality (int): Quality of the output image (0-100)
    """
    try:
        # Open the image
        with Image.open(input_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                img = img.convert('RGB')
            
            # Save as AVIF
            img.save(output_path, format='AVIF', quality=quality)
            print(f"Successfully converted {input_path} to {output_path}")
            
    except Exception as e:
        print(f"Error converting image: {str(e)}")

def main():
    # Path to the hero image
    hero_image_path = "public/images/hero-image.png"
    avif_output_path = "public/images/hero-image.avif"
    
    # Check if the hero image exists
    if not os.path.exists(hero_image_path):
        print(f"Error: {hero_image_path} does not exist")
        return
    
    # Convert the image
    convert_to_avif(hero_image_path, avif_output_path)

if __name__ == "__main__":
    main() 