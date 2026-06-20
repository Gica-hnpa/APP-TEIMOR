# TEIMOR · Base de dades de pressupostos v03

App estàtica per gestionar clients finals, feines per anys, llibreria de partides, pressupostos, factures, rendiment i arxius/albarans.

## Accés inicial

- Usuari: `admin`
- Contrasenya: `teimor2026`

Es pot canviar a la pestanya **Configuració**. Aquesta protecció és d'accés visual local. Si cal seguretat real multiusuari amb servidor, caldrà afegir Supabase Auth o equivalent.

## Render / GitHub

És una app estàtica. A Render cal crear un **Static Site** amb:

- Root Directory: buit, si `index.html` està a l'arrel del repositori
- Build Command: `echo "No build needed"`
- Publish Directory: `.`

No pugis pressupostos Excel originals ni JSON amb dades reals a GitHub. GitHub/Render només han de tenir el codi de l'app.

## Privacitat i importació

La pestanya **Importar Excels** permet:

- seleccionar molts `.xls/.xlsx/.xlsm/.csv` de cop,
- seleccionar una carpeta sencera,
- importar un `.zip` amb molts Excels dins.

La lectura es fa al navegador de l'ordinador. Els fitxers originals no es pugen a Render ni a GitHub.

L'app detecta el client final del requadre/destinatari del pressupost, no les dades generals de TEIMOR. Conserva NIF/DNI/CIF, telèfon, email i adreces perquè es puguin reutilitzar en pressupostos i factures.

## Llibreria de partides

Les partides importades es classifiquen així:

- `Importada amb amidament i PU pendent validar`: té unitat, quantitat i preu/unitat.
- `PU calculat pendent validar`: té quantitat i total, però el PU s'ha calculat automàticament.
- `Històrica sense amidament`: només hi ha descripció i import total; no es considera PU fiable.
- `PA pendent amidament`: partida a preu alçat o pendent de mesurar.

Cada partida de llibreria pot tenir descompost vinculat de mà d'obra, materials, maquinària i altres, amb rendiments i preus.

## Exportar / importar JSON

- **Exportar JSON complet**: crea una còpia transferible amb clients, pressupostos, partides, factures i arxius incrustats si s'han marcat com a inclosos.
- **Exportar demo/net**: genera una còpia sense dades personals per provar l'app.
- **Importar JSON**: restaura la base en un altre ordinador o a l'app de TEIMOR.

Si passes el JSON complet a TEIMOR, TEIMOR veurà la mateixa base que tu.

## Llibreries externes

Per llegir Excel i ZIP, aquesta v03 carrega SheetJS i JSZip des de CDN. Les dades dels Excels es processen localment al navegador; no s'envien a aquests serveis. Si vols una versió 100% autocontinguda sense CDN, cal incorporar aquestes llibreries dins del repositori.

## Canvis V03

- Millorat el detector de pressupostos antics TEIMOR d'una sola partida: llegeix `CONCEPTE`, `MEDICIÓ`, bloc `TREBALLS` i `BASE IMPOSABLE` com una única partida, evitant que clients, adreces o textos de capçalera entrin a la llibreria.
- Millorat el detector de client final del requadre dret/destinatari.
- Detecta millor dates en format `YYYY-MM-DD` i classifica pressupostos/feines per any real.
- Pestanya **Clients** reorganitzada: primer es veu el llistat amb filtres intel·ligents; el botó `+ Nou client` obre la pantalla de creació.
- Afegit botó **Exportar paquet WinRAR/ZIP**: genera un `.zip` compatible amb WinRAR, amb el JSON complet i arxius incrustats quan correspongui. No genera `.rar` real perquè una app web estàtica no pot crear RAR nativament sense eina externa/servidor.
