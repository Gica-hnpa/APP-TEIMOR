# TEIMOR · Gestor local de pressupostos

App simplificada i local per gestionar:

- Clients
- Feines/obres classificades per anys
- Llibreria de partides tipus
- Pressupostos amb partides de llibreria o línies manuals
- Factures associades a pressupost i feina
- Rendiment de l'obra: pressupostat, factures/despeses i marge
- Arxius / albarans / PDFs guardats al navegador

## Com obrir-la

1. Descomprimeix el ZIP.
2. Obre `index.html` amb Chrome, Edge o navegador modern.
3. Treballa normalment. Les dades es guarden al navegador del dispositiu.

## Còpies de seguretat

Fes servir el botó **Exportar còpia JSON** sovint. Aquesta còpia desa les dades principals de l'app.

Els arxius adjunts es guarden a IndexedDB del navegador. Si es neteja la memòria del navegador, es poden perdre. Per una versió professional multiusuari, aquesta estructura es pot portar a Supabase o servidor propi.

## Nota

Aquesta és una primera versió local i sense dependències externes. Està pensada com a base clara per validar pantalles i fluxos abans de convertir-la en app completa.
