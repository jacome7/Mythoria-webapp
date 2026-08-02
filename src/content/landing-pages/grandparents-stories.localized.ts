import {
  buildLocalizedBooks,
  commonTemplateIcons,
  getAreaServed,
  getLocalizedAssetBase,
  type LocalizedBookCopy,
  type LocalizedLandingLocale,
} from './localized-shared';
import type { LandingPageContent } from './types';

const sourceLandingSlug = 'livro-personalizado-avos-netos';

const slugs: Record<LocalizedLandingLocale, string> = {
  'en-US': 'personalized-book-for-grandparents-and-grandchildren',
  'es-ES': 'libro-personalizado-para-abuelos-y-nietos',
  'fr-FR': 'livre-personnalise-pour-grands-parents-et-petits-enfants',
};

const labels = {
  'en-US': { audio: 'Listen to the narrated excerpt' },
  'es-ES': { audio: 'Escuchar el fragmento narrado' },
  'fr-FR': { audio: 'Écouter l’extrait raconté' },
} as const;

function book(
  locale: LocalizedLandingLocale,
  data: Omit<LocalizedBookCopy, 'audioSampleTitle'>,
): LocalizedBookCopy {
  return {
    ...data,
    audioSampleTitle: labels[locale].audio,
  };
}

const books: Record<LocalizedLandingLocale, LocalizedBookCopy[]> = {
  'en-US': [
    book('en-US', {
      sourceSlug: 'a-receita-das-estrelas-da-avo',
      title: 'Grandma’s Recipe for Stars',
      synopsis:
        'In a New England kitchen, Grandma Claire teaches Noah that every family recipe begins with a word that feels like home.',
      excerpt:
        'Grandma said recipes did not begin with ingredients, but with the hands that called everyone to the table.',
      sampleTitle: 'The First Cinnamon Star',
      sampleParagraphs: [
        'Noah held the wooden spoon with both hands while Grandma Claire read the old recipe. “Say a word that reminds you of home,” she told him.',
        'When he whispered “hug,” a tiny golden star rose from the bowl and added a new line to the recipe they would remember together.',
      ],
      imageAlt: 'Personalized book Grandma’s Recipe for Stars in a warm family kitchen',
      styleLabel: 'Colored pencil',
      contextLabel: 'Family recipe',
      ageLabel: 'Ages 4–7',
    }),
    book('en-US', {
      sourceSlug: 'o-comboio-dos-domingos-do-avo',
      title: 'Grandpa’s Sunday Train',
      synopsis:
        'Every Sunday, Grandpa Robert and his grandson build a cardboard train that travels through memories from different years.',
      excerpt: 'The train never left the living room, yet every Sunday it reached somewhere new.',
      sampleTitle: 'Tickets for the Living Room Express',
      sampleParagraphs: [
        'Grandpa Robert punched two paper tickets and announced that the sofa was now Track One. His grandson chose the first destination from an old photograph.',
        'The cardboard train crossed a small town, a summer on the Jersey Shore and a snowy morning, carrying family stories into one more Sunday.',
      ],
      imageAlt: 'Personalized grandparents book about a cardboard Sunday train',
      styleLabel: 'Cartoon',
      contextLabel: 'Shared ritual',
      ageLabel: 'Ages 5–8',
    }),
    book('en-US', {
      sourceSlug: 'a-mala-que-falava-portugues',
      title: 'The Suitcase That Spoke Portuguese',
      synopsis:
        'A suitcase filled with recipes, sayings and photographs helps a multilingual family connect children with their grandparents’ language.',
      excerpt: 'Every time the suitcase opened, one family word found its way back home.',
      sampleTitle: 'The Word Hidden in the Pocket',
      sampleParagraphs: [
        'Mia opened the smallest pocket and found a card with one Portuguese word in Grandma’s handwriting. She called across the ocean to hear it spoken aloud.',
        'Soon the suitcase was full of two languages, familiar voices and stories that made every Sunday call feel a little closer.',
      ],
      imageAlt: 'Personalized multilingual family book featuring a suitcase of memories',
      styleLabel: 'Watercolor',
      contextLabel: 'Multilingual family',
      ageLabel: 'Ages 6–10',
    }),
    book('en-US', {
      sourceSlug: 'o-jardim-das-fotografias-antigas',
      title: 'The Garden of Old Photographs',
      synopsis:
        'A grandchild discovers that every old family photograph can grow into a new story when Grandpa explains what happened outside the frame.',
      excerpt:
        'The photographs did not bloom in the sun; they bloomed when Grandpa began to speak.',
      sampleTitle: 'The Photograph Beneath the Lemon Tree',
      sampleParagraphs: [
        'Lily found a photograph beneath the apple tree and asked why Grandpa was wearing a hat much too large for him.',
        'His answer opened a summer afternoon, a borrowed bicycle and a joke that had waited fifty years to make a grandchild laugh.',
      ],
      imageAlt: 'Personalized intergenerational book with old photographs in a garden',
      styleLabel: 'Vintage',
      contextLabel: 'Family memories',
      ageLabel: 'All ages',
    }),
    book('en-US', {
      sourceSlug: 'as-ferias-na-casa-amarela',
      title: 'Summer at the Yellow House',
      synopsis:
        'Grandchildren revisit the yellow house where their family vacations were shaped by simple games, shared meals and stories after sunset.',
      excerpt:
        'The yellow house was smaller than they remembered and somehow held even more stories.',
      sampleTitle: 'The Key Under the Blue Pot',
      sampleParagraphs: [
        'Grandma lifted the blue flowerpot at the yellow Lake Michigan cottage and found the same brass key she had used every summer. The grandchildren counted the marks beside the door.',
        'Each mark became a chapter about long lunches, improvised games and evenings when the whole family stayed outside until the stars appeared.',
      ],
      imageAlt: 'Personalized grandparents and grandchildren vacation book at a yellow house',
      styleLabel: 'Watercolor',
      contextLabel: 'Family vacation',
      ageLabel: 'Ages 5–9',
    }),
  ],
  'es-ES': [
    book('es-ES', {
      sourceSlug: 'a-receita-das-estrelas-da-avo',
      title: 'La receta de estrellas de la abuela',
      synopsis:
        'En una cocina valenciana con azulejos azules, la abuela Celia enseña a Nico que cada receta familiar empieza con una palabra que recuerda al hogar.',
      excerpt:
        'La abuela decía que las recetas no empezaban con ingredientes, sino con las manos que llamaban a la familia a la mesa.',
      sampleTitle: 'La primera estrella de canela',
      sampleParagraphs: [
        'Nico sujetó la cuchara de madera con las dos manos mientras la abuela Celia leía la vieja receta. «Di una palabra que te recuerde a casa», le pidió.',
        'Cuando susurró «abrazo», una pequeña estrella dorada salió del cuenco y añadió una nueva línea a la receta que recordarían juntos.',
      ],
      imageAlt: 'Libro personalizado La receta de estrellas de la abuela en una cocina familiar',
      styleLabel: 'Lápices de colores',
      contextLabel: 'Receta familiar',
      ageLabel: '4–7 años',
    }),
    book('es-ES', {
      sourceSlug: 'o-comboio-dos-domingos-do-avo',
      title: 'El tren de los domingos del abuelo',
      synopsis:
        'Cada domingo, el abuelo Raúl y su nieto construyen un tren de cartón que viaja por recuerdos de años distintos.',
      excerpt: 'El tren nunca salió del salón, pero cada domingo llegaba a un lugar nuevo.',
      sampleTitle: 'Billetes para el Expreso del Salón',
      sampleParagraphs: [
        'El abuelo Raúl picó dos billetes de papel y anunció que el sofá era el andén uno. Su nieto eligió el primer destino en una fotografía antigua.',
        'El tren de cartón cruzó un pueblo de Castilla, un verano en la costa mediterránea y una mañana de nieve, llevando las historias familiares hasta otro domingo.',
      ],
      imageAlt: 'Libro personalizado sobre abuelos y un tren de cartón de los domingos',
      styleLabel: 'Dibujo animado',
      contextLabel: 'Ritual compartido',
      ageLabel: '5–8 años',
    }),
    book('es-ES', {
      sourceSlug: 'a-mala-que-falava-portugues',
      title: 'La maleta que hablaba portugués',
      synopsis:
        'Una maleta llena de recetas, expresiones y fotos ayuda a una familia multilingüe a acercar a los niños a la lengua de sus abuelos.',
      excerpt:
        'Cada vez que la maleta se abría, una palabra familiar encontraba el camino de vuelta a casa.',
      sampleTitle: 'La palabra escondida en el bolsillo',
      sampleParagraphs: [
        'Mia abrió el bolsillo más pequeño y encontró una tarjeta con una palabra portuguesa escrita por la abuela. La llamó para escuchar cómo sonaba.',
        'Pronto la maleta se llenó de dos idiomas, voces conocidas e historias que hacían que cada llamada del domingo pareciera más cercana.',
      ],
      imageAlt: 'Libro personalizado sobre una familia multilingüe y una maleta de recuerdos',
      styleLabel: 'Acuarela',
      contextLabel: 'Familia multilingüe',
      ageLabel: '6–10 años',
    }),
    book('es-ES', {
      sourceSlug: 'o-jardim-das-fotografias-antigas',
      title: 'El jardín de las fotografías antiguas',
      synopsis:
        'Una nieta descubre que cada foto familiar puede convertirse en una historia nueva cuando el abuelo cuenta lo que ocurrió fuera del encuadre.',
      excerpt: 'Las fotografías no florecían con el sol, sino cuando el abuelo empezaba a hablar.',
      sampleTitle: 'La foto bajo el limonero',
      sampleParagraphs: [
        'Lara encontró una fotografía bajo el limonero y preguntó por qué el abuelo llevaba un sombrero demasiado grande.',
        'La respuesta abrió una tarde de verano, una bicicleta prestada y una broma que había esperado cincuenta años para hacer reír a una nieta.',
      ],
      imageAlt: 'Libro personalizado intergeneracional con fotografías antiguas en un jardín',
      styleLabel: 'Vintage',
      contextLabel: 'Recuerdos familiares',
      ageLabel: 'Todas las edades',
    }),
    book('es-ES', {
      sourceSlug: 'as-ferias-na-casa-amarela',
      title: 'Vacaciones en la casa amarilla',
      synopsis:
        'Los nietos vuelven a la casa amarilla donde las vacaciones familiares se llenaban de juegos sencillos, comidas compartidas y cuentos al anochecer.',
      excerpt:
        'La casa amarilla era más pequeña de lo que recordaban y, aun así, guardaba más historias.',
      sampleTitle: 'La llave bajo la maceta azul',
      sampleParagraphs: [
        'La abuela levantó la maceta azul de la casa amarilla en la costa de Cantabria y encontró la misma llave de latón de todos los veranos. Los nietos contaron las marcas junto a la puerta.',
        'Cada marca se convirtió en un capítulo sobre comidas largas, juegos inventados y tardes que terminaban cuando aparecían las estrellas.',
      ],
      imageAlt: 'Libro personalizado de vacaciones de abuelos y nietos en una casa amarilla',
      styleLabel: 'Acuarela',
      contextLabel: 'Vacaciones familiares',
      ageLabel: '5–9 años',
    }),
  ],
  'fr-FR': [
    book('fr-FR', {
      sourceSlug: 'a-receita-das-estrelas-da-avo',
      title: 'La recette d’étoiles de Grand-mère',
      synopsis:
        'Dans une cuisine provençale aux carreaux bleus, Grand-mère Claire apprend à Hugo que chaque recette familiale commence par un mot qui rappelle la maison.',
      excerpt:
        'Grand-mère disait que les recettes commençaient par les mains qui appelaient la famille à table.',
      sampleTitle: 'La première étoile à la cannelle',
      sampleParagraphs: [
        'Hugo tenait la cuillère en bois à deux mains pendant que Grand-mère Claire lisait l’ancienne recette. « Dis un mot qui te rappelle la maison », proposa-t-elle.',
        'Lorsqu’il murmura « câlin », une petite étoile dorée sortit du saladier et ajouta une ligne à la recette qu’ils garderaient ensemble.',
      ],
      imageAlt: 'Livre personnalisé La recette d’étoiles de Grand-mère dans une cuisine familiale',
      styleLabel: 'Crayons de couleur',
      contextLabel: 'Recette familiale',
      ageLabel: '4–7 ans',
    }),
    book('fr-FR', {
      sourceSlug: 'o-comboio-dos-domingos-do-avo',
      title: 'Le train du dimanche de Grand-père',
      synopsis:
        'Chaque dimanche, Grand-père Luc et son petit-fils construisent un train en carton qui traverse des souvenirs de différentes années.',
      excerpt:
        'Le train ne quittait jamais le salon, mais atteignait chaque dimanche une nouvelle destination.',
      sampleTitle: 'Des billets pour l’Express du Salon',
      sampleParagraphs: [
        'Grand-père Luc poinçonna deux billets en papier et annonça que le canapé devenait le quai numéro un. Son petit-fils choisit la destination sur une vieille photo.',
        'Le train traversa un village bourguignon, un été sur la côte atlantique et un matin enneigé, emportant les histoires familiales vers un autre dimanche.',
      ],
      imageAlt: 'Livre personnalisé sur des grands-parents et un train du dimanche en carton',
      styleLabel: 'Dessin animé',
      contextLabel: 'Rituel partagé',
      ageLabel: '5–8 ans',
    }),
    book('fr-FR', {
      sourceSlug: 'a-mala-que-falava-portugues',
      title: 'La valise qui parlait portugais',
      synopsis:
        'Une valise remplie de recettes, d’expressions et de photos aide une famille multilingue à rapprocher les enfants de la langue de leurs grands-parents.',
      excerpt:
        'À chaque ouverture de la valise, un mot familial retrouvait le chemin de la maison.',
      sampleTitle: 'Le mot caché dans la poche',
      sampleParagraphs: [
        'Mia ouvrit la plus petite poche et trouva une carte portant un mot portugais écrit par Grand-mère. Elle l’appela pour l’entendre prononcer.',
        'Bientôt, la valise réunit deux langues, des voix familières et des histoires qui rapprochaient chaque appel du dimanche.',
      ],
      imageAlt: 'Livre personnalisé sur une famille multilingue et une valise de souvenirs',
      styleLabel: 'Aquarelle',
      contextLabel: 'Famille multilingue',
      ageLabel: '6–10 ans',
    }),
    book('fr-FR', {
      sourceSlug: 'o-jardim-das-fotografias-antigas',
      title: 'Le jardin des anciennes photographies',
      synopsis:
        'Une petite-fille découvre que chaque photo familiale devient une nouvelle histoire lorsque Grand-père raconte ce qui se passait hors champ.',
      excerpt:
        'Les photos ne fleurissaient pas au soleil, mais lorsque Grand-père commençait à parler.',
      sampleTitle: 'La photo sous le citronnier',
      sampleParagraphs: [
        'Léa trouva une photo sous le cerisier et demanda pourquoi Grand-père portait un chapeau beaucoup trop grand.',
        'Sa réponse ouvrit un après-midi d’été, un vélo emprunté et une plaisanterie qui avait attendu cinquante ans pour faire rire une petite-fille.',
      ],
      imageAlt: 'Livre intergénérationnel personnalisé avec de vieilles photos dans un jardin',
      styleLabel: 'Vintage',
      contextLabel: 'Souvenirs de famille',
      ageLabel: 'Tous âges',
    }),
    book('fr-FR', {
      sourceSlug: 'as-ferias-na-casa-amarela',
      title: 'Les vacances dans la maison jaune',
      synopsis:
        'Les petits-enfants retrouvent la maison jaune où les vacances familiales étaient faites de jeux simples, de repas partagés et d’histoires au crépuscule.',
      excerpt:
        'La maison jaune semblait plus petite que dans leurs souvenirs et contenait pourtant davantage d’histoires.',
      sampleTitle: 'La clé sous le pot bleu',
      sampleParagraphs: [
        'Grand-mère souleva le pot bleu de la maison jaune en Bretagne et retrouva la même clé en laiton que chaque été. Les petits-enfants comptèrent les marques près de la porte.',
        'Chaque marque devint un chapitre sur les longs repas, les jeux inventés et les soirées qui se terminaient avec l’apparition des étoiles.',
      ],
      imageAlt:
        'Livre personnalisé de vacances entre grands-parents et petits-enfants dans une maison jaune',
      styleLabel: 'Aquarelle',
      contextLabel: 'Vacances en famille',
      ageLabel: '5–9 ans',
    }),
  ],
};

const copy = {
  'en-US': {
    title: 'Personalized book for grandparents and grandchildren',
    metaTitle: 'Personalized Book for Grandparents and Grandchildren | Mythoria',
    metaDescription:
      'Create a personalized family book from names, memories, recipes and photos for grandparents and grandchildren to read together.',
    breadcrumb: 'Book for grandparents and grandchildren',
    primaryCta: 'Create our family book',
    secondaryCta: 'See inside the examples',
    cardDescription: 'Preserve family memories, traditions and adventures across generations.',
    eyebrow: 'Family memories · grandparents and grandchildren',
    headline: 'Turn the memories between generations into a book.',
    subheadline:
      'Bring together names, recipes, photographs, sayings and shared moments in a story the family can review, read and listen to together.',
    imageAlt: 'Grandparents and grandchildren reading a personalized family book together',
    quickTitle: 'What is a personalized book for grandparents and grandchildren?',
    quickBody:
      'It is a story created from real family memories and the details you choose, where grandparents and grandchildren can appear as characters. The book can preserve recipes, traditions, visits, everyday rituals and multilingual family life. Review every name, photograph and private detail before sharing, listening, printing or giving the story.',
    introTitle: 'Family stories grow when someone tells them again',
    introBody: [
      'A recipe, a Sunday call or a photograph can hold more history than it seems.',
      'A personalized book gives children and adults a place to revisit those details together without pretending every family remembers events in exactly the same way.',
    ],
    fitTitle: 'A bridge between generations and places',
    fitBody: [
      'Use familiar voices, places and traditions to create a warm narrative or a careful family keepsake.',
      'Multilingual families can include selected words from more than one language while keeping the story clear for its readers.',
    ],
    benefitsTitle: 'Memories to read together',
    benefits: [
      'Preserve recipes, sayings and family rituals.',
      'Connect relatives who live far apart.',
      'Review every detail before sharing.',
      'Keep the draft private by default.',
    ],
    booksTitle: 'Five ways to keep a family story',
    booksIntro:
      'Open a chapter, view the localized cover and listen to an excerpt in this language.',
    processTitle: 'Build the book together',
    process: [
      'Choose the grandparents, grandchildren and occasion.',
      'Collect a few memories, photos, recipes or expressions.',
      'Choose the age, tone and visual style.',
      'Review names, facts, words and images.',
      'Share or print only when the family is ready.',
    ],
    formatsTitle: 'Ways to enjoy the family book',
    formats: [
      'Private digital reading.',
      'Localized audio when available.',
      'Self-print PDF when available.',
      'Printed book depending on destination and availability.',
    ],
    faq: [
      [
        'Can several grandchildren appear?',
        'Yes. Add the people who belong in the story and review how each one is represented.',
      ],
      [
        'Can we include family photos?',
        'Yes, when the option is available and you have permission to use images of identifiable people.',
      ],
      [
        'Can the book use more than one language?',
        'Yes. Include selected words or passages from supported languages and review them carefully.',
      ],
      [
        'Can we correct family facts?',
        'Yes. The first result is a draft that you should review and edit before sharing.',
      ],
      [
        'Is the book private?',
        'It remains private by default until you deliberately choose an available sharing option.',
      ],
    ],
    safetyTitle: 'Handle family memories with care',
    safetyBody:
      'Only include photographs and personal details you are allowed to use. Avoid addresses, contact information and sensitive stories that relatives have not agreed to share.',
    finalTitle: 'A family memory can become a story everyone can return to.',
    finalBody:
      'Choose one tradition, photograph or shared adventure. Mythoria will help you shape it into a book for two generations.',
    about: ['Personalized books for grandparents', 'Grandchildren', 'Family memories'],
    serviceName: 'Mythoria personalized family book',
    serviceType: 'Personalized digital, audio, PDF and printed book',
  },
  'es-ES': {
    title: 'Libro personalizado para abuelos y nietos',
    metaTitle: 'Libro personalizado para abuelos y nietos | Mythoria',
    metaDescription:
      'Crea un libro familiar personalizado con nombres, recuerdos, recetas y fotos para que abuelos y nietos lo lean juntos.',
    breadcrumb: 'Libro para abuelos y nietos',
    primaryCta: 'Crear nuestro libro familiar',
    secondaryCta: 'Ver los ejemplos por dentro',
    cardDescription: 'Conserva recuerdos, tradiciones y aventuras familiares entre generaciones.',
    eyebrow: 'Recuerdos familiares · abuelos y nietos',
    headline: 'Convierte los recuerdos entre generaciones en un libro.',
    subheadline:
      'Reúne nombres, recetas, fotografías, expresiones y momentos compartidos en una historia que la familia pueda revisar, leer y escuchar junta.',
    imageAlt: 'Abuelos y nietos leen juntos un libro familiar personalizado',
    quickTitle: '¿Qué es un libro personalizado para abuelos y nietos?',
    quickBody:
      'Es una historia creada a partir de recuerdos familiares reales y los detalles que eliges, donde abuelos y nietos pueden aparecer como personajes. El libro puede guardar recetas, tradiciones, visitas, rituales cotidianos y la vida de una familia multilingüe. Revisa cada nombre, fotografía y dato privado antes de compartir, escuchar, imprimir o regalar la historia.',
    introTitle: 'Las historias familiares crecen cuando alguien vuelve a contarlas',
    introBody: [
      'Una receta, una llamada del domingo o una fotografía pueden guardar más historia de la que parece.',
      'Un libro personalizado ofrece a niños y adultos un lugar para volver juntos a esos detalles sin fingir que toda la familia recuerda cada momento igual.',
    ],
    fitTitle: 'Un puente entre generaciones y lugares',
    fitBody: [
      'Utiliza voces, lugares y tradiciones conocidas para crear una narración ficticia cálida o un recuerdo familiar cuidado.',
      'Las familias multilingües pueden incluir palabras escogidas de más de un idioma sin perder claridad.',
    ],
    benefitsTitle: 'Recuerdos para leer juntos',
    benefits: [
      'Conserva recetas, expresiones y rituales familiares.',
      'Acerca a familiares que viven lejos.',
      'Revisa cada detalle antes de compartir.',
      'Mantén el borrador privado por defecto.',
    ],
    booksTitle: 'Cinco formas de guardar una historia familiar',
    booksIntro:
      'Abre un capítulo, mira la portada localizada y escucha un fragmento en este idioma.',
    processTitle: 'Construid el libro juntos',
    process: [
      'Elige a los abuelos, nietos y la ocasión.',
      'Reúne recuerdos, fotos, recetas o expresiones.',
      'Escoge la edad, el tono y el estilo visual.',
      'Revisa nombres, hechos, palabras e imágenes.',
      'Comparte o imprime solo cuando la familia esté lista.',
    ],
    formatsTitle: 'Formas de disfrutar el libro familiar',
    formats: [
      'Lectura digital privada.',
      'Audio localizado cuando esté disponible.',
      'PDF para imprimir cuando esté disponible.',
      'Libro impreso según destino y disponibilidad.',
    ],
    faq: [
      [
        '¿Pueden aparecer varios nietos?',
        'Sí. Añade a las personas que forman parte de la historia y revisa cómo se representa a cada una.',
      ],
      [
        '¿Podemos incluir fotos familiares?',
        'Sí, cuando la opción esté disponible y tengas permiso para usar imágenes de personas identificables.',
      ],
      [
        '¿Puede usar más de un idioma?',
        'Sí. Incluye palabras o fragmentos de idiomas compatibles y revísalos con cuidado.',
      ],
      [
        '¿Podemos corregir hechos familiares?',
        'Sí. El primer resultado es un borrador que debes revisar y editar antes de compartir.',
      ],
      [
        '¿El libro es privado?',
        'Se mantiene privado por defecto hasta que elijas de forma intencionada una opción de compartir.',
      ],
    ],
    safetyTitle: 'Trata los recuerdos familiares con cuidado',
    safetyBody:
      'Incluye solo fotografías y datos personales que tengas derecho a usar. Evita direcciones, contactos e historias sensibles que la familia no haya aceptado compartir.',
    finalTitle: 'Un recuerdo familiar puede convertirse en una historia a la que todos vuelvan.',
    finalBody:
      'Elige una tradición, una fotografía o una aventura compartida. Mythoria te ayudará a convertirla en un libro para dos generaciones.',
    about: ['Libros personalizados para abuelos', 'Nietos', 'Recuerdos familiares'],
    serviceName: 'Libro familiar personalizado Mythoria',
    serviceType: 'Libro personalizado digital, audio, PDF e impreso',
  },
  'fr-FR': {
    title: 'Livre personnalisé pour grands-parents et petits-enfants',
    metaTitle: 'Livre personnalisé pour grands-parents et petits-enfants | Mythoria',
    metaDescription:
      'Créez un livre familial personnalisé à partir de prénoms, souvenirs, recettes et photos à lire ensemble.',
    breadcrumb: 'Livre pour grands-parents et petits-enfants',
    primaryCta: 'Créer notre livre de famille',
    secondaryCta: 'Voir l’intérieur des exemples',
    cardDescription: 'Préservez souvenirs, traditions et aventures familiales entre générations.',
    eyebrow: 'Souvenirs de famille · grands-parents et petits-enfants',
    headline: 'Transformez les souvenirs entre générations en un livre.',
    subheadline:
      'Réunissez prénoms, recettes, photographies, expressions et moments partagés dans une histoire que la famille peut relire et écouter ensemble.',
    imageAlt: 'Des grands-parents et petits-enfants lisent ensemble un livre personnalisé',
    quickTitle: 'Qu’est-ce qu’un livre personnalisé pour grands-parents et petits-enfants ?',
    quickBody:
      'C’est une histoire créée à partir de souvenirs familiaux et des détails que vous choisissez, dans laquelle grands-parents et petits-enfants peuvent devenir des personnages. Le livre peut préserver recettes, traditions, visites, rituels quotidiens et vie familiale multilingue. Vérifiez chaque prénom, photographie et information privée avant de partager, écouter, imprimer ou offrir le récit.',
    introTitle: 'Les histoires de famille grandissent lorsqu’on les raconte à nouveau',
    introBody: [
      'Une recette, un appel du dimanche ou une photographie peuvent contenir davantage d’histoire qu’il n’y paraît.',
      'Un livre personnalisé offre aux enfants et aux adultes un espace pour redécouvrir ces détails sans prétendre que chacun se souvient exactement de la même façon.',
    ],
    fitTitle: 'Un pont entre générations et lieux',
    fitBody: [
      'Utilisez voix, lieux et traditions familières pour créer un récit chaleureux ou un souvenir familial attentif.',
      'Les familles multilingues peuvent intégrer certains mots de plusieurs langues tout en conservant un récit clair.',
    ],
    benefitsTitle: 'Des souvenirs à lire ensemble',
    benefits: [
      'Préservez recettes, expressions et rituels familiaux.',
      'Rapprochez les proches qui vivent loin.',
      'Vérifiez chaque détail avant de partager.',
      'Gardez le brouillon privé par défaut.',
    ],
    booksTitle: 'Cinq façons de garder une histoire familiale',
    booksIntro:
      'Ouvrez un chapitre, regardez la couverture localisée et écoutez un extrait dans cette langue.',
    processTitle: 'Construisez le livre ensemble',
    process: [
      'Choisissez les grands-parents, petits-enfants et l’occasion.',
      'Réunissez quelques souvenirs, photos, recettes ou expressions.',
      'Sélectionnez l’âge, le ton et le style visuel.',
      'Vérifiez prénoms, faits, mots et images.',
      'Partagez ou imprimez uniquement lorsque la famille est prête.',
    ],
    formatsTitle: 'Les façons de profiter du livre familial',
    formats: [
      'Lecture numérique privée.',
      'Audio localisé lorsqu’il est disponible.',
      'PDF à imprimer lorsqu’il est disponible.',
      'Livre imprimé selon la destination et la disponibilité.',
    ],
    faq: [
      [
        'Plusieurs petits-enfants peuvent-ils apparaître ?',
        'Oui. Ajoutez les personnes qui appartiennent à l’histoire et vérifiez la façon dont chacune est représentée.',
      ],
      [
        'Peut-on inclure des photos de famille ?',
        'Oui, lorsque l’option est disponible et que vous avez l’autorisation d’utiliser les images des personnes identifiables.',
      ],
      [
        'Le livre peut-il utiliser plusieurs langues ?',
        'Oui. Intégrez certains mots ou passages dans les langues prises en charge et relisez-les attentivement.',
      ],
      [
        'Peut-on corriger les faits familiaux ?',
        'Oui. Le premier résultat est un brouillon à relire et modifier avant de le partager.',
      ],
      [
        'Le livre est-il privé ?',
        'Il reste privé par défaut jusqu’à ce que vous choisissiez volontairement une option de partage.',
      ],
    ],
    safetyTitle: 'Traitez les souvenirs familiaux avec attention',
    safetyBody:
      'Incluez uniquement les photographies et informations personnelles que vous êtes autorisé à utiliser. Évitez adresses, coordonnées et histoires sensibles que les proches n’ont pas accepté de partager.',
    finalTitle: 'Un souvenir familial peut devenir une histoire que chacun retrouve.',
    finalBody:
      'Choisissez une tradition, une photographie ou une aventure partagée. Mythoria vous aidera à en faire un livre pour deux générations.',
    about: ['Livres personnalisés pour grands-parents', 'Petits-enfants', 'Souvenirs de famille'],
    serviceName: 'Livre familial personnalisé Mythoria',
    serviceType: 'Livre personnalisé numérique, audio, PDF et imprimé',
  },
} as const;

function createGrandparentsLandingPage(locale: LocalizedLandingLocale): LandingPageContent {
  const c = copy[locale];
  const slug = slugs[locale];
  const assetBase = getLocalizedAssetBase(sourceLandingSlug, locale);
  return {
    translationKey: 'grandparents-stories',
    slug,
    locale,
    title: c.title,
    metaTitle: c.metaTitle,
    metaDescription: c.metaDescription,
    primaryIntent: 'grandparents',
    riskRating: 'yellow',
    updatedAt: '2026-08-02',
    indexable: true,
    breadcrumbLabel: c.breadcrumb,
    ogImageSrc: `${assetBase}/hero/og-cover.jpeg`,
    primaryCta: c.primaryCta,
    primaryCtaHref: `/${locale}/tell-your-story/step-1?landingSlug=${slug}&primaryIntent=grandparents`,
    secondaryCta: c.secondaryCta,
    secondaryCtaHref: '#exemplos',
    homepageCard: { title: c.title, description: c.cardDescription },
    analytics: { pageViewEvent: 'landing_page_view', variant: `grandparents-${locale}` },
    templateIcons: commonTemplateIcons,
    booksSection: { title: c.booksTitle, intro: c.booksIntro },
    hero: {
      eyebrow: c.eyebrow,
      headline: c.headline,
      subheadline: c.subheadline,
      imageSrc: `${assetBase}/hero/hero.jpeg`,
      imageAlt: c.imageAlt,
    },
    quickAnswer: { title: c.quickTitle, body: c.quickBody },
    intro: { title: c.introTitle, body: [...c.introBody] },
    whyThisFits: { title: c.fitTitle, body: [...c.fitBody] },
    carefulBenefits: { title: c.benefitsTitle, items: [...c.benefits] },
    books: buildLocalizedBooks({
      translationKey: 'grandparents-stories',
      sourceLandingSlug,
      locale,
      books: books[locale],
    }),
    process: { title: c.processTitle, steps: [...c.process] },
    formats: { title: c.formatsTitle, items: [...c.formats] },
    faq: c.faq.map(([question, answer]) => ({ question, answer })),
    safetyNote: { title: c.safetyTitle, body: c.safetyBody },
    finalCta: { title: c.finalTitle, body: c.finalBody },
    structuredData: {
      about: [...c.about],
      serviceName: c.serviceName,
      serviceType: c.serviceType,
      areaServed: getAreaServed(locale),
    },
  };
}

export const grandparentsLocalizedLandingPages = (['en-US', 'es-ES', 'fr-FR'] as const).map(
  createGrandparentsLandingPage,
);
