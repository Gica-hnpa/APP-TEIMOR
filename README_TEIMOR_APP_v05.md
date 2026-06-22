# TEIMOR · Gestor de pressupostos V05

Versió centrada en depurar importació i usabilitat:

- Pestanya **Feines / anys** eliminada de la navegació. Les obres queden integrades dins **Pressupostos**.
- Pestanya **Pressupostos** com a llistat únic amb any, data, número, client, obra, estat, imports i partides.
- Eliminació múltiple de clients, pressupostos, línies de pressupost i partides de llibreria.
- Llibreria amb filtre per capítol i cerca; el llistat mostra només descripció curta.
- Fitxa de partida amb pestanyes internes: Fitxa, Descripció llarga, Descompost BEDEC i Històric.
- Descompost BEDEC en taula estructurada de recursos, rendiments, preus i totals, no com a text continu.
- Importador millorat per a Excel TEIMOR: detecta Data/Fecha adjacent, client del requadre, medició, base imposable/import total i calcula PU quan hi ha amidament.
- Manté les partides sense amidament com a històriques pendents, sense inventar PU.
- Detecta fitxers `.rar` i avisa que cal descomprimir-los o convertir-los a ZIP. L’exportació genera ZIP compatible amb WinRAR.

## Accés inicial
Usuari: `admin`  
Contrasenya: `teimor2026`

## Render
És una app estàtica:

- Build Command: `echo "No build needed"`
- Publish Directory: `.`

## Privacitat
Els Excel s’importen localment al navegador. GitHub/Render només publiquen el codi. Les dades viatgen només quan l’usuari exporta/importa JSON complet.
