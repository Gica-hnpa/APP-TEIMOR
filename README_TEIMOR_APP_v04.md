# App TEIMOR · Gestor de pressupostos V04

Versió derivada de la V03, centrada en depurar la importació dels Excels antics de TEIMOR.

## Accés inicial

- Usuari: `admin`
- Contrasenya: `teimor2026`

## Novetats V04

- Detector de client del requadre/destinatari reforçat perquè no guardi carrers com a nom de client.
- Detector de data millorat: busca la cel·la `Data` / `Fecha` i llegeix el valor adjacent.
- Pestanya Pressupostos refeta com a llistat complet: any, data, número, client, feina, estat, import i partides.
- Estat editable per pressupost: Esborrany, Enviat, Acceptat, Rebutjat, Acceptat i fet, Facturat, Cobrat, Històric importat, Anul·lat.
- Eliminació de clients, feines, pressupostos, factures, partides de llibreria i línies de pressupost.
- Importador més restrictiu perquè capçaleres, clients, adreces i textos fiscals no entrin a la llibreria de partides.
- Detecció de fitxers `.rar`: l’app avisa que no pot descomprimir RAR real dins el navegador i recomana descomprimir-lo o convertir-lo a ZIP.
- Exportació de paquet `.zip` compatible amb WinRAR.

## Sobre RAR

Una web estàtica sense servidor pot llegir ZIP amb JSZip. El format RAR no es pot descomprimir de forma fiable només amb el codi actual del navegador. Per això la V04 el detecta i mostra avís, però per importar-lo cal:

1. Descomprimir el `.rar` amb WinRAR i seleccionar la carpeta resultant; o
2. Crear un `.zip` amb els Excels i importar aquest ZIP.

## Deploy a Render

Static Site:

- Root Directory: buit si `index.html` és a l’arrel
- Build Command: `echo "No build needed"`
- Publish Directory: `.`

Les dades importades des de l’app queden al navegador/ordinador. GitHub i Render només contenen el codi de l’app.
