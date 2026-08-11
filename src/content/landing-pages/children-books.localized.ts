import {
  buildLocalizedBooks,
  commonTemplateIcons,
  getAreaServed,
  getLocalizedAssetBase,
  type LocalizedBookCopy,
  type LocalizedLandingLocale,
} from './localized-shared';
import type { LandingPageContent } from './types';

const sourceLandingSlug = 'livro-personalizado-crianca';
const iconBase = '/Papercut_icons';

const slugs: Record<LocalizedLandingLocale, string> = {
  'en-US': 'personalized-childrens-book',
  'es-ES': 'libro-personalizado-para-ninos',
  'fr-FR': 'livre-personnalise-pour-enfants',
};

const books: Record<LocalizedLandingLocale, LocalizedBookCopy[]> = {
  'en-US': [
    {
      sourceSlug: 'mia-e-a-pastelaria-da-lua',
      title: 'Maya and the Moonlight Bakery',
      synopsis:
        'Maya and her dog discover a moonlit bakery where dreams are kneaded before sunrise.',
      excerpt: 'When the moon opened its tiny bakery, Maya was the first to smell warm starlight.',
      sampleTitle: 'The loaf for the last dream',
      sampleParagraphs: [
        'Maya was tucked beneath her yellow blanket when the scent of warm starlight slipped through her Brooklyn window. At the end of a glowing staircase, copper mixers turned slowly and round loaves slept beneath embroidered cloths.',
        'Mrs. Aurora explained that one final loaf still needed a comforting memory, a small piece of courage and someone willing to share. Maya thought of Sunday apple pie, admitted that darkness sometimes frightened her and divided the dough into two equal pieces.',
      ],
      imageAlt:
        'Personalized children’s book Maya and the Moonlight Bakery in a cozy bedtime reading scene',
      sampleImageAlt:
        'Maya, Pip and Mrs. Aurora carrying a glowing loaf through the moonlight bakery',
      styleLabel: 'Claymation',
      contextLabel: 'Bedtime story',
      ageLabel: 'Ages 4–7',
      audioSampleTitle: 'Listen to Maya’s narrated excerpt',
      sampleImageFile: 'chapter-01.jpeg',
    },
    {
      sourceSlug: 'tomas-e-o-mapa-das-portas-escondidas',
      title: 'Theo and the Map of Hidden Doors',
      synopsis:
        'A map found inside an old library book opens paper doors across the city, but the final door asks Theo to accept help.',
      excerpt: 'The map looked ordinary until its first little door lifted off the page.',
      sampleTitle: 'The door that needed two hands',
      sampleParagraphs: [
        'The map looked ordinary until its first little door lifted off the page. Theo found it inside an untitled book at the Brooklyn Public Library and touched it with the tip of his pencil.',
        'He and Zoe crossed a layered paper city where trees folded into fans and birds had envelope wings. The last door had no handle—only two hand-shaped marks. When they pressed them together, it unfolded like a blue flower.',
      ],
      imageAlt:
        'Personalized book Theo and the Map of Hidden Doors on a library table beside a folded map',
      sampleImageAlt: 'Theo and Zoe opening a blue door together in a layered paper city',
      styleLabel: 'Papercut',
      contextLabel: 'Adventure and mystery',
      ageLabel: 'Ages 6–9',
      audioSampleTitle: 'Listen to Theo’s narrated excerpt',
      sampleImageFile: 'chapter-01.jpeg',
    },
    {
      sourceSlug: 'lia-e-o-jardim-das-palavras-perdidas',
      title: 'Lily and the Garden of Lost Words',
      synopsis:
        'Lily enters a garden where family sayings grow like flowers and each one must be understood before it can be carried home.',
      excerpt: 'In Lily’s garden, words were not written down; they grew slowly among the leaves.',
      sampleTitle: 'The word that smelled like rosemary',
      sampleParagraphs: [
        'In Lily’s garden, words were not written down; they grew slowly among the leaves. A blue flower opened beside the rosemary and whispered “cozy,” while another kept repeating “be right there.”',
        'Aunt Amelia explained that a word without its story becomes too light and disappears. Instead of picking the flower, Lily drew it and listened to the family memory behind it. At dinner, everyone reviewed the new page together.',
      ],
      imageAlt:
        'Personalized book Lily and the Garden of Lost Words on a garden table with rosemary',
      sampleImageAlt:
        'Lily and Aunt Amelia listening to a flower beside rosemary in a watercolor garden',
      styleLabel: 'Watercolor',
      contextLabel: 'Poetic discovery',
      ageLabel: 'Ages 5–8',
      audioSampleTitle: 'Listen to Lily’s narrated excerpt',
      sampleImageFile: 'chapter-01.jpeg',
    },
    {
      sourceSlug: 'a-equipa-que-marcou-um-golo-nas-estrelas',
      title: 'The Team That Scored Among the Stars',
      synopsis:
        'A neighborhood soccer field lights up when every player contributes a different strength.',
      excerpt:
        'The ball glowed for the first time when the pass reached the player nobody had noticed.',
      sampleTitle: 'The pass that lit the field',
      sampleParagraphs: [
        'The ball glowed for the first time when the pass reached the player nobody had noticed. A silver line swept across the neighborhood field and joined the Comets like a constellation.',
        'Jordan saw the space, Sam dropped back, Maya played the simple pass, Mei chose the moment and Noah kept running. The goal did not belong to one star. The whole sky had been drawn by the team.',
      ],
      imageAlt:
        'Personalized book The Team That Scored Among the Stars beside a soccer ball and an unbranded scarf',
      sampleImageAlt: 'Five young soccer players connecting a glowing pass on a neighborhood field',
      styleLabel: 'European comic',
      contextLabel: 'Sports and teamwork',
      ageLabel: 'Ages 8–11',
      audioSampleTitle: 'Listen to the team’s narrated excerpt',
      sampleImageFile: 'chapter-01.jpeg',
    },
    {
      sourceSlug: 'ines-e-o-robo-feito-de-desenhos',
      title: 'Ivy and the Robot Made of Drawings',
      synopsis:
        'A mismatched robot climbs out of a sketchbook and asks Ivy for help discovering what it was made to do.',
      excerpt: 'Ivy’s robot had three wheels, two paper wings and a question drawn on its chest.',
      sampleTitle: 'The question on its chest',
      sampleParagraphs: [
        'Ivy’s robot had three wheels, two paper wings and a question drawn on its chest. At midnight it rolled out of the sketchbook with the soft scratch of a colored pencil.',
        'Scribble could find tiny objects and sort shapes, but no task explained its purpose. Ivy drew three circles—“I can,” “I enjoy” and “I help.” When the robot compared ideas without choosing for her, the question mark began to glow.',
      ],
      imageAlt:
        'Personalized book Ivy and the Robot Made of Drawings on a desk with pencils and paper shapes',
      sampleImageAlt: 'Ivy and Scribble sorting pencils in a colored-pencil illustration',
      styleLabel: 'Colored pencil',
      contextLabel: 'Drawing and invention',
      ageLabel: 'Ages 7–10',
      audioSampleTitle: 'Listen to Ivy’s narrated excerpt',
      sampleImageFile: 'chapter-01.jpeg',
    },
  ],
  'es-ES': [
    {
      sourceSlug: 'mia-e-a-pastelaria-da-lua',
      title: 'Mía y la Panadería de la Luna',
      synopsis:
        'Mía y su perro descubren una panadería lunar donde los sueños se amasan antes del amanecer.',
      excerpt:
        'Cuando la Luna abrió su pequeña panadería, Mía fue la primera en oler las estrellas calientes.',
      sampleTitle: 'El pan del último sueño',
      sampleParagraphs: [
        'Mía estaba arropada con su manta amarilla cuando el aroma de las estrellas calientes entró por la ventana. Al final de una escalera de luz, unas amasadoras de cobre giraban despacio y los panes dormían bajo paños bordados.',
        'Doña Aurora explicó que faltaba el último pan de la noche: necesitaba un recuerdo que diera calor, un poquito de valentía y alguien con quien compartir. Mía recordó la tarta de manzana de los domingos y dividió la masa en dos.',
      ],
      imageAlt:
        'Libro infantil personalizado Mía y la Panadería de la Luna en una escena acogedora de lectura',
      sampleImageAlt: 'Mía, Pingo y doña Aurora llevan un pan luminoso por la panadería lunar',
      styleLabel: 'Claymation',
      contextLabel: 'Cuento para dormir',
      ageLabel: '4–7 años',
      audioSampleTitle: 'Escuchar el fragmento narrado de Mía',
      sampleImageFile: 'chapter-01.jpeg',
    },
    {
      sourceSlug: 'tomas-e-o-mapa-das-portas-escondidas',
      title: 'Tomás y el Mapa de las Puertas Ocultas',
      synopsis:
        'Un mapa encontrado en un viejo libro abre puertas de papel por Madrid, pero la última pide a Tomás que acepte ayuda.',
      excerpt:
        'El mapa parecía de papel normal hasta que la primera puerta se levantó de la página.',
      sampleTitle: 'La puerta que necesitaba dos manos',
      sampleParagraphs: [
        'El mapa parecía normal hasta que la primera puerta se levantó de la página. Tomás lo encontró dentro de un libro sin título en la biblioteca y lo tocó con la punta del lápiz.',
        'Él y Sara cruzaron una ciudad de papel donde los árboles eran abanicos y los pájaros tenían alas de sobre. La última puerta no tenía pomo, sino dos marcas con forma de mano. Al apoyarlas a la vez, se abrió como una flor azul.',
      ],
      imageAlt:
        'Libro personalizado Tomás y el Mapa de las Puertas Ocultas en una mesa de biblioteca',
      sampleImageAlt: 'Tomás y Sara abren juntos una puerta azul en una ciudad de papel por capas',
      styleLabel: 'Papercut',
      contextLabel: 'Aventura y misterio',
      ageLabel: '6–9 años',
      audioSampleTitle: 'Escuchar el fragmento narrado de Tomás',
      sampleImageFile: 'chapter-01.jpeg',
    },
    {
      sourceSlug: 'lia-e-o-jardim-das-palavras-perdidas',
      title: 'Lucía y el Jardín de las Palabras Perdidas',
      synopsis:
        'Lucía entra en un jardín donde las expresiones familiares crecen como flores y hay que conocer su historia antes de llevárselas.',
      excerpt:
        'En el jardín de Lucía, las palabras no estaban escritas: crecían despacio entre las hojas.',
      sampleTitle: 'La palabra que olía a romero',
      sampleParagraphs: [
        'En el jardín de Lucía, las palabras no estaban escritas: crecían despacio entre las hojas. Una flor azul se abrió junto al romero y dijo «cobijo»; otra solo sabía repetir «ahora voy».',
        'La tía Amelia explicó que una palabra sin su historia pesa tan poco que desaparece. En vez de arrancar la flor, Lucía la dibujó y escuchó el recuerdo familiar que guardaba. Durante la cena, todos revisaron juntos la nueva página.',
      ],
      imageAlt:
        'Libro personalizado Lucía y el Jardín de las Palabras Perdidas sobre una mesa con romero',
      sampleImageAlt:
        'Lucía y la tía Amelia escuchan una flor junto al romero en un jardín de acuarela',
      styleLabel: 'Acuarela',
      contextLabel: 'Descubrimiento poético',
      ageLabel: '5–8 años',
      audioSampleTitle: 'Escuchar el fragmento narrado de Lucía',
      sampleImageFile: 'chapter-01.jpeg',
    },
    {
      sourceSlug: 'a-equipa-que-marcou-um-golo-nas-estrelas',
      title: 'El Equipo que Marcó un Gol en las Estrellas',
      synopsis:
        'Un campo de fútbol de barrio se ilumina cuando cada jugador aporta una habilidad diferente.',
      excerpt: 'El balón brilló por primera vez cuando el pase llegó a quien nadie estaba mirando.',
      sampleTitle: 'El pase que iluminó el campo',
      sampleParagraphs: [
        'El balón brilló por primera vez cuando el pase llegó a quien nadie estaba mirando. Una línea plateada cruzó el campo del barrio y unió a los Cometas como una constelación.',
        'Hugo vio el espacio, Mateo retrocedió, Lucía dio el pase sencillo, Mei eligió el momento y Noa siguió corriendo. El gol no pertenecía a una sola estrella: todo el cielo lo había dibujado el equipo.',
      ],
      imageAlt: 'Libro personalizado El Equipo que Marcó un Gol en las Estrellas junto a un balón',
      sampleImageAlt: 'Cinco futbolistas jóvenes enlazan un pase luminoso en un campo de barrio',
      styleLabel: 'Cómic europeo',
      contextLabel: 'Deporte y equipo',
      ageLabel: '8–11 años',
      audioSampleTitle: 'Escuchar el fragmento narrado del equipo',
      sampleImageFile: 'chapter-01.jpeg',
    },
    {
      sourceSlug: 'ines-e-o-robo-feito-de-desenhos',
      title: 'Inés y el Robot Hecho de Dibujos',
      synopsis:
        'Un robot de formas desparejadas sale del cuaderno y pide ayuda a Inés para descubrir para qué fue inventado.',
      excerpt:
        'El robot de Inés tenía tres ruedas, dos alas de papel y una pregunta dibujada en el pecho.',
      sampleTitle: 'La pregunta en el pecho',
      sampleParagraphs: [
        'El robot de Inés tenía tres ruedas, dos alas de papel y una pregunta dibujada en el pecho. A medianoche salió del cuaderno con el suave rasguño de un lápiz de color.',
        'Garabato encontraba objetos pequeños y ordenaba formas, pero ninguna tarea explicaba su propósito. Inés dibujó tres círculos: «puedo», «me gusta» y «ayuda». Cuando comparó ideas sin decidir por ella, la pregunta comenzó a brillar.',
      ],
      imageAlt: 'Libro personalizado Inés y el Robot Hecho de Dibujos en un escritorio con lápices',
      sampleImageAlt: 'Inés y Garabato ordenan lápices en una ilustración de lápices de color',
      styleLabel: 'Lápices de color',
      contextLabel: 'Dibujo e invención',
      ageLabel: '7–10 años',
      audioSampleTitle: 'Escuchar el fragmento narrado de Inés',
      sampleImageFile: 'chapter-01.jpeg',
    },
  ],
  'fr-FR': [
    {
      sourceSlug: 'mia-e-a-pastelaria-da-lua',
      title: 'Mia et la Boulangerie de la Lune',
      synopsis:
        'Mia et son chien découvrent une boulangerie lunaire où les rêves sont pétris avant l’aube.',
      excerpt:
        'Lorsque la Lune ouvrit sa petite boulangerie, Mia fut la première à sentir les étoiles chaudes.',
      sampleTitle: 'Le pain du dernier rêve',
      sampleParagraphs: [
        'Mia était blottie sous sa couverture jaune lorsque le parfum des étoiles chaudes entra par la fenêtre. Au bout d’un escalier de lumière, des pétrins en cuivre tournaient lentement et des pains ronds dormaient sous des linges brodés.',
        'Madame Aurore expliqua qu’il manquait le dernier pain de la nuit : il fallait un souvenir réconfortant, une petite dose de courage et quelqu’un avec qui partager. Mia pensa à la tarte du dimanche et partagea la pâte en deux.',
      ],
      imageAlt:
        'Livre personnalisé Mia et la Boulangerie de la Lune dans une scène de lecture du soir',
      sampleImageAlt:
        'Mia, Pingo et madame Aurore portent un pain lumineux dans la boulangerie lunaire',
      styleLabel: 'Claymation',
      contextLabel: 'Histoire du soir',
      ageLabel: '4–7 ans',
      audioSampleTitle: 'Écouter l’extrait raconté de Mia',
      sampleImageFile: 'chapter-01.jpeg',
    },
    {
      sourceSlug: 'tomas-e-o-mapa-das-portas-escondidas',
      title: 'Théo et la Carte des Portes Cachées',
      synopsis:
        'Une carte trouvée dans un vieux livre ouvre des portes de papier à travers Paris, mais la dernière demande à Théo d’accepter de l’aide.',
      excerpt:
        'La carte semblait ordinaire, jusqu’à ce que la première porte se soulève de la page.',
      sampleTitle: 'La porte qui avait besoin de deux mains',
      sampleParagraphs: [
        'La carte semblait ordinaire, jusqu’à ce que la première porte se soulève de la page. Théo l’avait trouvée dans un livre sans titre à la bibliothèque et la toucha du bout de son crayon.',
        'Avec Zoé, il traversa une ville de papier où les arbres étaient des éventails et les oiseaux avaient des ailes d’enveloppe. La dernière porte n’avait pas de poignée, seulement deux empreintes. Ensemble, ils la déplièrent comme une fleur bleue.',
      ],
      imageAlt:
        'Livre personnalisé Théo et la Carte des Portes Cachées sur une table de bibliothèque',
      sampleImageAlt:
        'Théo et Zoé ouvrent ensemble une porte bleue dans une ville de papier découpé',
      styleLabel: 'Papercut',
      contextLabel: 'Aventure et mystère',
      ageLabel: '6–9 ans',
      audioSampleTitle: 'Écouter l’extrait raconté de Théo',
      sampleImageFile: 'chapter-01.jpeg',
    },
    {
      sourceSlug: 'lia-e-o-jardim-das-palavras-perdidas',
      title: 'Léa et le Jardin des Mots Perdus',
      synopsis:
        'Léa entre dans un jardin où les expressions familiales poussent comme des fleurs et doivent livrer leur histoire avant d’être emportées.',
      excerpt:
        'Dans le jardin de Léa, les mots n’étaient pas écrits : ils poussaient lentement entre les feuilles.',
      sampleTitle: 'Le mot qui sentait le romarin',
      sampleParagraphs: [
        'Dans le jardin de Léa, les mots n’étaient pas écrits : ils poussaient lentement entre les feuilles. Une fleur bleue s’ouvrit près du romarin et murmura « réconfort », tandis qu’une autre répétait « j’arrive ».',
        'Tante Amélie expliqua qu’un mot sans son histoire devient trop léger et disparaît. Au lieu de cueillir la fleur, Léa la dessina et écouta le souvenir qu’elle gardait. Le soir, toute la famille relut la nouvelle page.',
      ],
      imageAlt: 'Livre personnalisé Léa et le Jardin des Mots Perdus sur une table avec du romarin',
      sampleImageAlt:
        'Léa et tante Amélie écoutent une fleur près du romarin dans un jardin à l’aquarelle',
      styleLabel: 'Aquarelle',
      contextLabel: 'Découverte poétique',
      ageLabel: '5–8 ans',
      audioSampleTitle: 'Écouter l’extrait raconté de Léa',
      sampleImageFile: 'chapter-01.jpeg',
    },
    {
      sourceSlug: 'a-equipa-que-marcou-um-golo-nas-estrelas',
      title: 'L’Équipe qui a Marqué un But dans les Étoiles',
      synopsis:
        'Un terrain de quartier s’illumine lorsque chaque joueur apporte une qualité différente.',
      excerpt:
        'Le ballon brilla pour la première fois lorsque la passe atteignit la personne que personne n’avait remarquée.',
      sampleTitle: 'La passe qui illumina le terrain',
      sampleParagraphs: [
        'Le ballon brilla pour la première fois lorsque la passe atteignit la personne que personne n’avait remarquée. Une ligne argentée traversa le terrain du quartier et relia les Comètes comme une constellation.',
        'Jules vit l’espace, Sami recula, Léa fit la passe simple, Mei choisit le moment et Noé poursuivit sa course. Le but n’appartenait pas à une seule étoile : toute l’équipe avait dessiné le ciel.',
      ],
      imageAlt: 'Livre personnalisé L’Équipe qui a Marqué un But dans les Étoiles près d’un ballon',
      sampleImageAlt:
        'Cinq jeunes footballeurs relient une passe lumineuse sur un terrain de quartier',
      styleLabel: 'Bande dessinée européenne',
      contextLabel: 'Sport et esprit d’équipe',
      ageLabel: '8–11 ans',
      audioSampleTitle: 'Écouter l’extrait raconté de l’équipe',
      sampleImageFile: 'chapter-01.jpeg',
    },
    {
      sourceSlug: 'ines-e-o-robo-feito-de-desenhos',
      title: 'Inès et le Robot Fait de Dessins',
      synopsis:
        'Un robot aux formes dépareillées sort du carnet et demande à Inès de l’aider à découvrir sa raison d’être.',
      excerpt:
        'Le robot d’Inès avait trois roues, deux ailes en papier et une question dessinée sur la poitrine.',
      sampleTitle: 'La question sur sa poitrine',
      sampleParagraphs: [
        'Le robot d’Inès avait trois roues, deux ailes en papier et une question dessinée sur la poitrine. À minuit, il sortit du carnet dans le léger crissement d’un crayon de couleur.',
        'Gribouille trouvait les petits objets et triait les formes, mais aucune tâche n’expliquait sa raison d’être. Inès dessina trois cercles : « je peux », « j’aime » et « j’aide ». Lorsqu’il compara les idées sans choisir pour elle, la question se mit à briller.',
      ],
      imageAlt:
        'Livre personnalisé Inès et le Robot Fait de Dessins sur un bureau avec des crayons',
      sampleImageAlt:
        'Inès et Gribouille rangent des crayons dans une illustration aux crayons de couleur',
      styleLabel: 'Crayons de couleur',
      contextLabel: 'Dessin et invention',
      ageLabel: '7–10 ans',
      audioSampleTitle: 'Écouter l’extrait raconté d’Inès',
      sampleImageFile: 'chapter-01.jpeg',
    },
  ],
};

const pageCopy = {
  'en-US': {
    title: 'Personalized children’s book',
    metaTitle: 'Personalized Children’s Book | Mythoria',
    metaDescription:
      'Turn a child’s name, interests, memories or drawing into an illustrated story to read, listen to, print or give.',
    breadcrumb: 'Personalized children’s book',
    primaryCta: 'Create a book for a child',
    secondaryCta: 'See books made with Mythoria',
    cardTitle: 'Personalized children’s book',
    cardDescription:
      'Turn a child’s interests, memories and drawings into an adventure made just for them.',
    eyebrow: 'A story made around the child',
    headline: 'Create a personalized book where the child becomes the hero.',
    subheadline:
      'Choose the details, tone and visual style. Then review the finished story before you share it or select an available format.',
    imageAlt:
      'Personalized children’s book Maya and the Moonlight Bakery in a cozy nighttime reading scene',
    trustBadges: ['Adult account', 'Private by default', 'Review before sharing'],
    quickTitle: 'What is a personalized children’s book?',
    quickBody:
      'It is a story built around the name, age, interests and details an adult chooses—familiar people, pets, places, memories, drawings or ideas. The adult sets the tone and visual style, then reviews the words and images before sharing, printing or ordering any available format.',
    introTitle: 'More than a name on the cover.',
    introBody: [
      'Meaningful personalization changes who enters the story, where the adventure happens, which challenge appears, how the language fits and which details return in the illustrations.',
      'For example, “loves dogs, pancakes and a yellow blanket” can become a moonlight bakery where the child and their dog bake a final dream before sunrise.',
    ],
    fitTitle: 'A finished book, guided and reviewed by an adult.',
    fitBody: [
      'You do not need to write an entire story. Start with the details you know, then choose a narrative and visual direction.',
      'Before the book leaves the private space, an adult should check names, text, images, identifiable people and anything that should be removed.',
    ],
    useCasesTitle: 'A story can begin almost anywhere.',
    useCasesIntro:
      'Choose a starting point that feels familiar to the child and let that detail guide the book.',
    useCases: [
      ['The child as the hero', 'An adventure built around a favorite place, creature or object.'],
      ['A bedtime story', 'A calmer rhythm, familiar routines and audio when available.'],
      [
        'A drawing turned into a story',
        'Use an authorized photo of a drawing as the creative seed for characters and worlds.',
      ],
      [
        'A favorite interest',
        'Soccer, dinosaurs, space, trains, animals, music, science or another safe interest.',
      ],
      [
        'A family memory',
        'A recipe, trip, saying, pet or day that the family would like to preserve.',
      ],
      [
        'A gift for a special day',
        'A birthday, Christmas, christening or another occasion that calls for something unique.',
      ],
    ],
    personalizationTitle: 'Personalize the details that make the story one of a kind.',
    personalizationIntro:
      'Begin with a few useful details. A story can feel familiar without exposing private information.',
    personalization: [
      [
        'The child',
        'Choose how the character appears and how the writing adapts.',
        ['First name or character name', 'Age range', 'Pronouns', 'Reading level'],
      ],
      [
        'People and pets',
        'Include only relevant people and animals with appropriate permission.',
        ['Family members', 'Friends', 'Pets', 'Imaginary companion'],
      ],
      [
        'Interests and details',
        'Use concrete elements the child recognizes without revealing more than necessary.',
        ['Hobbies and objects', 'Family sayings', 'Colors and foods', 'Safe places and routines'],
      ],
      [
        'Story direction',
        'Choose the kind of experience you want to read together.',
        [
          'Adventure or mystery',
          'Bedtime or humor',
          'Fantasy or discovery',
          'Sports or family memory',
        ],
      ],
      [
        'Visual direction',
        'Set the mood of the illustrations and use media only with permission.',
        ['Visual style', 'Color mood', 'Submitted drawing', 'Authorized photograph'],
      ],
    ],
    personalizationCta: 'Start with an idea',
    benefitsTitle: 'The result feels personal, not generic.',
    benefits: [
      'The character, setting and challenge can grow from details chosen by the adult.',
      'Age, pace and language guide how the story is told.',
      'The visual style gives the finished book its own identity.',
      'A final review lets you correct or remove details before sharing.',
    ],
    booksEyebrow: 'Books made with Mythoria',
    booksTitle: 'Five stories, five ways to put a child inside the book.',
    booksIntro:
      'Explore finished Mythoria books for different ages, interests and visual styles. Open a chapter and listen to a localized excerpt before starting yours.',
    processTitle: 'How to create the book',
    process: [
      'Start with an idea, memory, drawing, photograph or voice note.',
      'Choose the characters, tone, style and reading age.',
      'Create the story and view the first result.',
      'Review names, words, images and details.',
      'Read, listen, share, print or order only the formats currently available.',
    ],
    formatsTitle: 'Choose from the formats available for the story',
    formats: [
      'Private digital reading for review before sharing.',
      'Narrated audio when it is available for the story.',
      'Private sharing and a self-print PDF when available.',
      'A printed book according to the current offer, price and destination.',
    ],
    privacyTitle: 'A story about a child deserves careful choices.',
    privacyIntro:
      'Use only what the story needs. The adult is responsible for reviewing the result and deciding whether it is ever shared.',
    privacyItems: [
      [
        'Adult account and review',
        'An adult starts the book, checks the details and decides what happens next.',
      ],
      [
        'Private by default',
        'Creating the story does not automatically turn it into a public page.',
      ],
      [
        'Media used with permission',
        'Use photos, drawings or voice only when you have the appropriate rights and permission.',
      ],
      [
        'Review before sharing',
        'Check words, images, other people and sensitive details before sending, printing or publishing.',
      ],
    ],
    faq: [
      [
        'What can I personalize in a children’s book?',
        'You can adapt the character, age range, pronouns, interests, authorized people and pets, places, sayings, type of adventure and visual style. Include only what the story needs and identify anything you want excluded.',
      ],
      [
        'Do I need to know how to write?',
        'No. Start with a short idea, memory, drawing, authorized photo or voice note. Mythoria helps shape the narrative; the adult remains responsible for reviewing the result.',
      ],
      [
        'What ages can the story be adapted for?',
        'You can choose an age range to guide vocabulary, pacing and story type. Always confirm that the result suits the individual child before sharing it.',
      ],
      [
        'Can the child be the main character?',
        'Yes. Use a first name or choose a different character name, then adapt interests, appearance and story details without disclosing unnecessary information.',
      ],
      [
        'Can I include relatives or pets?',
        'Yes, when they matter to the story. For identifiable people, use only information and images you have permission to use. For pets, choose recognizable details that serve the story.',
      ],
      [
        'Can I turn a drawing into a story?',
        'You can use an authorized photo of a drawing as a starting point when that option is available. Avoid protected characters and check how the drawing appears in the result.',
      ],
      [
        'Can I use photographs?',
        'Use your own authorized photos through the options provided. Avoid documents, addresses, school names, precise locations and images of other people without appropriate consent.',
      ],
      [
        'Can I choose a calmer bedtime story?',
        'Yes. Ask for a gentler pace, familiar setting and soft adventure. This is a narrative choice, not a promise about sleep or any other outcome.',
      ],
      [
        'Can I review and change the story?',
        'An adult should review names, words, images and details before sharing. The available editing options appear during creation; remove anything incorrect or sensitive before continuing.',
      ],
      [
        'Is the story private?',
        'The story starts private and does not become public simply because it was created. Sharing or publishing requires a separate action. See the privacy policy for current information about data handling, retention and deletion.',
      ],
      [
        'Can I listen to the story?',
        'All five books on this page include a short localized audio teaser. For a book you create, narration availability is shown in the experience. A short excerpt is not presented as a complete audiobook.',
      ],
      [
        'Which digital, PDF, audio and print formats are available?',
        'Private digital reading is part of the experience. Audio, private sharing, self-print PDF and printed books depend on the current options, applicable price and destination. Check what is displayed before continuing.',
      ],
      [
        'How much does it cost?',
        'Check the pricing page and the amount shown in the creation flow before confirming. Pricing depends on the selected option; this landing page does not publish separate prices or promotions.',
      ],
      [
        'How long do creation and delivery take?',
        'Timing varies by story and format. When printing or delivery applies, the relevant estimate should be shown before confirmation. This page does not promise a fixed turnaround.',
      ],
      [
        'Can the book be created in another language?',
        'Choose one of the languages currently offered in the creation flow. Always review names, family expressions and pronunciation, especially when mixing languages.',
      ],
    ],
    safetyTitle: 'Created by an adult and reviewed before leaving the private space.',
    safetyBody:
      'Mythoria is a creative tool for making personalized stories. It does not replace family, educational, clinical or therapeutic guidance and does not promise sleep, learning or behavior outcomes.',
    finalTitle: 'The next story can begin with something the child already loves.',
    finalBody:
      'Start with a name, interest, drawing, memory or idea. Create the first result and review it carefully before deciding what comes next.',
    about: [
      'Personalized book for children',
      'Personalized children’s story',
      'Custom illustrated children’s book',
      'Personalized gift for a child',
    ],
    serviceName: 'Mythoria personalized children’s book',
    serviceType: 'Personalized illustrated children’s story creation',
  },
  'es-ES': {
    title: 'Libro personalizado para niños',
    metaTitle: 'Libro Personalizado para Niños | Mythoria',
    metaDescription:
      'Convierte el nombre, los intereses, los recuerdos o un dibujo del niño en una historia ilustrada para leer, escuchar, imprimir o regalar.',
    breadcrumb: 'Libro personalizado para niños',
    primaryCta: 'Crear un libro para un niño',
    secondaryCta: 'Ver libros creados con Mythoria',
    cardTitle: 'Libro personalizado para niños',
    cardDescription:
      'Convierte sus intereses, recuerdos y dibujos en una aventura creada a su medida.',
    eyebrow: 'Una historia hecha a la medida del niño',
    headline: 'Crea un libro personalizado donde el niño sea el protagonista.',
    subheadline:
      'Elige los detalles, el tono y el estilo visual. Después revisa el libro terminado antes de compartirlo o elegir un formato disponible.',
    imageAlt:
      'Libro infantil personalizado Mía y la Panadería de la Luna en una escena de lectura nocturna',
    trustBadges: ['Cuenta de adulto', 'Privado por defecto', 'Revisar antes de compartir'],
    quickTitle: '¿Qué es un libro personalizado para niños?',
    quickBody:
      'Es una historia construida con el nombre, la edad, los intereses y los detalles que elija un adulto: personas cercanas, animales, lugares, recuerdos, dibujos o ideas. El adulto define el tono y el estilo visual y revisa el texto y las imágenes antes de compartir, imprimir o pedir cualquier formato disponible.',
    introTitle: 'Mucho más que el nombre en la portada.',
    introBody: [
      'Una personalización con sentido cambia quién entra en la historia, dónde sucede la aventura, qué reto aparece, cómo se adapta el lenguaje y qué detalles regresan en las ilustraciones.',
      'Por ejemplo, «le encantan los perros, las tortitas y una manta amarilla» puede convertirse en una panadería lunar donde el niño y su perro preparan el último sueño antes del amanecer.',
    ],
    fitTitle: 'Un libro terminado, guiado y revisado por un adulto.',
    fitBody: [
      'No hace falta saber escribir una historia completa. Empieza con los detalles que conoces y elige una dirección narrativa y visual.',
      'Antes de que el libro salga del espacio privado, un adulto debe comprobar nombres, texto, imágenes, personas identificables y todo lo que prefiera retirar.',
    ],
    useCasesTitle: 'Una historia puede empezar en muchos lugares.',
    useCasesIntro:
      'Elige un punto de partida cercano al niño y deja que ese detalle guíe el libro.',
    useCases: [
      [
        'El niño como protagonista',
        'Una aventura alrededor de un lugar, criatura u objeto favorito.',
      ],
      [
        'Un cuento para dormir',
        'Un ritmo más tranquilo, rutinas familiares y audio cuando esté disponible.',
      ],
      [
        'Un dibujo convertido en historia',
        'Usa una foto autorizada de un dibujo como semilla creativa para personajes y mundos.',
      ],
      [
        'Un interés favorito',
        'Fútbol, dinosaurios, espacio, trenes, animales, música, ciencia u otro interés seguro.',
      ],
      [
        'Un recuerdo familiar',
        'Una receta, un viaje, una frase, un animal o un día que la familia quiera conservar.',
      ],
      [
        'Un regalo para un día especial',
        'Un cumpleaños, Navidad, un bautizo u otra ocasión que merezca algo único.',
      ],
    ],
    personalizationTitle: 'Personaliza los detalles que hacen única la historia.',
    personalizationIntro:
      'Empieza con unos pocos detalles útiles. La historia puede resultar cercana sin exponer información privada.',
    personalization: [
      [
        'El niño',
        'Elige cómo aparece el personaje y cómo se adapta el texto.',
        ['Nombre o nombre del personaje', 'Franja de edad', 'Pronombres', 'Nivel de lectura'],
      ],
      [
        'Personas y animales',
        'Incluye solo personas y animales relevantes y con la autorización adecuada.',
        ['Familiares', 'Amigos', 'Animales de compañía', 'Compañero imaginario'],
      ],
      [
        'Intereses y detalles',
        'Usa elementos concretos que el niño reconozca sin revelar más de lo necesario.',
        [
          'Aficiones y objetos',
          'Frases familiares',
          'Colores y comidas',
          'Lugares y rutinas seguras',
        ],
      ],
      [
        'Dirección de la historia',
        'Elige el tipo de experiencia que queréis leer juntos.',
        [
          'Aventura o misterio',
          'Dormir o humor',
          'Fantasía o descubrimiento',
          'Deporte o recuerdo familiar',
        ],
      ],
      [
        'Dirección visual',
        'Define el ambiente de las ilustraciones y utiliza contenidos solo con autorización.',
        ['Estilo visual', 'Ambiente de color', 'Dibujo aportado', 'Fotografía autorizada'],
      ],
    ],
    personalizationCta: 'Empezar con una idea',
    benefitsTitle: 'El resultado es personal, no genérico.',
    benefits: [
      'El personaje, el escenario y el reto pueden nacer de los detalles elegidos por el adulto.',
      'La edad, el ritmo y el lenguaje orientan la forma de contar la historia.',
      'El estilo visual da una identidad propia al libro terminado.',
      'La revisión final permite corregir o retirar detalles antes de compartir.',
    ],
    booksEyebrow: 'Libros creados con Mythoria',
    booksTitle: 'Cinco historias, cinco maneras de meter a un niño dentro del libro.',
    booksIntro:
      'Explora libros terminados de Mythoria para distintas edades, intereses y estilos visuales. Abre un capítulo y escucha un fragmento localizado antes de empezar el tuyo.',
    processTitle: 'Cómo crear el libro',
    process: [
      'Empieza con una idea, recuerdo, dibujo, fotografía o nota de voz.',
      'Elige los personajes, el tono, el estilo y la edad de lectura.',
      'Crea la historia y mira el primer resultado.',
      'Revisa nombres, texto, imágenes y detalles.',
      'Lee, escucha, comparte, imprime o pide solo los formatos disponibles.',
    ],
    formatsTitle: 'Elige entre los formatos disponibles para la historia',
    formats: [
      'Lectura digital privada para revisar antes de compartir.',
      'Audio narrado cuando esté disponible para la historia.',
      'Uso compartido privado y PDF para autoimpresión cuando estén disponibles.',
      'Libro impreso según la oferta actual, el precio aplicable y el destino.',
    ],
    privacyTitle: 'Una historia sobre un niño merece decisiones cuidadosas.',
    privacyIntro:
      'Utiliza solo lo necesario para crear el libro. El adulto es responsable de revisar el resultado y decidir si se comparte.',
    privacyItems: [
      [
        'Cuenta y revisión de adulto',
        'Un adulto inicia el libro, comprueba los detalles y decide qué ocurre después.',
      ],
      [
        'Privado por defecto',
        'Crear la historia no la convierte automáticamente en una página pública.',
      ],
      [
        'Contenido con autorización',
        'Utiliza fotos, dibujos o voz solo cuando tengas los derechos y permisos adecuados.',
      ],
      [
        'Revisión antes de compartir',
        'Comprueba el texto, las imágenes, a otras personas y los detalles sensibles antes de enviar, imprimir o publicar.',
      ],
    ],
    faq: [
      [
        '¿Qué puedo personalizar en un libro infantil?',
        'Puedes adaptar el personaje, la edad, los pronombres, los intereses, las personas y animales autorizados, los lugares, las frases, el tipo de aventura y el estilo visual. Incluye solo lo necesario y señala lo que quieras excluir.',
      ],
      [
        '¿Necesito saber escribir?',
        'No. Empieza con una idea breve, un recuerdo, un dibujo, una foto autorizada o una nota de voz. Mythoria ayuda a construir la narración; el adulto sigue siendo responsable de revisarla.',
      ],
      [
        '¿Para qué edades se puede adaptar la historia?',
        'Puedes elegir una franja de edad para orientar el vocabulario, el ritmo y el tipo de historia. Comprueba siempre que el resultado sea adecuado para ese niño.',
      ],
      [
        '¿El niño puede ser el protagonista?',
        'Sí. Usa su nombre o elige otro para el personaje y adapta intereses, aspecto y detalles narrativos sin divulgar información innecesaria.',
      ],
      [
        '¿Puedo incluir familiares o animales?',
        'Sí, cuando sean relevantes. Para personas identificables, utiliza solo información e imágenes autorizadas; para animales, elige los rasgos que ayuden a reconocerlos en la historia.',
      ],
      [
        '¿Puedo transformar un dibujo en una historia?',
        'Puedes usar una foto autorizada de un dibujo como punto de partida cuando esa opción esté disponible. Evita personajes protegidos y comprueba cómo aparecen sus elementos en el resultado.',
      ],
      [
        '¿Puedo usar fotografías?',
        'Utiliza fotos propias y autorizadas mediante las opciones disponibles. Evita documentos, direcciones, nombres de colegios, ubicaciones precisas e imágenes de terceros sin el consentimiento adecuado.',
      ],
      [
        '¿Puedo elegir un cuento para dormir más tranquilo?',
        'Sí. Pide un ritmo suave, un entorno familiar y una aventura tranquila. Es una decisión narrativa, no una promesa sobre el sueño ni sobre ningún otro resultado.',
      ],
      [
        '¿Puedo revisar y cambiar la historia?',
        'Un adulto debe revisar nombres, texto, imágenes y detalles antes de compartir. Las opciones de edición disponibles aparecen durante la creación; retira cualquier dato incorrecto o sensible.',
      ],
      [
        '¿La historia es privada?',
        'La historia empieza siendo privada y no se hace pública por el mero hecho de crearla. Compartir o publicar requiere otra acción. Consulta la política de privacidad para conocer el tratamiento, la conservación y la eliminación de datos.',
      ],
      [
        '¿Puedo escuchar la historia?',
        'Los cinco libros de esta página incluyen un breve teaser de audio localizado. Para un libro que crees, la disponibilidad de narración se muestra en la experiencia. Un fragmento no se presenta como audiolibro completo.',
      ],
      [
        '¿Qué formatos digitales, PDF, audio e impresión están disponibles?',
        'La lectura digital privada forma parte de la experiencia. El audio, el uso compartido privado, el PDF para autoimpresión y el libro físico dependen de las opciones actuales, el precio y el destino.',
      ],
      [
        '¿Cuánto cuesta?',
        'Consulta la página de precios y el importe mostrado durante la creación antes de confirmar. El precio depende de la opción elegida; esta landing no publica precios ni promociones independientes.',
      ],
      [
        '¿Cuánto tardan la creación y la entrega?',
        'El tiempo varía según la historia y el formato. Si la opción incluye impresión o entrega, el plazo correspondiente debe mostrarse antes de confirmar. Esta página no promete un plazo fijo.',
      ],
      [
        '¿Se puede crear el libro en otro idioma?',
        'Elige uno de los idiomas disponibles en el proceso de creación. Revisa siempre nombres, expresiones familiares y pronunciación, especialmente si mezclas idiomas.',
      ],
    ],
    safetyTitle: 'Creado por un adulto y revisado antes de salir del espacio privado.',
    safetyBody:
      'Mythoria es una herramienta creativa para hacer historias personalizadas. No sustituye la orientación familiar, escolar, clínica o terapéutica ni promete resultados de sueño, aprendizaje o conducta.',
    finalTitle: 'La próxima historia puede empezar con algo que el niño ya adora.',
    finalBody:
      'Empieza con un nombre, un interés, un dibujo, un recuerdo o una idea. Crea el primer resultado y revísalo con calma antes de decidir el paso siguiente.',
    about: [
      'Libro personalizado para niños',
      'Cuento infantil personalizado',
      'Libro infantil ilustrado a medida',
      'Regalo personalizado para un niño',
    ],
    serviceName: 'Libro personalizado Mythoria para niños',
    serviceType: 'Creación de cuentos infantiles personalizados e ilustrados',
  },
  'fr-FR': {
    title: 'Livre personnalisé pour enfants',
    metaTitle: 'Livre Personnalisé pour Enfants | Mythoria',
    metaDescription:
      'Transformez le prénom, les centres d’intérêt, les souvenirs ou un dessin de l’enfant en une histoire illustrée à lire, écouter, imprimer ou offrir.',
    breadcrumb: 'Livre personnalisé pour enfants',
    primaryCta: 'Créer un livre pour un enfant',
    secondaryCta: 'Voir des livres créés avec Mythoria',
    cardTitle: 'Livre personnalisé pour enfants',
    cardDescription:
      'Transformez ses passions, ses souvenirs et ses dessins en une aventure créée sur mesure.',
    eyebrow: 'Une histoire créée autour de l’enfant',
    headline: 'Créez un livre personnalisé dont l’enfant devient le héros.',
    subheadline:
      'Choisissez les détails, le ton et le style visuel. Relisez ensuite le livre terminé avant de le partager ou de choisir un format disponible.',
    imageAlt:
      'Livre personnalisé Mia et la Boulangerie de la Lune dans une scène de lecture du soir',
    trustBadges: ['Compte adulte', 'Privé par défaut', 'Relire avant de partager'],
    quickTitle: 'Qu’est-ce qu’un livre personnalisé pour enfants ?',
    quickBody:
      'C’est une histoire construite à partir du prénom, de l’âge, des centres d’intérêt et des détails choisis par un adulte : proches, animaux, lieux, souvenirs, dessins ou idées. L’adulte définit le ton et le style visuel, puis relit le texte et vérifie les images avant tout partage, impression ou commande.',
    introTitle: 'Bien plus qu’un prénom sur la couverture.',
    introBody: [
      'Une personnalisation porteuse de sens change les personnages, le lieu de l’aventure, le défi, le niveau de langue et les détails qui reviennent dans les illustrations.',
      'Par exemple, « adore les chiens, les crêpes et une couverture jaune » peut devenir une boulangerie lunaire où l’enfant et son chien préparent le dernier rêve avant l’aube.',
    ],
    fitTitle: 'Un livre terminé, guidé et relu par un adulte.',
    fitBody: [
      'Nul besoin d’écrire toute une histoire. Commencez par les détails que vous connaissez, puis choisissez une direction narrative et visuelle.',
      'Avant que le livre ne quitte l’espace privé, un adulte doit vérifier les prénoms, le texte, les images, les personnes identifiables et tout élément à retirer.',
    ],
    useCasesTitle: 'Une histoire peut commencer de mille façons.',
    useCasesIntro:
      'Choisissez un point de départ familier à l’enfant et laissez ce détail guider le livre.',
    useCases: [
      [
        'L’enfant comme héros',
        'Une aventure autour d’un lieu, d’une créature ou d’un objet préféré.',
      ],
      [
        'Une histoire du soir',
        'Un rythme plus calme, des routines familières et de l’audio si disponible.',
      ],
      [
        'Un dessin transformé en histoire',
        'Utilisez la photo autorisée d’un dessin comme point de départ pour les personnages et les mondes.',
      ],
      [
        'Une passion',
        'Football, dinosaures, espace, trains, animaux, musique, sciences ou autre intérêt sûr.',
      ],
      [
        'Un souvenir de famille',
        'Une recette, un voyage, une phrase, un animal ou une journée que la famille souhaite garder.',
      ],
      [
        'Un cadeau pour une date spéciale',
        'Un anniversaire, Noël, un baptême ou une autre occasion qui mérite quelque chose d’unique.',
      ],
    ],
    personalizationTitle: 'Personnalisez les détails qui rendent l’histoire unique.',
    personalizationIntro:
      'Commencez par quelques détails utiles. L’histoire peut sembler familière sans exposer d’informations privées.',
    personalization: [
      [
        'L’enfant',
        'Choisissez la façon dont le personnage apparaît et dont le texte s’adapte.',
        ['Prénom ou nom du personnage', 'Tranche d’âge', 'Pronoms', 'Niveau de lecture'],
      ],
      [
        'Les proches et les animaux',
        'N’incluez que les personnes et animaux utiles, avec les autorisations adaptées.',
        ['Famille', 'Amis', 'Animaux de compagnie', 'Compagnon imaginaire'],
      ],
      [
        'Les passions et les détails',
        'Utilisez des éléments concrets que l’enfant reconnaît sans révéler plus que nécessaire.',
        [
          'Loisirs et objets',
          'Expressions familiales',
          'Couleurs et aliments',
          'Lieux et routines sûrs',
        ],
      ],
      [
        'La direction de l’histoire',
        'Choisissez l’expérience que vous souhaitez lire ensemble.',
        [
          'Aventure ou mystère',
          'Sommeil ou humour',
          'Fantaisie ou découverte',
          'Sport ou souvenir de famille',
        ],
      ],
      [
        'La direction visuelle',
        'Définissez l’ambiance des images et utilisez des contenus uniquement avec autorisation.',
        ['Style visuel', 'Ambiance colorée', 'Dessin fourni', 'Photographie autorisée'],
      ],
    ],
    personalizationCta: 'Commencer par une idée',
    benefitsTitle: 'Le résultat est personnel, jamais générique.',
    benefits: [
      'Le personnage, le décor et le défi peuvent naître des détails choisis par l’adulte.',
      'L’âge, le rythme et la langue orientent la manière de raconter.',
      'Le style visuel donne au livre terminé une identité propre.',
      'La relecture finale permet de corriger ou retirer des détails avant tout partage.',
    ],
    booksEyebrow: 'Livres créés avec Mythoria',
    booksTitle: 'Cinq histoires, cinq façons de faire entrer un enfant dans le livre.',
    booksIntro:
      'Découvrez des livres Mythoria terminés pour différents âges, passions et styles visuels. Ouvrez un chapitre et écoutez un extrait localisé avant de commencer le vôtre.',
    processTitle: 'Comment créer le livre',
    process: [
      'Commencez par une idée, un souvenir, un dessin, une photographie ou un message vocal.',
      'Choisissez les personnages, le ton, le style et l’âge de lecture.',
      'Créez l’histoire et découvrez le premier résultat.',
      'Relisez les prénoms, le texte, les images et les détails.',
      'Lisez, écoutez, partagez, imprimez ou commandez uniquement les formats disponibles.',
    ],
    formatsTitle: 'Choisissez parmi les formats disponibles pour cette histoire',
    formats: [
      'Lecture numérique privée pour relire avant tout partage.',
      'Audio narré lorsqu’il est disponible pour l’histoire.',
      'Partage privé et PDF à imprimer soi-même lorsqu’ils sont disponibles.',
      'Livre imprimé selon l’offre actuelle, le prix applicable et la destination.',
    ],
    privacyTitle: 'Une histoire sur un enfant mérite des choix attentifs.',
    privacyIntro:
      'N’utilisez que ce qui est nécessaire. L’adulte est responsable de la relecture et de toute décision de partage.',
    privacyItems: [
      [
        'Compte et relecture adultes',
        'Un adulte commence le livre, vérifie les détails et décide de la suite.',
      ],
      [
        'Privé par défaut',
        'Créer l’histoire ne la transforme pas automatiquement en page publique.',
      ],
      [
        'Contenus utilisés avec autorisation',
        'N’utilisez des photos, dessins ou voix que si vous disposez des droits et autorisations nécessaires.',
      ],
      [
        'Relire avant de partager',
        'Vérifiez le texte, les images, les tiers et les détails sensibles avant tout envoi, impression ou publication.',
      ],
    ],
    faq: [
      [
        'Que peut-on personnaliser dans un livre pour enfants ?',
        'Vous pouvez adapter le personnage, l’âge, les pronoms, les passions, les proches et animaux autorisés, les lieux, les expressions, le type d’aventure et le style visuel. N’incluez que le nécessaire et signalez ce que vous souhaitez exclure.',
      ],
      [
        'Faut-il savoir écrire ?',
        'Non. Commencez par une courte idée, un souvenir, un dessin, une photo autorisée ou un message vocal. Mythoria aide à construire le récit ; l’adulte reste responsable de la relecture.',
      ],
      [
        'À quels âges l’histoire peut-elle être adaptée ?',
        'Vous pouvez choisir une tranche d’âge pour orienter le vocabulaire, le rythme et le type d’histoire. Vérifiez toujours que le résultat convient à l’enfant concerné.',
      ],
      [
        'L’enfant peut-il être le personnage principal ?',
        'Oui. Utilisez son prénom ou choisissez un autre nom, puis adaptez ses passions, son apparence et les détails du récit sans divulguer d’informations inutiles.',
      ],
      [
        'Peut-on inclure des proches ou des animaux ?',
        'Oui, lorsqu’ils sont utiles à l’histoire. Pour les personnes identifiables, n’utilisez que des informations et images autorisées ; pour les animaux, choisissez les traits qui les rendent reconnaissables.',
      ],
      [
        'Peut-on transformer un dessin en histoire ?',
        'Vous pouvez utiliser la photo autorisée d’un dessin comme point de départ lorsque cette option est proposée. Évitez les personnages protégés et vérifiez comment le dessin apparaît dans le résultat.',
      ],
      [
        'Peut-on utiliser des photographies ?',
        'Utilisez vos propres photos autorisées dans les options proposées. Évitez les documents, adresses, noms d’école, lieux précis et images de tiers sans consentement adapté.',
      ],
      [
        'Peut-on choisir une histoire du soir plus calme ?',
        'Oui. Demandez un rythme doux, un cadre familier et une aventure paisible. Il s’agit d’un choix narratif, pas d’une promesse concernant le sommeil ou un autre résultat.',
      ],
      [
        'Peut-on relire et modifier l’histoire ?',
        'Un adulte doit relire les prénoms, le texte, les images et les détails avant tout partage. Les options de modification disponibles sont présentées pendant la création ; retirez tout élément incorrect ou sensible.',
      ],
      [
        'L’histoire est-elle privée ?',
        'L’histoire est privée au départ et ne devient pas publique simplement parce qu’elle a été créée. Le partage ou la publication exige une action distincte. Consultez la politique de confidentialité pour les informations actuelles.',
      ],
      [
        'Peut-on écouter l’histoire ?',
        'Les cinq livres de cette page comprennent un court extrait audio localisé. Pour un livre que vous créez, la disponibilité de la narration est indiquée dans l’expérience. Un extrait n’est pas présenté comme un livre audio complet.',
      ],
      [
        'Quels formats numériques, PDF, audio et imprimés sont disponibles ?',
        'La lecture numérique privée fait partie de l’expérience. L’audio, le partage privé, le PDF à imprimer soi-même et le livre imprimé dépendent des options actuelles, du prix et de la destination.',
      ],
      [
        'Combien cela coûte-t-il ?',
        'Consultez la page des tarifs et le montant affiché dans le parcours avant de confirmer. Le prix dépend de l’option choisie ; cette page ne publie pas de prix ni de promotion indépendants.',
      ],
      [
        'Combien de temps prennent la création et la livraison ?',
        'Le délai varie selon l’histoire et le format. Si l’option choisie comprend l’impression ou la livraison, l’estimation doit être affichée avant confirmation. Cette page ne promet pas de délai fixe.',
      ],
      [
        'Le livre peut-il être créé dans une autre langue ?',
        'Choisissez l’une des langues proposées dans le parcours de création. Relisez toujours les prénoms, les expressions familiales et la prononciation, surtout si vous mélangez plusieurs langues.',
      ],
    ],
    safetyTitle: 'Créé par un adulte et relu avant de quitter l’espace privé.',
    safetyBody:
      'Mythoria est un outil créatif pour réaliser des histoires personnalisées. Il ne remplace aucun accompagnement familial, scolaire, clinique ou thérapeutique et ne promet aucun résultat de sommeil, d’apprentissage ou de comportement.',
    finalTitle: 'La prochaine histoire peut partir de ce que l’enfant aime déjà.',
    finalBody:
      'Commencez par un prénom, une passion, un dessin, un souvenir ou une idée. Créez un premier résultat et relisez-le attentivement avant de décider de la suite.',
    about: [
      'Livre personnalisé pour enfants',
      'Histoire personnalisée pour enfants',
      'Livre illustré sur mesure',
      'Cadeau personnalisé pour un enfant',
    ],
    serviceName: 'Livre personnalisé Mythoria pour enfants',
    serviceType: 'Création d’histoires personnalisées et illustrées pour enfants',
  },
} as const;

const useCaseIcons = [
  'fa-child-careful-ages-papercut.webp',
  'fa-moon-support-papercut.webp',
  'fa-pencil-alt-papercut.webp',
  'fa-star-business-differentiation-papercut.webp',
  'fa-heart-business-family-papercut.webp',
  'fa-gift-papercut.webp',
] as const;

const personalizationIcons = [
  'fa-child-careful-ages-papercut.webp',
  'fa-heart-business-family-papercut.webp',
  'fa-star-business-differentiation-papercut.webp',
  'openBook.webp',
  'fa-pencil-alt-papercut.webp',
] as const;

const privacyIcons = [
  'fa-user-papercut.webp',
  'fa-lock-romance-papercut.webp',
  'fa-camera-papercut.webp',
  'fa-check-papercut.webp',
] as const;

const audioTranscriptLabels: Record<LocalizedLandingLocale, string> = {
  'en-US': 'Read the excerpt transcript',
  'es-ES': 'Leer la transcripción del fragmento',
  'fr-FR': 'Lire la transcription de l’extrait',
};

function createChildrenBooksLandingPage(locale: LocalizedLandingLocale): LandingPageContent {
  const copy = pageCopy[locale];
  const slug = slugs[locale];
  const assetBase = getLocalizedAssetBase(sourceLandingSlug, locale);

  return {
    translationKey: 'personalized-children-books',
    slug,
    locale,
    title: copy.title,
    metaTitle: copy.metaTitle,
    metaDescription: copy.metaDescription,
    breadcrumbLabel: copy.breadcrumb,
    ogImageSrc: `${assetBase}/hero/og-cover.jpeg`,
    primaryIntent: 'kids_adventures',
    riskRating: 'yellow',
    updatedAt: '2026-08-11',
    indexable: true,
    showInLandingPageIndex: true,
    showFormatsNearHero: false,
    showFormatsNearProcess: true,
    primaryCtaHref: `/${locale}/tell-your-story/step-1?landingSlug=${slug}&primaryIntent=kids_adventures`,
    secondaryCtaHref: '#exemplos',
    primaryCta: copy.primaryCta,
    secondaryCta: copy.secondaryCta,
    homepageCard: { title: copy.cardTitle, description: copy.cardDescription },
    templateIcons: commonTemplateIcons,
    analytics: {
      pageViewEvent: 'landing_page_view',
      variant: `personalized-children-books-${locale}`,
    },
    hero: {
      eyebrow: copy.eyebrow,
      headline: copy.headline,
      subheadline: copy.subheadline,
      imageSrc: `${assetBase}/hero/hero.jpeg`,
      imageAlt: copy.imageAlt,
    },
    trustBadges: [...copy.trustBadges],
    quickAnswer: { title: copy.quickTitle, body: copy.quickBody },
    intro: { title: copy.introTitle, body: [...copy.introBody] },
    whyThisFits: { title: copy.fitTitle, body: [...copy.fitBody] },
    useCases: {
      title: copy.useCasesTitle,
      intro: copy.useCasesIntro,
      items: copy.useCases.map(([title, body], index) => ({
        title,
        body,
        iconSrc: `${iconBase}/${useCaseIcons[index]}`,
        iconAlt: '',
      })),
    },
    personalization: {
      title: copy.personalizationTitle,
      intro: copy.personalizationIntro,
      groups: copy.personalization.map(([title, body, choices], index) => ({
        title,
        body,
        choices: [...choices],
        iconSrc: `${iconBase}/${personalizationIcons[index]}`,
        iconAlt: '',
      })),
      ctaLabel: copy.personalizationCta,
    },
    carefulBenefits: { title: copy.benefitsTitle, items: [...copy.benefits] },
    booksSection: {
      eyebrow: copy.booksEyebrow,
      title: copy.booksTitle,
      intro: copy.booksIntro,
    },
    books: buildLocalizedBooks({
      translationKey: 'personalized-children-books',
      sourceLandingSlug,
      locale,
      books: books[locale].map((book) => ({
        ...book,
        audioTranscript: [book.excerpt, ...book.sampleParagraphs].join(' '),
        audioTranscriptLabel: audioTranscriptLabels[locale],
      })),
    }),
    process: { title: copy.processTitle, steps: [...copy.process] },
    formats: { title: copy.formatsTitle, items: [...copy.formats] },
    trustAndPrivacy: {
      title: copy.privacyTitle,
      intro: copy.privacyIntro,
      items: copy.privacyItems.map(([title, body], index) => ({
        title,
        body,
        iconSrc: `${iconBase}/${privacyIcons[index]}`,
        iconAlt: '',
      })),
    },
    faq: copy.faq.map(([question, answer]) => ({ question, answer })),
    safetyNote: { title: copy.safetyTitle, body: copy.safetyBody },
    finalCta: { title: copy.finalTitle, body: copy.finalBody },
    structuredData: {
      about: [...copy.about],
      serviceName: copy.serviceName,
      serviceType: copy.serviceType,
      areaServed: getAreaServed(locale),
      includeProduct: false,
    },
  };
}

export const childrenBooksLocalizedLandingPages = (['en-US', 'es-ES', 'fr-FR'] as const).map(
  createChildrenBooksLandingPage,
);
