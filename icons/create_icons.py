from PIL import Image, ImageDraw, ImageFont
import os

sizes = [16, 48, 128]

for size in sizes:
    # Create image with blue background
    img = Image.new('RGB', (size, size), color='#2383e2')
    draw = ImageDraw.Draw(img)
    
    # Draw white 'N' in center
    font_size = int(size * 0.6)
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        # Fallback to default font if arial not found
        font = ImageFont.load_default()
    
    # Calculate text position
    text = "N"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    position = ((size - text_width) // 2, (size - text_height) // 2)
    
    draw.text(position, text, fill='white', font=font)
    
    # Save icon
    img.save(f'icon{size}.png')
    print(f'Created icon{size}.png')

print("All icons created successfully!")