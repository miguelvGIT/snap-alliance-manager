from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'public'
for size in (180, 192, 512):
    image = Image.new('RGB', (size, size), '#000000')
    draw = ImageDraw.Draw(image)
    scale = size / 512
    for path in [[(128,202),(256,136),(384,202),(256,268),(128,202)],[(128,260),(256,326),(384,260)],[(128,318),(256,384),(384,318)]]:
        draw.line([(round(x*scale),round(y*scale)) for x,y in path], fill='#ffffff', width=max(2,round(18*scale)), joint='curve')
    image.save(root / f'icon-{size}.png')
