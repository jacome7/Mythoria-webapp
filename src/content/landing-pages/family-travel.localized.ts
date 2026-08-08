import {
  buildLocalizedBooks,
  commonTemplateIcons,
  getAreaServed,
  getLocalizedAssetBase,
  type LocalizedBookCopy,
  type LocalizedLandingLocale,
} from './localized-shared';
import type { LandingPageContent } from './types';

const sourceLandingSlug = 'livro-personalizado-ferias';

const slugs: Record<LocalizedLandingLocale, string> = {
  'en-US': 'personalized-vacation-book',
  'es-ES': 'libro-personalizado-vacaciones',
  'fr-FR': 'livre-personnalise-vacances',
};

const books: Record<LocalizedLandingLocale, LocalizedBookCopy[]> = {
  'en-US': [
    {
      sourceSlug: 'a-leonor-e-o-segredo-do-oceanario',
      title: 'Eleanor and the Aquarium Secret',
      synopsis:
        'A family visit to the New York Aquarium becomes a trail of clues when Eleanor spots a mysterious turtle in the vacation photos.',
      excerpt: 'The first clue shimmered on the glass beside the turtle in the photograph.',
      sampleTitle: 'The clue by the blue glass',
      sampleParagraphs: [
        'Eleanor took the first photo in the blue tunnel at the New York Aquarium just as a turtle drifted past, slowly enough to seem curious about the whole family.',
        'A tiny arrow made of bubbles appeared on the screen. Her mother could not see it on the glass, so they compared the photos and followed the safe visitor route to the next clue.',
      ],
      imageAlt: 'Personalized book Eleanor and the Aquarium Secret in a family reading scene',
      styleLabel: 'Watercolor',
      contextLabel: 'Aquarium and science',
      ageLabel: 'Ages 7–10',
      audioSampleTitle: 'Listen to the narrated excerpt',
    },
    {
      sourceSlug: 'o-verao-em-que-o-tomas-encontrou-uma-ilha',
      title: 'The Summer Thomas Found an Island',
      synopsis:
        'Cape Cod beaches, ice cream and sunset pictures lead Thomas to an island built from the moments his family shared.',
      excerpt:
        'The island appeared only when the family placed their favorite photos side by side.',
      sampleTitle: 'An island made of memories',
      sampleParagraphs: [
        'Thomas spread the Cape Cod vacation photos across the table: a red umbrella, a melting ice cream and four sandy pairs of feet.',
        'When he put them in the right order, their coastlines joined into a new island—one that existed only in the story his family could tell together.',
      ],
      imageAlt: 'Personalized vacation book about Thomas and a memory island',
      styleLabel: 'Watercolor',
      contextLabel: 'Beach vacation',
      ageLabel: 'Ages 6–9',
      audioSampleTitle: 'Listen to the narrated excerpt',
    },
    {
      sourceSlug: 'o-mapa-dos-dias-que-eram-so-nossos',
      title: 'The Map of the Days That Were Ours',
      synopsis:
        'A couple turns train tickets, café napkins and snapshots into a map of a trip that belongs only to them.',
      excerpt: 'Some maps show roads; theirs showed the moments they did not want to lose.',
      sampleTitle: 'The route between two cups of coffee',
      sampleParagraphs: [
        'Maya kept the receipt from the café at Grand Central because it marked the exact morning their careful Hudson Valley itinerary fell apart.',
        'Noah drew a line from that receipt to every photo that followed, creating a map of detours, jokes and quiet river views that no guidebook could contain.',
      ],
      imageAlt: 'Personalized couples travel book with a map and vacation keepsakes',
      styleLabel: 'Minimalist',
      contextLabel: 'Couples trip',
      ageLabel: 'Adults',
      audioSampleTitle: 'Listen to the narrated excerpt',
    },
    {
      sourceSlug: 'a-road-trip-dos-planos-impossiveis',
      title: 'The Road Trip of Impossible Plans',
      synopsis:
        'Four friends discover that missed exits, unusual diners and last-minute plans make the best chapters.',
      excerpt:
        'Their plan had twelve stops and no room at all for the story that actually happened.',
      sampleTitle: 'Exit 27 was not on the plan',
      sampleParagraphs: [
        'The navigation app said to turn around. The four friends voted to continue, mostly because the road ahead looked like the beginning of a film.',
        'Exit 27 led to a tiny Catskills diner, a wall of postcards and the first story they all agreed would have been impossible to schedule.',
      ],
      imageAlt: 'Personalized road-trip book featuring four friends and a car journey',
      styleLabel: 'Digital art',
      contextLabel: 'Friends road trip',
      ageLabel: 'Young adults',
      audioSampleTitle: 'Listen to the narrated excerpt',
    },
    {
      sourceSlug: 'o-quadro-que-piscou-o-olho',
      title: 'The Painting That Winked',
      synopsis:
        'During a museum visit, a child notices that one portrait changes expression in every family photo.',
      excerpt: 'In the third photograph, the painted explorer was definitely smiling.',
      sampleTitle: 'The portrait in the third photograph',
      sampleParagraphs: [
        'Eva reviewed the pictures on a bench at the Met while the adults checked the museum map. The explorer in the portrait looked serious in the first photo and amused in the second.',
        'In the third, he winked. Eva followed the painted compass in his hand and turned their New York visit into a gentle mystery for the whole family.',
      ],
      imageAlt: 'Personalized museum adventure book with a winking painted portrait',
      styleLabel: 'Colored pencil',
      contextLabel: 'Museum visit',
      ageLabel: 'Ages 7–10',
      audioSampleTitle: 'Listen to the narrated excerpt',
    },
    {
      sourceSlug: 'o-dia-em-que-a-quinta-falou',
      title: 'The Day the Farm Spoke',
      synopsis:
        'A family farm stay becomes a playful story when every animal seems to have a message for the visitors.',
      excerpt: 'The goat spoke first, although only Sophia understood what it meant.',
      sampleTitle: 'Good morning from the red barn',
      sampleParagraphs: [
        'Sophia woke at the Hudson Valley farm to a goat tapping the fence exactly three times. She decided it was a greeting and answered with three careful taps of her own.',
        'By lunchtime, the hens, the pony and even the old tractor had joined the conversation, each adding a new scene to the family vacation story.',
      ],
      imageAlt: 'Personalized family farm vacation book with friendly animals',
      styleLabel: 'Cartoon',
      contextLabel: 'Farm stay',
      ageLabel: 'Ages 4–7',
      audioSampleTitle: 'Listen to the narrated excerpt',
    },
    {
      sourceSlug: 'a-viagem-que-os-avos-tambem-viveram',
      title: 'The Trip the Grandparents Took Too',
      synopsis:
        'Old and new photographs reveal how two generations visited the same places in very different summers.',
      excerpt: 'The fountain had changed, but Grandpa still stood in exactly the same spot.',
      sampleTitle: 'Two summers in one square',
      sampleParagraphs: [
        'Lily held her phone beside the faded photograph in Savannah. The square looked brighter now, but the fountain and Grandpa’s crooked smile had hardly changed.',
        'The family paired every old image with a new one, weaving two vacations into a single story across generations.',
      ],
      imageAlt: 'Personalized intergenerational travel book comparing old and new photographs',
      styleLabel: 'Vintage',
      contextLabel: 'Family heritage trip',
      ageLabel: 'All ages',
      audioSampleTitle: 'Listen to the narrated excerpt',
    },
    {
      sourceSlug: 'antes-que-a-estrada-acabe',
      title: 'Before the Road Ends',
      synopsis:
        'A reflective solo journey turns small landscapes, voice notes and quiet stops into a personal travel chronicle.',
      excerpt: 'The road did not need to lead somewhere important to change the way she returned.',
      sampleTitle: 'The last overlook',
      sampleParagraphs: [
        'At the final overlook on the Pacific Coast, Emily recorded the wind, the distant traffic and one sentence she had been avoiding since the trip began.',
        'Later, those sounds and photographs became a chapter about slowing down, noticing more and returning with a clearer sense of home.',
      ],
      imageAlt: 'Personalized reflective travel book beside a quiet road and landscape',
      styleLabel: 'Oil painting',
      contextLabel: 'Solo journey',
      ageLabel: 'Adults',
      audioSampleTitle: 'Listen to the narrated excerpt',
    },
  ],
  'es-ES': [
    {
      sourceSlug: 'a-leonor-e-o-segredo-do-oceanario',
      title: 'Leonor y el secreto del acuario',
      synopsis:
        'Una visita familiar al Oceanogràfic de Valencia se convierte en una ruta de pistas cuando Leonor descubre una tortuga misteriosa en las fotos.',
      excerpt: 'La primera pista brillaba en el cristal, junto a la tortuga de la fotografía.',
      sampleTitle: 'La pista junto al cristal azul',
      sampleParagraphs: [
        'Leonor hizo la primera foto en el túnel azul del Oceanogràfic justo cuando una tortuga pasó tan despacio que parecía observar a toda la familia.',
        'En la pantalla apareció una flecha diminuta hecha de burbujas. Su madre no la veía en el cristal, así que compararon las fotos y siguieron el recorrido seguro hasta la siguiente pista.',
      ],
      imageAlt: 'Libro personalizado Leonor y el secreto del acuario en una lectura familiar',
      styleLabel: 'Acuarela',
      contextLabel: 'Acuario y ciencia',
      ageLabel: '7–10 años',
      audioSampleTitle: 'Escuchar el fragmento narrado',
    },
    {
      sourceSlug: 'o-verao-em-que-o-tomas-encontrou-uma-ilha',
      title: 'El verano en que Tomás encontró una isla',
      synopsis:
        'Las calas de la Costa Brava, los helados y las fotos al atardecer conducen a Tomás hasta una isla formada por los momentos compartidos en familia.',
      excerpt: 'La isla solo apareció cuando colocaron sus fotos favoritas una junto a otra.',
      sampleTitle: 'Una isla hecha de recuerdos',
      sampleParagraphs: [
        'Tomás extendió las fotos de la Costa Brava sobre la mesa: una sombrilla roja, un helado derritiéndose y cuatro pares de pies llenos de arena.',
        'Al colocarlas en el orden correcto, sus costas se unieron y formaron una isla nueva, una que solo existía en la historia que la familia podía contar junta.',
      ],
      imageAlt: 'Libro personalizado de vacaciones sobre Tomás y una isla de recuerdos',
      styleLabel: 'Acuarela',
      contextLabel: 'Vacaciones en la playa',
      ageLabel: '6–9 años',
      audioSampleTitle: 'Escuchar el fragmento narrado',
    },
    {
      sourceSlug: 'o-mapa-dos-dias-que-eram-so-nossos',
      title: 'El mapa de los días que eran solo nuestros',
      synopsis:
        'Una pareja convierte billetes de tren, servilletas y fotos en el mapa de un viaje que solo les pertenece a ellos.',
      excerpt:
        'Algunos mapas muestran carreteras; el suyo mostraba momentos que no querían perder.',
      sampleTitle: 'La ruta entre dos cafés',
      sampleParagraphs: [
        'Maya guardó el recibo de una cafetería de Atocha porque marcaba la mañana exacta en que su itinerario hacia Toledo dejó de funcionar.',
        'Noé trazó una línea desde aquel papel hasta cada foto posterior y creó un mapa de desvíos, bromas y paisajes castellanos.',
      ],
      imageAlt: 'Libro personalizado de viaje en pareja con un mapa y recuerdos',
      styleLabel: 'Minimalista',
      contextLabel: 'Viaje en pareja',
      ageLabel: 'Adultos',
      audioSampleTitle: 'Escuchar el fragmento narrado',
    },
    {
      sourceSlug: 'a-road-trip-dos-planos-impossiveis',
      title: 'El viaje por carretera de los planes imposibles',
      synopsis:
        'Cuatro amigos descubren que las salidas equivocadas, los bares inesperados y los planes de última hora crean los mejores capítulos.',
      excerpt:
        'Su plan tenía doce paradas y ningún espacio para la historia que ocurrió de verdad.',
      sampleTitle: 'La salida 27 no estaba en el plan',
      sampleParagraphs: [
        'El navegador decía que diesen la vuelta. Los cuatro votaron seguir, sobre todo porque la carretera parecía el comienzo de una película.',
        'La salida 27 los llevó a un pequeño mesón de Castilla, una pared de postales y la primera historia que jamás habrían podido programar.',
      ],
      imageAlt: 'Libro personalizado sobre un viaje por carretera entre amigos',
      styleLabel: 'Arte digital',
      contextLabel: 'Viaje con amigos',
      ageLabel: 'Jóvenes adultos',
      audioSampleTitle: 'Escuchar el fragmento narrado',
    },
    {
      sourceSlug: 'o-quadro-que-piscou-o-olho',
      title: 'El cuadro que guiñó un ojo',
      synopsis:
        'Durante una visita al museo, una niña descubre que un retrato cambia de expresión en cada foto familiar.',
      excerpt: 'En la tercera fotografía, el explorador pintado sonreía sin ninguna duda.',
      sampleTitle: 'El retrato de la tercera fotografía',
      sampleParagraphs: [
        'Eva revisó las fotos en un banco del Prado mientras los adultos consultaban el plano del museo. El explorador parecía serio en la primera y divertido en la segunda.',
        'En la tercera guiñaba un ojo. Eva siguió la brújula pintada en su mano y convirtió la visita a Madrid en un misterio tranquilo para toda la familia.',
      ],
      imageAlt: 'Libro personalizado de aventura en un museo con un retrato que guiña un ojo',
      styleLabel: 'Lápices de colores',
      contextLabel: 'Visita al museo',
      ageLabel: '7–10 años',
      audioSampleTitle: 'Escuchar el fragmento narrado',
    },
    {
      sourceSlug: 'o-dia-em-que-a-quinta-falou',
      title: 'El día en que habló la granja',
      synopsis:
        'Una estancia familiar en una granja se convierte en un relato divertido cuando cada animal parece tener un mensaje.',
      excerpt: 'La cabra habló primero, aunque solo Sofía entendió lo que quería decir.',
      sampleTitle: 'Buenos días desde el granero rojo',
      sampleParagraphs: [
        'Sofía se despertó en una granja asturiana con una cabra que golpeaba la valla exactamente tres veces. Decidió que era un saludo y respondió con otros tres golpes.',
        'A la hora de comer, las gallinas, el poni y hasta el viejo tractor se habían unido a la conversación y a la historia de las vacaciones.',
      ],
      imageAlt: 'Libro personalizado de vacaciones familiares en una granja con animales',
      styleLabel: 'Dibujo animado',
      contextLabel: 'Estancia en una granja',
      ageLabel: '4–7 años',
      audioSampleTitle: 'Escuchar el fragmento narrado',
    },
    {
      sourceSlug: 'a-viagem-que-os-avos-tambem-viveram',
      title: 'El viaje que también hicieron los abuelos',
      synopsis:
        'Fotos antiguas y nuevas revelan cómo dos generaciones visitaron los mismos lugares en veranos muy distintos.',
      excerpt: 'La fuente había cambiado, pero el abuelo seguía en el mismo lugar.',
      sampleTitle: 'Dos veranos en una sola plaza',
      sampleParagraphs: [
        'Lucía sostuvo el móvil junto a la fotografía descolorida en Salamanca. La plaza parecía más luminosa, pero la fuente y la sonrisa del abuelo apenas habían cambiado.',
        'La familia unió cada imagen antigua con una nueva y convirtió dos vacaciones en una historia compartida entre generaciones.',
      ],
      imageAlt:
        'Libro personalizado intergeneracional que compara fotos antiguas y nuevas de un viaje',
      styleLabel: 'Vintage',
      contextLabel: 'Viaje a las raíces familiares',
      ageLabel: 'Todas las edades',
      audioSampleTitle: 'Escuchar el fragmento narrado',
    },
    {
      sourceSlug: 'antes-que-a-estrada-acabe',
      title: 'Antes de que termine la carretera',
      synopsis:
        'Un viaje en solitario convierte paisajes, notas de voz y paradas tranquilas en una crónica personal.',
      excerpt: 'La carretera no tenía que llevar a un lugar importante para cambiar su regreso.',
      sampleTitle: 'El último mirador',
      sampleParagraphs: [
        'En el último mirador de la sierra de Guadarrama, Elena grabó el viento, el tráfico lejano y una frase que había evitado desde el comienzo del viaje.',
        'Después, aquellos sonidos y fotografías se transformaron en un capítulo sobre avanzar despacio, observar más y volver a casa con claridad.',
      ],
      imageAlt: 'Libro personalizado de viaje reflexivo junto a una carretera tranquila',
      styleLabel: 'Pintura al óleo',
      contextLabel: 'Viaje en solitario',
      ageLabel: 'Adultos',
      audioSampleTitle: 'Escuchar el fragmento narrado',
    },
  ],
  'fr-FR': [
    {
      sourceSlug: 'a-leonor-e-o-segredo-do-oceanario',
      title: 'Léonie et le secret de l’aquarium',
      synopsis:
        'Une visite familiale à l’Aquarium de Paris devient une piste aux indices lorsque Léonie remarque une tortue mystérieuse sur les photos.',
      excerpt: 'Le premier indice brillait sur la vitre, juste à côté de la tortue photographiée.',
      sampleTitle: 'L’indice près de la vitre bleue',
      sampleParagraphs: [
        'Léonie prit la première photo dans le tunnel bleu de l’Aquarium de Paris au moment où une tortue passait si lentement qu’elle semblait observer toute la famille.',
        'Une petite flèche faite de bulles apparut sur l’écran. Sa mère ne la voyait pas sur la vitre : elles comparèrent les images et suivirent le parcours jusqu’au prochain indice.',
      ],
      imageAlt: 'Livre personnalisé Léonie et le secret de l’aquarium lu en famille',
      styleLabel: 'Aquarelle',
      contextLabel: 'Aquarium et sciences',
      ageLabel: '7–10 ans',
      audioSampleTitle: 'Écouter l’extrait raconté',
    },
    {
      sourceSlug: 'o-verao-em-que-o-tomas-encontrou-uma-ilha',
      title: 'L’été où Thomas découvrit une île',
      synopsis:
        'Les plages de l’île de Ré, les glaces et les photos au coucher du soleil conduisent Thomas vers une île faite des moments partagés en famille.',
      excerpt: 'L’île n’apparut que lorsque la famille plaça ses photos préférées côte à côte.',
      sampleTitle: 'Une île faite de souvenirs',
      sampleParagraphs: [
        'Thomas étala les photos de l’île de Ré sur la table : un parasol rouge, une glace qui fondait et quatre paires de pieds couverts de sable.',
        'Lorsqu’il les plaça dans le bon ordre, leurs côtes formèrent une île nouvelle, née de l’histoire que la famille pouvait raconter ensemble.',
      ],
      imageAlt: 'Livre personnalisé de vacances sur Thomas et une île de souvenirs',
      styleLabel: 'Aquarelle',
      contextLabel: 'Vacances à la plage',
      ageLabel: '6–9 ans',
      audioSampleTitle: 'Écouter l’extrait raconté',
    },
    {
      sourceSlug: 'o-mapa-dos-dias-que-eram-so-nossos',
      title: 'La carte des jours qui n’appartenaient qu’à nous',
      synopsis:
        'Un couple transforme billets de train, serviettes de café et photos en une carte de leur voyage à deux.',
      excerpt:
        'Certaines cartes montrent des routes ; la leur montrait les instants qu’ils refusaient de perdre.',
      sampleTitle: 'Le chemin entre deux cafés',
      sampleParagraphs: [
        'Manon conserva le ticket d’un café de la gare de Lyon, car il marquait le matin précis où leur itinéraire vers la Provence avait déraillé.',
        'Noé traça une ligne entre ce ticket et chaque photo suivante, dessinant une carte de détours, de plaisanteries et de paysages provençaux.',
      ],
      imageAlt: 'Livre personnalisé de voyage en couple avec une carte et des souvenirs',
      styleLabel: 'Minimaliste',
      contextLabel: 'Voyage en couple',
      ageLabel: 'Adultes',
      audioSampleTitle: 'Écouter l’extrait raconté',
    },
    {
      sourceSlug: 'a-road-trip-dos-planos-impossiveis',
      title: 'Le road trip des projets impossibles',
      synopsis:
        'Quatre amis découvrent que les sorties manquées, les petits restaurants et les idées de dernière minute font les meilleurs chapitres.',
      excerpt:
        'Leur programme comptait douze étapes et aucune place pour l’histoire qui arriva vraiment.',
      sampleTitle: 'La sortie 27 n’était pas prévue',
      sampleParagraphs: [
        'Le GPS leur ordonnait de faire demi-tour. Les quatre amis votèrent pour continuer, surtout parce que la route ressemblait au début d’un film.',
        'La sortie 27 les mena vers une petite auberge normande, un mur de cartes postales et une histoire qu’aucun planning n’aurait pu prévoir.',
      ],
      imageAlt: 'Livre personnalisé consacré au road trip de quatre amis',
      styleLabel: 'Art numérique',
      contextLabel: 'Road trip entre amis',
      ageLabel: 'Jeunes adultes',
      audioSampleTitle: 'Écouter l’extrait raconté',
    },
    {
      sourceSlug: 'o-quadro-que-piscou-o-olho',
      title: 'Le tableau qui fit un clin d’œil',
      synopsis:
        'Pendant une visite au musée, une enfant remarque qu’un portrait change d’expression sur chaque photo familiale.',
      excerpt: 'Sur la troisième photo, l’explorateur peint souriait, c’était certain.',
      sampleTitle: 'Le portrait de la troisième photo',
      sampleParagraphs: [
        'Éva regarda les images sur un banc du Louvre pendant que les adultes consultaient le plan du musée. L’explorateur semblait sérieux sur la première et amusé sur la deuxième.',
        'Sur la troisième, il lui faisait un clin d’œil. Éva suivit la boussole peinte dans sa main et transforma la visite à Paris en un doux mystère familial.',
      ],
      imageAlt: 'Livre personnalisé d’aventure au musée avec un portrait qui fait un clin d’œil',
      styleLabel: 'Crayons de couleur',
      contextLabel: 'Visite au musée',
      ageLabel: '7–10 ans',
      audioSampleTitle: 'Écouter l’extrait raconté',
    },
    {
      sourceSlug: 'o-dia-em-que-a-quinta-falou',
      title: 'Le jour où la ferme parla',
      synopsis:
        'Un séjour familial à la ferme devient une histoire amusante lorsque chaque animal semble avoir un message.',
      excerpt: 'La chèvre parla la première, même si seule Sophie comprit ce qu’elle voulait dire.',
      sampleTitle: 'Bonjour depuis la grange rouge',
      sampleParagraphs: [
        'Sophie se réveilla dans une ferme normande lorsqu’une chèvre frappa exactement trois fois contre la clôture. Elle décida que c’était un salut et répondit de la même façon.',
        'À midi, les poules, le poney et même le vieux tracteur participaient à la conversation et ajoutaient une scène aux vacances familiales.',
      ],
      imageAlt: 'Livre personnalisé de vacances familiales à la ferme avec des animaux',
      styleLabel: 'Dessin animé',
      contextLabel: 'Séjour à la ferme',
      ageLabel: '4–7 ans',
      audioSampleTitle: 'Écouter l’extrait raconté',
    },
    {
      sourceSlug: 'a-viagem-que-os-avos-tambem-viveram',
      title: 'Le voyage que les grands-parents avaient aussi vécu',
      synopsis:
        'Des photos anciennes et nouvelles montrent comment deux générations ont visité les mêmes lieux durant des étés très différents.',
      excerpt: 'La fontaine avait changé, mais Grand-père se tenait exactement au même endroit.',
      sampleTitle: 'Deux étés sur une seule place',
      sampleParagraphs: [
        'Léa plaça son téléphone près de la photo décolorée sur une place de Provence. La place paraissait plus lumineuse, mais la fontaine et le sourire de Grand-père avaient peu changé.',
        'La famille associa chaque ancienne image à une nouvelle et réunit deux vacances dans une seule histoire entre générations.',
      ],
      imageAlt:
        'Livre personnalisé intergénérationnel comparant des photos de voyage anciennes et nouvelles',
      styleLabel: 'Vintage',
      contextLabel: 'Voyage sur les traces familiales',
      ageLabel: 'Tous âges',
      audioSampleTitle: 'Écouter l’extrait raconté',
    },
    {
      sourceSlug: 'antes-que-a-estrada-acabe',
      title: 'Avant que la route ne s’arrête',
      synopsis:
        'Un voyage en solitaire transforme paysages, notes vocales et haltes paisibles en chronique personnelle.',
      excerpt:
        'La route n’avait pas besoin de mener vers un lieu important pour changer son retour.',
      sampleTitle: 'Le dernier belvédère',
      sampleParagraphs: [
        'Au dernier belvédère des Cévennes, Élise enregistra le vent, la circulation lointaine et une phrase qu’elle évitait depuis le début du voyage.',
        'Ces sons et ces photos devinrent ensuite un chapitre sur le fait de ralentir, de mieux observer et de rentrer avec une idée plus claire de chez soi.',
      ],
      imageAlt: 'Livre personnalisé de voyage introspectif près d’une route paisible',
      styleLabel: 'Peinture à l’huile',
      contextLabel: 'Voyage en solitaire',
      ageLabel: 'Adultes',
      audioSampleTitle: 'Écouter l’extrait raconté',
    },
  ],
};

const pageCopy = {
  'en-US': {
    title: 'Personalized vacation books that preserve the story behind your photos',
    metaTitle: 'Personalized Vacation and Travel Book | Mythoria',
    metaDescription:
      'Turn vacation photos, places and small family moments into a personalized story to read, listen to, print or give as a gift.',
    breadcrumb: 'Vacation Book',
    primaryCta: 'Create my vacation book',
    secondaryCta: 'See travel book examples',
    cardTitle: 'Personalized vacation book',
    cardDescription: 'Turn photos, places and small moments into a travel story.',
    eyebrow: 'Travel memories · personalized books',
    headline: 'Turn your vacation photos into a personalized story.',
    subheadline:
      'Photos show where you went. Mythoria helps tell what happened—with people, places and details that make the trip uniquely yours.',
    imageAlt: 'A family revisiting vacation memories through a personalized book and photos',
    quickTitle: 'A narrative keepsake, not an automatic photo book',
    quickBody:
      'A Mythoria book uses the memories, photos and details you choose to create a personalized narrative. It does not automatically arrange hundreds of images like a classic photo book. Instead, it turns the moments that matter into a story you can review, read, listen to, share, print or give, depending on the options available.',
    introTitle: 'The best memories should not disappear into your camera roll',
    introBody: [
      'Trips leave us with beaches, streets, laughter and tiny stories scattered across dozens of photos.',
      'Choosing the moments that matter preserves more than an image: it keeps who was there, what went off plan and the line everyone still repeats.',
    ],
    fitTitle: 'A book about the adventure behind the photographs',
    fitBody: [
      'Combine people, places and memories with the narrative style you prefer—from a child’s adventure to a family chronicle or road diary.',
      'Start with a few images and essential details, then review the text and illustrations before deciding how to keep or share the story.',
    ],
    benefitsTitle: 'A thoughtful way to revisit a trip',
    benefits: [
      'Choose only the photos and details that serve the story.',
      'Review names, text and images before sharing.',
      'Keep the draft private by default.',
      'Create for a child, couple, family, friends or a solo journey.',
    ],
    booksTitle: 'A different journey in every book',
    booksIntro: 'Open a chapter, see the illustration and listen to a localized excerpt.',
    processTitle: 'From camera roll to finished story',
    process: [
      'Choose the trip and the people who belong in the book.',
      'Add a few photos, places and moments worth remembering.',
      'Select the tone, audience and visual style.',
      'Review and adjust the words, names and images.',
      'Share, listen, print or order only when you are ready.',
    ],
    formatsTitle: 'Ways to enjoy the story',
    formats: [
      'Private digital reading.',
      'Localized audio when available.',
      'Self-print PDF when available.',
      'Printed book depending on destination and availability.',
    ],
    faq: [
      [
        'Is this an automatic photo book?',
        'No. You choose the meaningful photos and details, and Mythoria turns them into a narrative you can review.',
      ],
      [
        'How many photos do I need?',
        'You can begin with only a few images. Context and memories matter more than uploading an entire camera roll.',
      ],
      [
        'Can I make the book for adults?',
        'Yes. The tone can suit children, adults, couples, families, friends or a solo traveler.',
      ],
      [
        'Can I edit the result?',
        'Yes. Review names, dates, text and images before sharing, printing or giving the book.',
      ],
      [
        'Does the story stay private?',
        'It remains private by default until you deliberately use an available sharing option.',
      ],
    ],
    finalTitle: 'Your next chapter may already be in your photos.',
    finalBody:
      'Choose one trip and a few details. Mythoria will help you shape them into a story worth revisiting.',
    about: ['Personalized vacation books', 'Travel memories', 'Family keepsakes'],
    serviceName: 'Mythoria personalized vacation book',
    serviceType: 'Personalized digital, audio, PDF and printed book',
  },
  'es-ES': {
    title: 'Libros personalizados para conservar la historia de tus vacaciones',
    metaTitle: 'Libro personalizado de vacaciones y viajes | Mythoria',
    metaDescription:
      'Convierte fotos, lugares y pequeños momentos de las vacaciones en una historia personalizada para leer, escuchar, imprimir o regalar.',
    breadcrumb: 'Libro de vacaciones',
    primaryCta: 'Crear mi libro de vacaciones',
    secondaryCta: 'Ver ejemplos de libros de viaje',
    cardTitle: 'Libro personalizado de vacaciones',
    cardDescription: 'Convierte fotos, lugares y pequeños momentos en una historia de viaje.',
    eyebrow: 'Recuerdos de viaje · libros personalizados',
    headline: 'Convierte las fotos de tus vacaciones en una historia personalizada.',
    subheadline:
      'Las fotos muestran dónde estuviste. Mythoria te ayuda a contar lo que viviste con las personas, lugares y detalles que hacen único el viaje.',
    imageAlt: 'Una familia revive sus vacaciones con un libro personalizado y fotografías',
    quickTitle: 'Un recuerdo narrativo, no un álbum automático',
    quickBody:
      'Un libro de Mythoria parte de los recuerdos, fotos y detalles que eliges para crear una narración personalizada. No organiza automáticamente cientos de imágenes como un fotolibro clásico. Convierte los momentos importantes en una historia que puedes revisar, leer, escuchar, compartir, imprimir o regalar, según las opciones disponibles.',
    introTitle: 'Los mejores recuerdos no deberían perderse en el carrete',
    introBody: [
      'Volvemos con playas, calles, risas y pequeñas historias repartidas entre decenas de fotografías.',
      'Elegir los momentos importantes conserva algo más que la imagen: quién estaba allí, qué salió distinto y esa frase que la familia sigue repitiendo.',
    ],
    fitTitle: 'Un libro sobre la aventura que hay detrás de las fotos',
    fitBody: [
      'Combina personas, lugares y recuerdos con el estilo narrativo que prefieras: aventura infantil, crónica familiar o diario de carretera.',
      'Empieza con unas pocas imágenes y los detalles esenciales; después revisa el texto y las ilustraciones antes de compartir.',
    ],
    benefitsTitle: 'Una forma cuidada de volver al viaje',
    benefits: [
      'Elige solo las fotos y detalles que sirven a la historia.',
      'Revisa nombres, texto e imágenes antes de compartir.',
      'Mantén el borrador privado por defecto.',
      'Crea para niños, parejas, familias, amigos o viajeros en solitario.',
    ],
    booksTitle: 'Un viaje diferente en cada libro',
    booksIntro: 'Abre un capítulo, mira la ilustración y escucha un fragmento localizado.',
    processTitle: 'Del carrete a una historia terminada',
    process: [
      'Elige el viaje y las personas que aparecerán.',
      'Añade algunas fotos, lugares y momentos importantes.',
      'Selecciona el tono, el público y el estilo visual.',
      'Revisa y ajusta palabras, nombres e imágenes.',
      'Comparte, escucha, imprime o encarga cuando estés listo.',
    ],
    formatsTitle: 'Formas de disfrutar la historia',
    formats: [
      'Lectura digital privada.',
      'Audio localizado cuando esté disponible.',
      'PDF para imprimir cuando esté disponible.',
      'Libro impreso según destino y disponibilidad.',
    ],
    faq: [
      [
        '¿Es un fotolibro automático?',
        'No. Tú eliges las fotos y detalles importantes, y Mythoria los transforma en una narración que puedes revisar.',
      ],
      [
        '¿Cuántas fotos necesito?',
        'Puedes empezar con muy pocas. El contexto y los recuerdos importan más que subir todo el carrete.',
      ],
      [
        '¿Puedo crear un libro para adultos?',
        'Sí. El tono puede adaptarse a niños, adultos, parejas, familias, amigos o viajeros en solitario.',
      ],
      [
        '¿Puedo editar el resultado?',
        'Sí. Revisa nombres, fechas, texto e imágenes antes de compartir, imprimir o regalar.',
      ],
      [
        '¿La historia se mantiene privada?',
        'Permanece privada por defecto hasta que utilices de forma intencionada una opción de compartir.',
      ],
    ],
    finalTitle: 'Tu próximo capítulo puede estar ya entre tus fotos.',
    finalBody:
      'Elige un viaje y algunos detalles. Mythoria te ayudará a convertirlos en una historia a la que volver.',
    about: ['Libros personalizados de vacaciones', 'Recuerdos de viaje', 'Recuerdos familiares'],
    serviceName: 'Libro personalizado de vacaciones Mythoria',
    serviceType: 'Libro personalizado digital, audio, PDF e impreso',
  },
  'fr-FR': {
    title: 'Des livres personnalisés pour raconter vos vacances',
    metaTitle: 'Livre personnalisé de vacances et de voyage | Mythoria',
    metaDescription:
      'Transformez photos, lieux et petits moments de vacances en une histoire personnalisée à lire, écouter, imprimer ou offrir.',
    breadcrumb: 'Livre de vacances',
    primaryCta: 'Créer mon livre de vacances',
    secondaryCta: 'Voir des exemples de livres de voyage',
    cardTitle: 'Livre personnalisé de vacances',
    cardDescription: 'Transformez photos, lieux et petits moments en une histoire de voyage.',
    eyebrow: 'Souvenirs de voyage · livres personnalisés',
    headline: 'Transformez vos photos de vacances en une histoire personnalisée.',
    subheadline:
      'Les photos montrent où vous étiez. Mythoria vous aide à raconter ce que vous avez vécu, avec les personnes, les lieux et les détails qui rendent ce voyage unique.',
    imageAlt: 'Une famille redécouvre ses vacances grâce à un livre personnalisé et des photos',
    quickTitle: 'Un souvenir narratif, pas un album photo automatique',
    quickBody:
      'Un livre Mythoria s’appuie sur les souvenirs, photos et détails que vous choisissez afin de créer un récit personnalisé. Il ne classe pas automatiquement des centaines d’images comme un album classique. Il transforme les moments essentiels en une histoire que vous pouvez relire, écouter, partager, imprimer ou offrir selon les options disponibles.',
    introTitle: 'Les meilleurs souvenirs ne devraient pas se perdre dans votre téléphone',
    introBody: [
      'Nous rentrons avec des plages, des rues, des rires et de petites histoires dispersées dans des dizaines de photos.',
      'Choisir les moments importants permet de garder davantage qu’une image : les personnes présentes, l’imprévu et la phrase que toute la famille répète encore.',
    ],
    fitTitle: 'Un livre sur l’aventure cachée derrière les photos',
    fitBody: [
      'Associez personnes, lieux et souvenirs au style de votre choix : aventure pour enfants, chronique familiale ou carnet de route.',
      'Commencez avec quelques images et détails essentiels, puis relisez le texte et vérifiez les illustrations avant de partager.',
    ],
    benefitsTitle: 'Une façon attentive de revivre le voyage',
    benefits: [
      'Choisissez uniquement les photos et détails utiles au récit.',
      'Vérifiez les noms, le texte et les images avant de partager.',
      'Gardez le brouillon privé par défaut.',
      'Créez pour un enfant, un couple, une famille, des amis ou un voyage en solo.',
    ],
    booksTitle: 'Un voyage différent dans chaque livre',
    booksIntro: 'Ouvrez un chapitre, regardez l’illustration et écoutez un extrait localisé.',
    processTitle: 'De la galerie photo à l’histoire terminée',
    process: [
      'Choisissez le voyage et les personnes présentes dans le livre.',
      'Ajoutez quelques photos, lieux et moments importants.',
      'Sélectionnez le ton, le public et le style visuel.',
      'Relisez et ajustez les mots, les noms et les images.',
      'Partagez, écoutez, imprimez ou commandez lorsque vous êtes prêt.',
    ],
    formatsTitle: 'Différentes façons de profiter de l’histoire',
    formats: [
      'Lecture numérique privée.',
      'Audio localisé lorsqu’il est disponible.',
      'PDF à imprimer lorsqu’il est disponible.',
      'Livre imprimé selon la destination et la disponibilité.',
    ],
    faq: [
      [
        'S’agit-il d’un album photo automatique ?',
        'Non. Vous choisissez les photos et détails importants, puis Mythoria les transforme en un récit que vous pouvez relire.',
      ],
      [
        'Combien de photos faut-il ?',
        'Vous pouvez commencer avec quelques images seulement. Le contexte et les souvenirs comptent davantage qu’une galerie complète.',
      ],
      [
        'Puis-je créer un livre pour adultes ?',
        'Oui. Le ton peut convenir aux enfants, adultes, couples, familles, amis ou voyageurs en solo.',
      ],
      [
        'Puis-je modifier le résultat ?',
        'Oui. Vérifiez les noms, dates, textes et images avant de partager, imprimer ou offrir.',
      ],
      [
        'L’histoire reste-t-elle privée ?',
        'Elle reste privée par défaut jusqu’à ce que vous utilisiez volontairement une option de partage.',
      ],
    ],
    finalTitle: 'Votre prochain chapitre se trouve peut-être déjà dans vos photos.',
    finalBody:
      'Choisissez un voyage et quelques détails. Mythoria vous aidera à en faire une histoire à redécouvrir.',
    about: ['Livres personnalisés de vacances', 'Souvenirs de voyage', 'Souvenirs de famille'],
    serviceName: 'Livre personnalisé de vacances Mythoria',
    serviceType: 'Livre personnalisé numérique, audio, PDF et imprimé',
  },
} as const;

function createFamilyTravelLandingPage(locale: LocalizedLandingLocale): LandingPageContent {
  const copy = pageCopy[locale];
  const slug = slugs[locale];
  const assetBase = getLocalizedAssetBase(sourceLandingSlug, locale);

  return {
    translationKey: 'family-travel',
    slug,
    locale,
    title: copy.title,
    metaTitle: copy.metaTitle,
    metaDescription: copy.metaDescription,
    primaryIntent: 'family_travels',
    riskRating: 'yellow',
    updatedAt: '2026-08-04',
    indexable: true,
    showFormatsNearHero: false,
    showEditorialReview: true,
    breadcrumbLabel: copy.breadcrumb,
    ogImageSrc: `${assetBase}/hero/og-cover.jpeg`,
    primaryCta: copy.primaryCta,
    primaryCtaHref: `/${locale}/tell-your-story/step-1?landingSlug=${slug}&primaryIntent=family_travels`,
    secondaryCta: copy.secondaryCta,
    secondaryCtaHref: '#exemplos',
    homepageCard: { title: copy.cardTitle, description: copy.cardDescription },
    analytics: { pageViewEvent: 'landing_page_view', variant: `family-travel-${locale}` },
    templateIcons: commonTemplateIcons,
    booksSection: { title: copy.booksTitle, intro: copy.booksIntro },
    hero: {
      eyebrow: copy.eyebrow,
      headline: copy.headline,
      subheadline: copy.subheadline,
      imageSrc: `${assetBase}/hero/hero.jpeg`,
      imageAlt: copy.imageAlt,
    },
    quickAnswer: { title: copy.quickTitle, body: copy.quickBody },
    intro: { title: copy.introTitle, body: [...copy.introBody] },
    whyThisFits: { title: copy.fitTitle, body: [...copy.fitBody] },
    carefulBenefits: { title: copy.benefitsTitle, items: [...copy.benefits] },
    books: buildLocalizedBooks({
      translationKey: 'family-travel',
      sourceLandingSlug,
      locale,
      books: books[locale],
    }),
    process: { title: copy.processTitle, steps: [...copy.process] },
    formats: { title: copy.formatsTitle, items: [...copy.formats] },
    faq: copy.faq.map(([question, answer]) => ({ question, answer })),
    safetyNote: {
      title:
        locale === 'en-US'
          ? 'Keep private details out of the travel story'
          : locale === 'es-ES'
            ? 'Evita incluir datos privados en la historia del viaje'
            : 'Évitez les informations privées dans le récit de voyage',
      body:
        locale === 'en-US'
          ? 'Use only photos and information you are allowed to share, especially when other people or children appear.'
          : locale === 'es-ES'
            ? 'Utiliza únicamente fotos e información que tengas derecho a compartir, especialmente si aparecen otras personas o menores.'
            : 'Utilisez uniquement des photos et informations que vous êtes autorisé à partager, notamment lorsque d’autres personnes ou des enfants apparaissent.',
    },
    finalCta: { title: copy.finalTitle, body: copy.finalBody },
    structuredData: {
      about: [...copy.about],
      serviceName: copy.serviceName,
      serviceType: copy.serviceType,
      areaServed: getAreaServed(locale),
    },
  };
}

export const familyTravelLocalizedLandingPages = (['en-US', 'es-ES', 'fr-FR'] as const).map(
  createFamilyTravelLandingPage,
);
