# TEIMOR V09.13.1 · identificació d’obra, factures i traçabilitat

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

Ús recomanat:

1. Obre Importar Excels.
2. Tria Factures o Certificacions.
3. Importa un bloc de fins a 50 fitxers, revisa les coincidències i confirma.
4. Entra a Obres / traçabilitat per veure la relació completa.

Configuració Render:

Root Directory: `App_TEIMOR_gestor_pressupostos_v09_13_FACTURES_CERTIFICACIONS_TRAÇABILITAT`
Build Command: `echo "No build needed"`
Publish Directory: `.`
