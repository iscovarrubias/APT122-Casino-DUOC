import sys, json, numpy as np, cv2
from PIL import Image
def pantalla_con_barra(captura):
    import os
    from PIL import ImageDraw, ImageFont
    im = Image.open(captura).convert('RGB')
    if im.size[1] >= 2868:
        return im.resize((1320, 2868), Image.LANCZOS)
    im = im.resize((1320, 2697), Image.LANCZOS)
    fondo = im.getpixel((6, 6))
    lienzo = Image.new('RGB', (1320, 2868), fondo)
    lienzo.paste(im, (0, 171))
    d = ImageDraw.Draw(lienzo)
    tinta = (0, 0, 0) if sum(fondo) > 380 else (255, 255, 255)
    f = ImageFont.truetype(os.environ.get('FUENTE_BARRA', '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'), 52)
    hora = os.environ.get('HORA_BARRA', '12:00')
    w = d.textlength(hora, font=f)
    d.text((234 - w / 2, 89), hora, font=f, fill=tinta, anchor='lm')
    x = 1000
    for i, h in enumerate((14, 20, 27, 34)):
        d.rounded_rectangle([x + i * 17, 106 - h, x + i * 17 + 11, 106], 3, fill=tinta)
    cx, cy = 1115, 104
    for r, wd in ((40, 9), (26, 9)):
        d.arc([cx - r, cy - r, cx + r, cy + r], 225, 315, fill=tinta, width=wd)
    d.ellipse([cx - 7, cy - 12, cx + 7, cy + 2], fill=tinta)
    d.rounded_rectangle([1162, 72, 1240, 108], 10, outline=tinta, width=4)
    d.rounded_rectangle([1168, 78, 1222, 102], 6, fill=tinta)
    d.rounded_rectangle([1244, 83, 1250, 97], 2, fill=tinta)
    return lienzo

def componer(n, captura, salida, fondo=None, d='/home/claude/psd'):
    info = json.load(open(f'{d}/m{n}.json'))
    W, H = info['size']
    q = np.array(info['nonaffine'], np.float32).reshape(4, 2)
    cap = np.array(pantalla_con_barra(captura)).astype(np.float32)
    src = np.array([[0, 0], [1320, 0], [1320, 2868], [0, 2868]], np.float32)
    M = cv2.getPerspectiveTransform(src, q)
    pant = cv2.warpPerspective(cap, M, (W, H), flags=cv2.INTER_CUBIC)
    mask = np.array(Image.open(f'{d}/m{n}_mascara.png'))[..., None].astype(np.float32) / 255
    body = np.array(Image.open(f'{d}/m{n}_iphone.png')).astype(np.float32)
    hl = np.array(Image.open(f'{d}/m{n}_highlights.png')).astype(np.float32)
    sombra = np.array(Image.open(f'{d}/m{n}_sombra.png')).astype(np.float32)[..., None] / 255
    out = np.zeros((H, W, 4), np.float32)
    base = np.ones((H, W, 3), np.float32) * 255
    sh = 1 - sombra * (1 - 42 / 255)
    a = body[..., 3:4] / 255
    rgb = body[..., :3] * a
    al = a
    rgb = rgb * (1 - mask) + pant * mask
    al = np.maximum(al, mask)
    ha = hl[..., 3:4] / 255
    scr = 255 - (255 - rgb) * (255 - hl[..., :3]) / 255
    rgb = rgb * (1 - ha) + scr * ha
    Image.fromarray(np.dstack([np.clip(rgb / np.maximum(al, 1e-4), 0, 255), al * 255]).astype(np.uint8), 'RGBA').save(salida)
    Image.fromarray(np.clip((1 - sh[..., 0]) * 255, 0, 255).astype(np.uint8), 'L').save(salida.replace('.png', '_sombra.png'))
if __name__ == '__main__':
    componer(sys.argv[1], sys.argv[2], sys.argv[3])

def final(n, captura, salida):
    tmp = salida + '.tmp.png'
    componer(n, captura, tmp)
    a = Image.open(tmp)
    s = Image.open(tmp.replace('.png', '_sombra.png'))
    sh = Image.merge('RGBA', [Image.new('L', a.size, 0)] * 3 + [s.point(lambda v: int(v * 0.55))])
    sh.alpha_composite(a)
    caja = json.load(open('/home/claude/psd/cajas.json'))[str(n)]
    sh.crop(caja).save(salida, optimize=False, compress_level=3)
    import os
    os.remove(tmp); os.remove(tmp.replace('.png', '_sombra.png'))
