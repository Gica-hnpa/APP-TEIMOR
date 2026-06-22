# TEIMOR Gestor de pressupostos · V08

Versió derivada de V07 amb millores d’ús sobre pressupostos i llibreria.

## Accés

Usuari inicial: `admin`  
Contrasenya inicial: `teimor2026`

La V08 utilitza claus locals pròpies (`v08`) per no arrossegar proves anteriors.

## Canvis V08

- Pressupostos clicables: es poden obrir, visualitzar i editar en una finestra superior/modal.
- Nou pressupost en finestra superior, no al final de la pantalla.
- Dates mostrades en format `dd/mm/aaaa` al llistat.
- Pressupostos ordenats per data descendent.
- Columna de “Tipus import” per diferenciar si l’import ve de la suma de partides o d’un total importat de l’Excel.
- Selecció massiva amb botons “Seleccionar tot” i “Desmarcar” en clients, pressupostos, llibreria i línies de pressupost.
- Exportar/importar només la llibreria de partides en JSON.
- Fitxa de partida més neta: sense subratllat de la descripció i sense duplicar la descripció llarga.
- Manté el criteri de no inventar preus unitaris quan només hi ha import total sense amidament.

## Render

Com a Static Site:

- Build Command: `echo "No build needed"`
- Publish Directory: `.`

Els Excels originals es llegeixen localment al navegador. No es pugen a GitHub ni Render.
