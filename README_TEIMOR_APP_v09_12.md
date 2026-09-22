# TEIMOR V09.12 · treballs genèrics i clients 2024

Canvis principals:

- Manté la V09.8, la V09.9, la V09.10 i la V09.11 intactes com a versions de referència; aquesta carpeta és la V09.12 independent.
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
- En cada Excel, el nom del client, l’adreça fiscal, la població, el codi postal i el NIF/DNI/CIF es busquen exclusivament al quadre superior dret.
- El concepte del pressupost només es llegeix de l’etiqueta exacta `Concepte` o `Concepto`; si no apareix, queda pendent de revisar.
- L’adreça, població i codi postal de l’obra queden separats de les dades fiscals del client.
- La previsualització mostra les dades interpretades abans de confirmar perquè es puguin validar per blocs de 50 fitxers.
- La importació no afegeix cap partida a la llibreria. Les partides entren només al pressupost i es poden completar manualment amb capítol, codi, unitat, concepte, descripció llarga, quantitat i preu de referència.
- En crear una partida manual a la llibreria, l’app avisa si ja existeix una partida semblant per evitar duplicats.
- La fitxa de client permet revisar també la població i el codi postal de l’obra.
- En els pressupostos antics amb un bloc `Treballs`, cada línia iniciada per punt, asterisc o vinyeta es converteix en un treball independent.
- Les línies següents sense marcador s’afegeixen al treball anterior fins que apareix el marcador següent.
- Quan l’Excel només té un import global, aquest import es conserva separat i no es reparteix artificialment entre els treballs.
- Aquesta lectura s’aplica també als pressupostos del 2024; el client continua sortint exclusivament del quadre superior dret.

Configuració Render:

Root Directory: `App_TEIMOR_gestor_pressupostos_v09_12_TREBALLS_GENERIC_CLIENT_2024`
Build Command: `echo "No build needed"`
Publish Directory: `.`
