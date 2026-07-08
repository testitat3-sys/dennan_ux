import os
from PIL import Image

# Config
TARGET_MAX_DIMENSION = 2000
QUALITY_LEVEL = 80
SEARCH_PATHS = [
    r"c:\Users\HP\Desktop\dennan\dennan_ux\public",
    r"c:\Users\HP\Desktop\dennan\dennan_ux\storefront\src\assets\design_system"
]

def compress_image(file_path):
    orig_size = os.path.getsize(file_path)
    
    try:
        with Image.open(file_path) as img:
            fmt = img.format
            width, height = img.size
            mode = img.mode
            
            # Determine if resizing is needed
            needs_resize = max(width, height) > TARGET_MAX_DIMENSION
            if needs_resize:
                ratio = TARGET_MAX_DIMENSION / float(max(width, height))
                new_size = (int(width * ratio), int(height * ratio))
                img_to_save = img.resize(new_size, Image.Resampling.LANCZOS)
                action = f"Resized {width}x{height} -> {new_size[0]}x{new_size[1]}"
            else:
                img_to_save = img
                action = "Kept dimensions"
            
            # Temporary path for compression check
            temp_path = file_path + ".tmp"
            
            # Save based on extension and PIL detected format
            ext = os.path.splitext(file_path)[1].lower()
            
            if ext == '.webp':
                if fmt == 'PNG':
                    # Mismatch: PNG file with .webp extension. Convert to true WebP!
                    img_to_save.save(temp_path, format='WEBP', quality=QUALITY_LEVEL, method=6)
                    action += " + Converted fake WebP(PNG) to true WebP"
                else:
                    # True WebP
                    img_to_save.save(temp_path, format='WEBP', quality=QUALITY_LEVEL, method=6)
                    action += " + Compressed WebP"
            elif ext == '.png':
                if fmt == 'JPEG':
                    # Mismatch: JPEG file with .png extension. Keep extension but save as JPEG to preserve size.
                    img_to_save.save(temp_path, format='JPEG', quality=QUALITY_LEVEL)
                    action += " + Compressed JPEG (kept .png ext)"
                else:
                    # True PNG
                    if img_to_save.mode != 'P':
                        # Quantize to palette (8-bit) to drastically reduce size for web designs
                        quantized = img_to_save.quantize(colors=256)
                        quantized.save(temp_path, format='PNG', optimize=True)
                        action += " + Quantized to Palette PNG"
                    else:
                        img_to_save.save(temp_path, format='PNG', optimize=True)
                        action += " + Optimized PNG"
            elif ext in ('.jpg', '.jpeg', '.jfif'):
                img_to_save.save(temp_path, format='JPEG', quality=QUALITY_LEVEL, optimize=True)
                action += " + Compressed JPEG"
            else:
                # Unsupported format for custom optimization, default saving
                img_to_save.save(temp_path, optimize=True)
                action += " + Default compressed"
                
            new_size = os.path.getsize(temp_path)
            
            # Only overwrite if the new file is actually smaller
            if new_size < orig_size:
                os.replace(temp_path, file_path)
                reduction = (orig_size - new_size) / orig_size * 100
                print(f"Optimized: {os.path.basename(file_path)}")
                print(f"  Action:     {action}")
                print(f"  Size:       {orig_size/1024.0:.1f} KB -> {new_size/1024.0:.1f} KB ({reduction:.1f}% reduction)\n")
                return True, orig_size, new_size, action
            else:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                print(f"Skipped:   {os.path.basename(file_path)} (Compression didn't reduce size: {orig_size/1024.0:.1f} KB vs {new_size/1024.0:.1f} KB)\n")
                return False, orig_size, orig_size, "Skipped (no improvement)"
                
    except Exception as e:
        print(f"Error processing {file_path}: {e}\n")
        return False, orig_size, orig_size, f"Error: {e}"

def main():
    print("Starting Dennan UX Image Compression...\n")
    image_extensions = ('.png', '.jpg', '.jpeg', '.webp', '.jfif')
    
    total_orig = 0
    total_new = 0
    optimized_count = 0
    skipped_count = 0
    
    for base_path in SEARCH_PATHS:
        if not os.path.exists(base_path):
            print(f"Warning: path not found: {base_path}")
            continue
            
        for root, dirs, files in os.walk(base_path):
            # Skip node_modules or build dist directories
            if 'node_modules' in root or 'dist' in root:
                continue
            for file in files:
                if file.lower().endswith(image_extensions):
                    file_path = os.path.join(root, file)
                    optimized, orig, new, action = compress_image(file_path)
                    total_orig += orig
                    total_new += new
                    if optimized:
                        optimized_count += 1
                    else:
                        skipped_count += 1
                        
    saving = total_orig - total_new
    saving_pct = (saving / total_orig * 100) if total_orig > 0 else 0
    print("=" * 60)
    print("Compression Summary:")
    print(f"  Optimized:   {optimized_count} files")
    print(f"  Skipped:     {skipped_count} files")
    print(f"  Total Size:  {total_orig/1024.0:.1f} KB -> {total_new/1024.0:.1f} KB")
    print(f"  Total Saved: {saving/1024.0:.1f} KB ({saving_pct:.1f}% reduction)")
    print("=" * 60)

if __name__ == "__main__":
    main()
