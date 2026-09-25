# TEIMOR V09.13.5 · identificació d’obra, factures i traçabilitat

V09.13 parteix de V09.12 i manté les versions anteriors intactes.

Canvis principals:

- Importació separada de factures i certificacions des d’Excel, CSV, carpeta o ZIP.
- Lectura de data, número, client, NIF/DNI/CIF, concepte, base, IVA i total.
- El client continua sortint del quadre superior dret i les dades fiscals es conserven separades de l’adreça de l’obra.
- Cada document importat busca coincidències amb clients, obres i pressupostos existents.
- Les coincidències automàtiques es marquen; les suggerides o ambigües es poden validar manualment abans de confirmar.
- Els documents sense coincidència segura queden pendents, sense crear enllaços silenciosos.
- Nova vista central Obres / traçabilitat amb pressupostos, factures i certificacions agrupats per obra.
- La vista Factures mostra també les certificacions importades i permet anar a la traçabilitat de l’obra.
- La llibreria de partides continua sent manual: cap importació financera ni de pressupostos hi afegeix partides automàticament.
- Es mantenen la lectura de Treballs per punts/asteriscs/vinyetes, la depuració de clients, la fusió revisable i l’edició manual de capítols de V09.12.
- La importació de documents repetits del mateix número/data o origen es detecta i s’omet per evitar duplicats.
- A Obres, la identificació mostra la paraula clau/concepte i l’adreça real de l’obra en camps separats.
- L’adreça de l’obra només es llegeix des d’un camp explícit d’obra; les línies de partides no es poden convertir en adreces.
- Còpies JSON de V09.12/V09.11 es poden fusionar des de Còpies / JSON per recuperar pressupostos ja ordenats o corregits.
- Els pressupostos sense obra vinculada es mostren igualment a Obres perquè no quedin ocults.
- La relació de factures compara client i adreça de l’obra i mostra l’evidència per validar-la.
- La importació desa el fitxer original local de cada factura i la pestanya Factures inclou l’acció explícita «Descarregar factura».
- Les factures importades en versions anteriors que no tenen fitxer local s’han de reimportar una vegada per poder-les descarregar.
- La pestanya Obres té un mode segur per obrir-se encara que hi hagi registres antics incomplets.
- La pestanya Factures permet importar directament factures i, després de confirmar, les mostra en un llistat amb filtre per text complet, any, client i estat.
- Els filtres de Clients, Pressupostos i Llibreria accepten diverses lletres sense reconstruir tota la pantalla ni perdre el cursor.
- A Obres funcionen «Veure traçabilitat» i «Editar obra», i hi ha una acció per recalcular de cop les relacions pendents de factures i certificacions.
- En obrir aquesta versió, els registres que semblen factures però havien acabat dins de Pressupostos es separen automàticament i les obres repetides es consoliden remapejant les relacions.
- Pressupostos i Factures mostren comptadors totals i comptadors filtrats; les factures tenen també filtre per relació automàtica/pendent.
- Les factures es poden editar amb client, obra, pressupost, concepte, base, IVA i estat, sense perdre el fitxer original ni la traçabilitat.
- Cada factura té una «Vista PDF» amb el mateix estil A4 de la previsualització dels pressupostos i es pot imprimir o guardar com a PDF.
- La relació massiva no crea obres: consolida les obres duplicades, propaga la relació pressupost–factura–obra i manté els comptadors reals.
- «Veure traçabilitat» i «Editar obra» tenen una delegació d’esdeveniments reforçada perquè funcionin també després de filtrar o recalcular relacions.
- La factura impresa mostra «Referència obra» i «Segons pressupost» com a referències comercials; no hi imprimeix textos interns de vinculació.

Ús recomanat:

1. Obre Importar Excels.
2. Tria Factures o Certificacions.
3. Importa un bloc de fins a 50 fitxers, revisa les coincidències i confirma.
4. Entra a Obres / traçabilitat per veure la relació completa.

Configuració Render:

Root Directory: `App_TEIMOR_gestor_pressupostos_v09_13_5_RELACIO_TRAÇABILITAT_PDF`
Build Command: `echo "No build needed"`
Publish Directory: `.`
