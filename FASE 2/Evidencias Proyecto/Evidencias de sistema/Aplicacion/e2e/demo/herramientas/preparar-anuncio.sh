set -e
D=/home/claude/app/e2e/demo/salida/anuncio
C=$D/capturas
cd /home/claude/app/e2e
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome DEMO_ARCHIVO=capturar-anuncio npx playwright test -c demo/demo.config.js 2>&1 | grep -E "passed|failed|Error" || true
HORA=$(python3 -c "import json,datetime,zoneinfo;d=json.load(open('$C/listo.json'));print(datetime.datetime.fromisoformat(d['hora'].replace('Z','+00:00')).astimezone(zoneinfo.ZoneInfo('America/Santiago')).strftime('%-H:%M'))")
echo HORA $HORA
python3 -c "import json;d=json.load(open('$C/listo.json'));c=d['cajas'];c['horaEstimada']=c.get('horaEstimada');json.dump({'cajas':c,'horaBarra':'$HORA','fecha':d['fecha']},open('$D/img/datos.json','w'))"
cp $C/plato-*.png $D/img/
cp /home/claude/psd/geo.json $D/img/
cp /home/claude/app/e2e/demo/anuncio/anuncio.html $D/
cd $D/img
while read n f; do HORA_BARRA=$HORA python3 -I -c "import sys;sys.path.insert(0,'/home/claude/herr');import componer;componer.final($n,'../capturas/$f.png','m$n-$f.png')"; done < /home/claude/herr/lista.txt
echo LISTO
