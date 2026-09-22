# TEIMOR V09.10 · depuració de clients i importació neta

Canvis principals:

- Ordenar Pressupostos amb fletxes ja no treu el filtre de l’any actiu.
- Numeració nova per any: 1, 2, 3... segons data ascendent dins de cada any.
- Columna separada per conservar el número antic/original importat de l’Excel.
- Botó per recalcular numeració anual.
- La llibreria, un cop depurada, queda automàticament en vista neta amb només partides tipus representatives.
- La vista A4/PDF conserva un format més modern amb color corporatiu.
- Lectura més robusta de clients, dates, conceptes i etiquetes amb valor dins la mateixa cel·la.
- La importació ja no converteix automàticament un nom de fitxer en client: els casos dubtosos queden marcats per revisar.
- Abans de confirmar una importació es mostren avisos de clients sense nom segur i possibles duplicats.
- A la pestanya Clients hi ha una depuració visible amb duplicats, fitxes sense nom, origen i pressupostos vinculats.
- Les variants conflictives no es fusionen automàticament; es conserven perquè l’usuari validi quina fitxa és la correcta.
- La fitxa de cada partida permet escriure qualsevol capítol i hi ha un botó directe Canviar capítol.
- Quan es canvia el capítol d’una partida de llibreria, també s’actualitzen les línies de pressupost que la utilitzen.
- La pestanya Clients permet fusionar els duplicats segurs en una sola fitxa i reassigna automàticament les obres, pressupostos, factures i adjunts.
- Es conserven les adreces de totes les obres, els noms alternatius i els fitxers d’origen del client fusionat.
- La importació ignora files sense preu, línies de mesurament, subtotals i duplicats exactes entre pestanyes.
- Abans de confirmar la importació es mostra quantes files s’han descartat i per quin motiu.

Configuració Render:

Root Directory: `App_TEIMOR_gestor_pressupostos_v09_10_DEPURACIO_CLIENTS_IMPORTACIO_NETA`
Build Command: `echo "No build needed"`
Publish Directory: `.`
