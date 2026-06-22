# App TEIMOR V09 · lectura de pressupostos, dates i còpies JSON

Versió derivada de V08. Canvis principals:

- Nou magatzem local `v09` per evitar arrossegar proves anteriors.
- Importador ajustat al patró TEIMOR: requadre superior dret del destinatari/client, data al costat de `Data/Fecha`, número al costat de `PRESSUPOST/PRESUPUESTO`, concepte al costat de `CONCEPTE/OBRA`.
- Correcció de dates en format dd/mm/aaaa i detecció de casos mm/dd generats per SheetJS.
- Llistat de pressupostos més net: data, número, client, concepte/obra, imports i tipus d’import.
- Previsualització A4 imprimible per poder guardar PDF des del navegador.
- Clients sense codi intern visible al llistat.
- Menú lateral més net: exportació/importació agrupada a “Còpies / JSON”.
- Botó de depuració de clients no vàlids detectats com a imports, fórmules o carrers.

Usuari inicial: `admin`
Contrasenya inicial: `teimor2026`
