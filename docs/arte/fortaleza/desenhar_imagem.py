import json
from PIL import Image, ImageDraw, ImageFont
G = [r for r in open('docs/arte/fortaleza/planta.txt').read().split('\n') if r]
meta = json.load(open('docs/arte/fortaleza/planta.json'))
S = 9
H, W = len(G), len(G[0])
C = {'~': (40, 52, 66), 'M': (38, 70, 34), 'Y': (60, 110, 50), '.': (122, 146, 72), ':': (110, 114, 124), ';': (150, 152, 140),
     '=': (214, 202, 168), ',': (146, 110, 72), '_': (110, 70, 60), '-': (92, 72, 56), 'B': (210, 190, 150), 'H': (150, 100, 50),
     '#': (196, 170, 126), 'W': (170, 140, 96), 'T': (140, 110, 72), 'K': (120, 92, 64), 'A': (200, 120, 60), '|': (110, 70, 40),
     '!': (240, 236, 220), 'c': (245, 245, 235), 'o': (150, 150, 150), 'R': (180, 40, 40), '*': (255, 150, 40), 'F': (90, 190, 210),
     'S': (90, 150, 130), 'G': (20, 20, 20), 'P': (70, 140, 255)}
LEG = [('~', 'abismo (o vale lá embaixo)'), ('M', 'mata'), ('Y', 'árvore'), ('.', 'capim'), (':', 'estrada de basalto'),
       (';', 'calçamento quebrado'), ('=', 'lajes / praça'), (',', 'terra do acampamento'), ('B', 'ponte de pedra'),
       ('H', 'ponte de cordas'), ('W', 'muralha'), ('T', 'torre'), ('K', 'torre de menagem'), ('_', 'salão do trono'),
       ('-', 'caserna (com telhado)'), ('#', 'muro em ruínas'), ('A', 'tenda'), ('|', 'paliçada'), ('!', 'totem'),
       ('c', 'coluna'), ('o', 'bloco caído'), ('*', 'fogueira'), ('F', 'fonte seca'), ('S', 'estátua derrubada'),
       ('G', 'forca'), ('R', 'trono'), ('P', 'entrada (portal)')]
PANEL = 300
img = Image.new('RGB', (W * S + PANEL, H * S), (24, 22, 20))
d = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13); big = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
except Exception:
    font = big = ImageFont.load_default()
for y, row in enumerate(G):
    for x, ch in enumerate(row):
        col = C.get(ch, (255, 0, 255))
        d.rectangle([x * S, y * S, x * S + S - 1, y * S + S - 1], fill=col)
        if ch in 'YcoF!SG*P':
            d.rectangle([x * S + 2, y * S + 2, x * S + S - 3, y * S + S - 3], outline=(0, 0, 0))
for s in meta['salas']:
    d.rectangle([s['x'] * S, s['y'] * S, (s['x'] + s['w']) * S - 1, (s['y'] + s['h']) * S - 1], outline=(255, 220, 60), width=2)
for i, z in enumerate(meta['zonas']):
    cx, cy = z['x'] * S + S // 2, z['y'] * S + S // 2
    d.ellipse([cx - 11, cy - 11, cx + 11, cy + 11], fill=(200, 30, 30), outline=(255, 255, 255), width=2)
    d.text((cx - 4, cy - 9), str(i + 1), fill=(255, 255, 255), font=big)
for m in meta['campinas']:
    cx, cy = m['x'] * S + S // 2, m['y'] * S + S // 2
    d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], outline=(255, 140, 0), width=3)
for (x, y, t) in [(10, 89, 'mirante'), (12, 25, 'mirante'), (60, 25, 'mirante'), (54, 62, 'estátua'), (23, 46, 'forca'), (47, 100, 'fonte')]:
    d.text((x * S, y * S), t, fill=(255, 255, 255), font=font, stroke_width=2, stroke_fill=(0, 0, 0))
px = W * S + 14
d.text((px, 12), 'Fortaleza Orc — planta', fill=(255, 255, 255), font=big)
yy = 40
for ch, name in LEG:
    d.rectangle([px, yy, px + 14, yy + 14], fill=C[ch], outline=(0, 0, 0))
    d.text((px + 22, yy - 1), name, fill=(230, 230, 230), font=font)
    yy += 21
yy += 10
d.ellipse([px, yy, px + 18, yy + 18], fill=(200, 30, 30), outline=(255, 255, 255), width=2); d.text((px + 26, yy), 'zona de combate (ordem)', fill=(230, 230, 230), font=font); yy += 26
d.ellipse([px + 2, yy + 2, px + 16, yy + 16], outline=(255, 140, 0), width=3); d.text((px + 26, yy), 'campina (bando extra)', fill=(230, 230, 230), font=font); yy += 26
d.rectangle([px, yy, px + 18, yy + 18], outline=(255, 220, 60), width=2); d.text((px + 26, yy), 'sala com mini-boss e baú', fill=(230, 230, 230), font=font); yy += 36
for t in ['De baixo para cima:', '1 praça da fonte (vila)', '2 cabeça da ponte', '3 pátio do portão', '4 acampamento oeste',
          '5 pátio do esporão', '6 pé da torre', 'boss: salão do trono']:
    d.text((px, yy), t, fill=(230, 230, 230), font=font); yy += 19
img.save('docs/arte/fortaleza/planta.png')
print(img.size)
