# TEIMOR · Gestor de pressupostos V07

Versió centrada en dues correccions clau:

- Login obligatori en cada càrrega de l’app. Ja no entra automàticament si el navegador tenia una sessió anterior guardada.
- Detector de clients més restrictiu: només agafa el client del requadre superior abans del cos del pressupost i rebutja carrers, imports, fórmules tipus `277,5 m x 10,45 € =`, línies de `Materials i M.O.`, totals, IVA i altres textos econòmics com a nom de client.

També manté les millores de V06:

- Detecció de `Data/Fecha` a la cel·la adjacent.
- Detecció de totals/base imposable i imports tipus `Materials i M.O. = ... €`.
- Separació de les línies de `TREBALLS` marcades amb `*` com a partides independents pendents de revisar.
- Pressupostos amb base importada encara que les subpartides no tinguin PU propi.
- Exportació/importació JSON i paquet ZIP compatible amb WinRAR.

Usuari inicial: `admin`
Contrasenya inicial: `teimor2026`
