# TEIMOR V09.16 · lector antic 875, estats i fitxa completa

V09.16 parteix de V09.15 i manté les versions anteriors intactes.

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
- La relació de factures compara client i adreça de l’obra i mostra l’evidència per validar-la.
- La importació desa el fitxer original local de cada factura i la pestanya Factures inclou l’acció explícita «Descarregar factura».
- Les factures importades en versions anteriors que no tenen fitxer local s’han de reimportar una vegada per poder-les descarregar.
- La pestanya Obres té un mode segur per obrir-se encara que hi hagi registres antics incomplets.
- La pestanya Factures permet importar directament factures i, després de confirmar, les mostra en un llistat amb filtre per text complet, any, client i estat.
- Els filtres de Clients, Pressupostos i Llibreria accepten diverses lletres sense reconstruir tota la pantalla ni perdre el cursor.
- A Obres funcionen «Veure traçabilitat» i «Editar obra», i hi ha una acció per recalcular de cop les relacions pendents de factures i certificacions.
- En obrir aquesta versió, els registres que semblen factures però havien acabat dins de Pressupostos es separen automàticament i les obres repetides es consoliden remapejant les relacions.
- Pressupostos i Factures mostren comptadors totals i comptadors filtrats; les factures tenen també filtre per relació automàtica/pendent.
- Les factures es poden editar amb client, obra, pressupost, concepte, base, IVA i estat, sense perdre el fitxer original ni la traçabilitat.
- Cada factura té una «Vista PDF» amb el mateix estil A4 de la previsualització dels pressupostos i es pot imprimir o guardar com a PDF.
- La relació massiva no crea obres: consolida les obres duplicades, propaga la relació pressupost–factura–obra i manté els comptadors reals.
- «Veure traçabilitat» i «Editar obra» tenen una delegació d’esdeveniments reforçada perquè funcionin també després de filtrar o recalcular relacions.
- La factura impresa mostra «Referència obra» i «Segons pressupost» com a referències comercials; no hi imprimeix textos interns de vinculació.
- Obres té filtres per text, any, client, estat i vinculació, amb anys clicables i paginació per mantenir la pantalla ràpida.
- Cada obra s’obre en una fitxa amb pestanyes de resum, pressupostos, factures, certificacions, documentació, albarans, notes, temps/materials i rendiment.
- Des de la fitxa es poden revisar i guardar les relacions d’una factura amb l’obra i el pressupost, i veure el PDF o descarregar el fitxer original.
- La importació de pressupostos és incremental: reimportar els mateixos Excels actualitza dades buides o errònies i no duplica pressupostos, clients ni obres.
- La reparació global de dades no bloqueja el login ni es repeteix en cada canvi de pestanya; s’executa en segon pla quan és necessària.
- La fitxa d’obra s’obre com una finestra superior independent, amb pantalla completa al mòbil i totes les pestanyes de treball.
- Els anys clicables d’Obres sincronitzen el selector superior i filtren realment la llista.
- Factures té també botons ràpids d’any, a més del selector, i conserva el recompte real abans/després de cada importació.
- Reimportar una factura ja existent no la duplica: actualitza les dades buides i guarda el fitxer original si abans faltava.
- Els botons «Veure PDF», «Editar» i «Descarregar factura» continuen actius quan la fitxa és al modal superior.
- La pestanya Obres queda marcada en taronja i la fitxa s’obre sempre com una pantalla superior independent.
- Editar obra es fa dins d’un modal amb identificació pràctica, adreça d’obra, població, codi postal, client i preus hora; Guardar i Cancel·lar tanquen correctament.
- Des de la fitxa es pot obrir i editar el pressupost, crear factura parcial o certificació parcial amb línies i quantitats, afegir una partida nova d’administració/feina i previsualitzar-la.
- Les factures noves tenen numeració correlativa per any i neixen com a «Proforma pendent» fins a convertir-les en factura definitiva/Verifactu.
- La importació d’una factura existent es pot iniciar dins de la fitxa i manté la revisió de client, obra i pressupost abans de confirmar.
- Documentació i albarans es guarden dins de la fitxa; un albarà genera una línia de material pendent de revisar a Temps i materials.
- Temps i materials inclouen jornada, hores d’oficial i manobre, preu hora per obra o configuració, materials manuals i detecció bàsica des dels albarans.
- L’inici queda reduït a indicadors i obres recents; les accions principals es mantenen al menú lateral i dins de la fitxa.
- La identificació d’obra prioritza la dada que acompanya el camp «Obra» i no mostra el concepte com si fos una adreça.
- Les línies finals de l’Excel que comencen per «Nota», «Observacions» o són exclusions passen a observacions del pressupost; les línies de mesurament sense preu no es compten com a partides.
- Configuració incorpora observacions per defecte editables, que s’afegeixen als pressupostos nous; les importacions conserven les notes del seu Excel.
- Temps i materials disposen d’un quadre superior per dia amb oficial, manobre, preu/h, materials i total de jornada, amb guardat local immediat.
- El sistema visual de la fitxa, les targetes, taules i botons s’ha actualitzat per facilitar la lectura i l’ús en mòbil.
- El concepte de l’etiqueta «CONCEPTE/Concepto» es conserva encara que descrigui una feina com impermeabilització o coberta.
- Les observacions es llegeixen del bloc «NOTA/Observacions» de l’Excel i no s’hi afegeix el text genèric de l’aplicació als pressupostos importats.
- El quadre de jornades té pestanyes «Jornades», «Materials» i «Resum per dia»; cada alta s’obre en una pantalla superposada pròpia.
- Els pressupostos antics amb el patró «TREBALLS» es llegeixen separant cada treball real en concepte curt, descripció llarga, unitat, quantitat, preu/unitat i total.
- El patró del pressupost antic 875 queda interpretat com 3 partides reals; les línies «67,00 m² × preu = total» no es creen com partides independents.
- El bloc final «NOTA» / «Observacions» es conserva com observacions del pressupost i no entra en la suma ni en el recompte de partides.
- Pressupostos i obres disposen d’estats recomanats i filtres combinables per any, client, estat i relació.
- La fitxa de pressupost s’obre a pantalla completa, amb pestanyes de partides, capçalera/estat i observacions de l’Excel.
- Les fitxes importades en versions anteriors mostren un avís i s’han de reimportar des del mateix Excel perquè el lector nou pugui reconstruir les partides i les observacions; la reimportació actualitza el pressupost existent sense duplicar-lo.

Ús recomanat:

1. Obre Importar Excels.
2. Tria Factures o Certificacions.
3. Importa tots els pressupostos o diversos blocs, revisa el recompte i confirma; els repetits es reutilitzen i només s’afegeixen els que falten.
4. Entra a Obres / traçabilitat per veure la relació completa.

Configuració Render:

Root Directory: `teimor_v09_15_importacio_pantalles_superposades`
Build Command: `echo "No build needed"`
Publish Directory: `.`
