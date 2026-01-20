from PIL import Image
import os

TARGET_WIDTH = 1200
MAX_SIZE_KB = 100
PUBLIC_DIR = r"e:\SKIPQ\college-canteen-portal\public"

def optimize_image(filename):
    path = os.path.join(PUBLIC_DIR, filename)
    if not os.path.exists(path):
        print(f"File not found: {filename}")
        return

    try:
        with Image.open(path) as img:
            print(f"Optimizing {filename}...")
            # Calculate new size maintaining aspect ratio
            ratio = min(TARGET_WIDTH / img.width, 1.0)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            
            # Resize
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # Save optimization (overwrite or save as new if safer, but task implies overwrite or replace)
            # We will overwrite for this task as requested to fix LCP
            if filename.lower().endswith('.png'):
                # Optimize PNG
                img.save(path, "PNG", optimize=True)
            elif filename.lower().endswith(('.jpg', '.jpeg')):
                img.save(path, "JPEG", quality=85, optimize=True)
                
            print(f"Optimized {filename}")
            
    except Exception as e:
        print(f"Error optimizing {filename}: {e}")

# Optimize the large files identified
images_to_optimize = ["brand-logo.png", "final-logo.png", "logo-v1.png"]

for img in images_to_optimize:
    optimize_image(img)
