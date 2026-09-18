from PIL import Image
import os

directory = '/Users/mac/Desktop/mytailorbook/public/mascots'
for filename in os.listdir(directory):
    if filename.endswith(".png"):
        filepath = os.path.join(directory, filename)
        img = Image.open(filepath).convert("RGBA")
        datas = img.getdata()
        newData = []
        for item in datas:
            # Change all white (also shades of whites)
            # to transparent
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
        img.putdata(newData)
        img.save(filepath, "PNG")
        print(f"Processed {filename}")
