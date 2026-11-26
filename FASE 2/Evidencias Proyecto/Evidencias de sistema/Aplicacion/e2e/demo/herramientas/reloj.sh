L=/usr/local/lib/python3.13/dist-packages/libfaketime/vendor/libfaketime/src/libfaketime.so.1
OBJ=${OBJETIVO:-11:32}
AHORA=$(date +%s)
META=$(date -d "today $OBJ" +%s)
MIN=$(( (AHORA - META) / 60 ))
export FAKETIME="-${MIN}m"
echo "FAKETIME=$FAKETIME"
pkill -f "src/app.js"; pkill -f "vite preview"
pg_ctlcluster 16 main stop 2>/dev/null
su postgres -c "LD_PRELOAD=$L FAKETIME=$FAKETIME /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/16/main -o '-c config_file=/etc/postgresql/16/main/postgresql.conf -c timezone=Etc/GMT+3' -l /tmp/pg.log start" >/dev/null
sleep 3
cd /home/claude/app/backend
eval "$(node -e "const e=require('../e2e/soporte/entorno').entornoBackend();for(const k in e)console.log('export '+k+'='+JSON.stringify(e[k]))")"
LD_PRELOAD=$L nohup node src/app.js > /tmp/api.log 2>&1 &
cd /home/claude/app/frontend
LD_PRELOAD=$L nohup npx vite preview --outDir ../e2e/.dist --port 4180 --strictPort > /tmp/web.log 2>&1 &
sleep 8
echo "export LD_PRELOAD=$L FAKETIME=$FAKETIME" > /tmp/reloj.env
