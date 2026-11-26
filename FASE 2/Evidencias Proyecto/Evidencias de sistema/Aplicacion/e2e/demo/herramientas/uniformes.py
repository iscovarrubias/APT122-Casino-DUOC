import json, sys, os
from PIL import Image, ImageStat
base = sys.argv[1]
for clip in sorted(os.listdir(base)):
    q = os.path.join(base, clip, 'cuadros.json')
    if not os.path.exists(q):
        continue
    salida = os.path.join(base, clip, 'uniformes.json')
    if os.path.exists(salida):
        continue
    d = json.load(open(q))
    malos = []
    for c in d['cuadros']:
        try:
            im = Image.open(c['archivo']).convert('L').resize((160, 90))
        except Exception:
            continue
        izq = im.crop((0, 0, 40, 90))
        der = im.crop((40, 0, 160, 90))
        if ImageStat.Stat(der).stddev[0] < 3.5:
            malos.append(c['archivo'])
    json.dump(malos, open(salida, 'w'))
    print(clip, len(malos), len(d['cuadros']))
