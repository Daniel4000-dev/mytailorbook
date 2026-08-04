from PIL import Image

try:
    img = Image.open('public/images/logo-mark.png')
    img = img.convert("RGBA")
    
    # logo-mark is already perfectly square (496x496) and cropped. 
    # Let's just add 10% padding.
    size = img.width
    padding = int(size * 0.1)
    new_size = size + 2 * padding
    
    icon_solid = Image.new("RGBA", (new_size, new_size), (255, 255, 255, 255))
    offset = (padding, padding)
    
    temp = Image.new("RGBA", (new_size, new_size), (255, 255, 255, 0))
    temp.paste(img, offset)
    icon_solid = Image.alpha_composite(icon_solid, temp)
    icon_transparent = temp
    
    icon_solid.resize((180, 180), Image.Resampling.LANCZOS).convert("RGB").save('public/apple-touch-icon.png')
    icon_transparent.resize((192, 192), Image.Resampling.LANCZOS).save('public/icons/icon-192.png')
    icon_transparent.resize((512, 512), Image.Resampling.LANCZOS).save('public/icons/icon-512.png')
    icon_solid.resize((512, 512), Image.Resampling.LANCZOS).convert("RGB").save('public/icons/icon-maskable-512.png')
    
    # Favicon 
    # To make sure the favicon is as clear as possible, we could use slightly less padding for the favicon itself.
    favicon_temp = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    favicon_temp.paste(img, (0, 0))
    favicon_temp.resize((64, 64), Image.Resampling.LANCZOS).save('app/favicon.ico', format='ICO', sizes=[(64, 64)])
    favicon_temp.resize((64, 64), Image.Resampling.LANCZOS).save('public/favicon.ico', format='ICO', sizes=[(64, 64)])

    print("Successfully generated icons from logo-mark.png!")
except Exception as e:
    print("Error:", e)
