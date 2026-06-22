# TEIMOR · Gestor de pressupostos V09.5

## Objectiu de la versió
Correcció del depurador de llibreria després d’importar molts Excels històrics. La V09.5 evita que el capítol/origen antic de l’Excel contamini la classificació de partides.

## Canvis principals

- Depurador tècnic de llibreria refet.
- La classificació ara mira només el text real de la partida: concepte + descripció llarga + unitat/codi.
- Ja no classifica partides per l’origen o pel capítol antic detectat, com ara “Impermeabilització de la terrassa”.
- Nous capítols tècnics més útils:
  - Geotèxtil
  - Làmines asfàltiques
  - Imprimacions
  - Mitges canyes
  - Formació de pendents
  - Proves d’estanqueïtat
  - Regates i obertures
  - Remats i peces especials
  - Cobertes de planxa
  - Paviments i enrajolats
  - Residus i runes
  - Proteccions d’obra
  - Mitjans auxiliars i lloguers
  - Neteja i sanejat
  - Enderrocs i arrencades
  - Pintura i revestiments
  - Reparació de formigó
  - Morters i regularitzacions
  - Canalons i baixants
  - Baranes i inox
  - Altres / revisar
- Botó nou a Llibreria: “Depurar per capítols tècnics”.
- Previsualització amb resum per capítols abans d’aplicar.
- Manté còpia interna per restaurar l’última depuració.

## Configuració Render

Root Directory:
App_TEIMOR_gestor_pressupostos_v09_5_DEPURADOR_TECNIC_LLibreria

Build Command:
echo "No build needed"

Publish Directory:
.

## Privacitat
Els Excels es llegeixen localment dins el navegador. GitHub i Render només publiquen el codi de l’app.
