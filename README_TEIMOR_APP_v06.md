# TEIMOR · Gestor de pressupostos V06

Versió centrada en depurar la importació real dels Excels antics de TEIMOR.

## Canvis V06

- Detector de client refet segons el patró del requadre superior dret:
  1. nom del client,
  2. adreça,
  3. codi postal i població,
  4. província o NIF/DNI/CIF.
- Evita guardar carrers com a nom de client. Si la primera línia detectada és una adreça, marca el client com a pendent de revisar o intenta agafar el nom del fitxer.
- Detecció reforçada de dates llegint la cel·la adjacent a `Data` / `Fecha`.
- Detecció del total del pressupost des de `BASE IMPOSABLE`, `IMPORT TOTAL`, `TOTAL PRESSUPOST` o textos tipus `Materials i M.O. = 3.276,00 €`.
- El total del pressupost ja no queda a 0 quan les partides separades per `*` no tenen preu unitari propi: es guarda una `Base importada s/IVA`.
- Les línies de `TREBALLS` separades per `*` es creen com a subpartides/partides independents pendents de revisar.
- Manté la llibreria tipus BEDEC amb fitxa, descripció llarga, descompost editable i històric.
- Exportació ZIP compatible amb WinRAR. Els `.rar` es detecten i s’avisa, però no es poden descomprimir de manera fiable en una app web estàtica; cal descomprimir-los amb WinRAR o convertir-los a ZIP.

## Accés inicial

- Usuari: `admin`
- Contrasenya: `teimor2026`

## Render

Static Site:

- Build Command: `echo "No build needed"`
- Publish Directory: `.`

Les dades importades queden al navegador/ordinador de l’usuari, no a Render ni GitHub. Per transferir-les cal exportar/importar JSON complet.
