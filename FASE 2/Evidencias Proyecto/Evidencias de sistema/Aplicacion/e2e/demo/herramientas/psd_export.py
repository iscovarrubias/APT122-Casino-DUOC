import sys, json, glob
from psd_tools import PSDImage
from PIL import Image
sal = sys.argv[1]
for f in sorted(glob.glob('/mnt/user-data/uploads/*iPhone_Mockup_*.psd')):
    n = f.split('_')[-1].split('.')[0]
    p = PSDImage.open(f)
    info = {'size': p.size}
    for l in p.descendants():
        if l.name == 'Background':
            info['fondo'] = str(l.tagged_blocks.get_data(b'SoCo') if l.tagged_blocks else None)
        if l.name == 'Shadows':
            m = l.mask
            if m is not None:
                img = m.topil()
                full = Image.new('L', p.size, m.background_color)
                full.paste(img, (m.left, m.top))
                full.save(f'{sal}/m{n}_sombra.png')
                info['sombra_fill'] = str(l.tagged_blocks.get_data(b'SoCo'))
        if l.kind == 'pixel' and l.name in ('iPhone', 'Highlights'):
            img = l.topil()
            full = Image.new('RGBA', p.size, (0, 0, 0, 0))
            full.paste(img, (l.left, l.top), img if img.mode == 'RGBA' else None)
            full.save(f'{sal}/m{n}_{l.name.lower()}.png')
        if l.kind == 'smartobject' and l.name == 'Screen' and l.visible:
            img = l.topil()
            full = Image.new('RGBA', p.size, (0, 0, 0, 0))
            full.paste(img, (l.left, l.top), img)
            full.save(f'{sal}/m{n}_pantalla.png')
            for k in (b'SoLd', b'PlLd', b'SoLE'):
                if l.tagged_blocks and k in l.tagged_blocks:
                    d = l.tagged_blocks.get_data(k)
                    try:
                        dd = d.data if hasattr(d, 'data') else d
                        info['trnf'] = [float(x) for x in dd.get(b'Trnf')]
                        info['nonaffine'] = [float(x) for x in dd.get(b'nonAffineTransform')]
                        info['size_so'] = str(dd.get(b'Sz  '))
                    except Exception as ex:
                        info['err'] = repr(ex)
    json.dump(info, open(f'{sal}/m{n}.json', 'w'), indent=1)
    print(n, info)
