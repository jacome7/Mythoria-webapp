import {
  buildLocalizedBooks,
  commonTemplateIcons,
  getAreaServed,
  getLocalizedAssetBase,
  type LocalizedBookCopy,
  type LocalizedLandingLocale,
} from './localized-shared';
import type { LandingPageContent } from './types';

const sourceLandingSlug = 'livro-personalizado-para-casais';

const slugs: Record<LocalizedLandingLocale, string> = {
  'en-US': 'personalized-book-for-couples',
  'es-ES': 'libro-personalizado-para-parejas',
  'fr-FR': 'livre-personnalise-pour-couples',
};

const commonBookMeta = {
  ageLabel: { 'en-US': 'Adults', 'es-ES': 'Adultos', 'fr-FR': 'Adultes' },
  audioSampleTitle: {
    'en-US': 'Listen to the narrated excerpt',
    'es-ES': 'Escuchar el fragmento narrado',
    'fr-FR': 'Écouter l’extrait raconté',
  },
} as const;

function book(
  locale: LocalizedLandingLocale,
  data: Omit<LocalizedBookCopy, 'ageLabel' | 'audioSampleTitle'>,
): LocalizedBookCopy {
  return {
    ...data,
    ageLabel: commonBookMeta.ageLabel[locale],
    audioSampleTitle: commonBookMeta.audioSampleTitle[locale],
  };
}

const books: Record<LocalizedLandingLocale, LocalizedBookCopy[]> = {
  'en-US': [
    book('en-US', {
      sourceSlug: 'ines-e-diogo-um-amor-inesperado',
      title: 'Emma & Daniel — An Unexpected Love',
      synopsis:
        'A Brooklyn downpour brings Emma and Daniel under the same café awning, turning a delay into the first chapter of their life together.',
      excerpt:
        'The rain began three minutes before Emma decided this would be a perfectly ordinary day.',
      sampleTitle: 'Three Minutes of Rain',
      sampleParagraphs: [
        'Emma reached the Brooklyn café awning with a book under her arm and no time to save it from the rain. Daniel moved his paper bag and offered the only dry chair.',
        'They spoke about books, cafés and the last sentences people read too soon. The rain eased, but neither of them stood up.',
      ],
      imageAlt: 'Personalized couples book Emma & Daniel — An Unexpected Love in Brooklyn',
      styleLabel: 'Watercolor',
      contextLabel: 'First meeting',
    }),
    book('en-US', {
      sourceSlug: 'o-nosso-primeiro-beijo-foi-so-o-principio',
      title: 'Our First Kiss Was Only the Beginning',
      synopsis:
        'After a bus, a phone call and nervous laughter interrupt every attempt, the first kiss happens when they stop trying to make it perfect.',
      excerpt: 'For years, they disagreed about who leaned in first.',
      sampleTitle: 'The Kiss That Refused a Plan',
      sampleParagraphs: [
        'The bus arrived at the wrong moment, then the phone rang, then both of them laughed too hard to say anything useful.',
        'When they finally stopped arranging the moment, it arrived quietly—and became the story they would retell differently for years.',
      ],
      imageAlt: 'Romantic book about a couple remembering their first kiss',
      styleLabel: 'Minimalist',
      contextLabel: 'First kiss',
    }),
    book('en-US', {
      sourceSlug: 'duas-chavenas-uma-vida',
      title: 'Two Cups, One Life',
      synopsis:
        'A shared life is told through the cups that followed new homes, jobs, rushed mornings and comfortable silences.',
      excerpt: 'The first cup chipped before they had a home in which to keep it.',
      sampleTitle: 'The Cup with the Blue Line',
      sampleParagraphs: [
        'One cup came from a tiny apartment; the other from the kitchen they chose together years later. Neither matched, but both remembered everything.',
        'Each scratch marked a morning, a decision or a silence that felt less empty because they shared it.',
      ],
      imageAlt: 'Personalized couples book beside two well-used cups',
      styleLabel: 'Oil painting',
      contextLabel: 'A life together',
    }),
    book('en-US', {
      sourceSlug: 'leonor-e-matilde-dois-paises-uma-casa',
      title: 'Eleanor & Matilda — Two Countries, One Home',
      synopsis:
        'Between New York and Toronto, voice notes, delayed flights and shared lists help Eleanor and Matilda build their own meaning of home.',
      excerpt: 'For two years, their home had two departure gates.',
      sampleTitle: 'Sunday Between Two Time Zones',
      sampleParagraphs: [
        'Every Sunday began with one phone charging in New York and another ringing in Toronto. They cooked the same meal and compared the weather.',
        'The distance stayed real, but their rituals gave it doors, windows and a table they could already imagine sharing.',
      ],
      imageAlt: 'Romantic book Eleanor & Matilda — Two Countries, One Home',
      styleLabel: 'Digital art',
      contextLabel: 'Long-distance love',
    }),
    book('en-US', {
      sourceSlug: 'rui-e-tomas-o-ultimo-capitulo-antes-do-sim',
      title: 'Ryan & Thomas — The Last Chapter Before Yes',
      synopsis:
        'Ryan gathers the places where he and Thomas became a team, leaving the final chapter open for an answer outside the book.',
      excerpt: 'Every important decision they made began with a plan neither of them followed.',
      sampleTitle: 'A Chapter with No Ending Yet',
      sampleParagraphs: [
        'Ryan wrote down the neighborhood bakery, the rain-soaked park and the kitchen floor where their biggest decisions had begun.',
        'He left the final page almost empty. That ending belonged to a question the book could prepare, but never answer for them.',
      ],
      imageAlt: 'Personalized proposal book Ryan & Thomas — The Last Chapter Before Yes',
      styleLabel: 'Minimalist',
      contextLabel: 'The next chapter',
    }),
  ],
  'es-ES': [
    book('es-ES', {
      sourceSlug: 'ines-e-diogo-um-amor-inesperado',
      title: 'Inés y Diego — Un amor inesperado',
      synopsis:
        'Un aguacero en Madrid reúne a Inés y Diego bajo el mismo toldo y convierte un retraso en el primer capítulo de su vida en común.',
      excerpt:
        'La lluvia empezó tres minutos antes de que Inés decidiera que aquel sería un día normal.',
      sampleTitle: 'Tres minutos de lluvia',
      sampleParagraphs: [
        'Inés llegó al toldo de una cafetería de Madrid con un libro bajo el brazo y sin tiempo para protegerlo. Diego apartó su bolsa de papel y ofreció la única silla seca.',
        'Hablaron de libros, cafés y finales que algunas personas leen demasiado pronto. La lluvia disminuyó, pero ninguno se levantó.',
      ],
      imageAlt: 'Libro personalizado Inés y Diego — Un amor inesperado ambientado en Madrid',
      styleLabel: 'Acuarela',
      contextLabel: 'Primer encuentro',
    }),
    book('es-ES', {
      sourceSlug: 'o-nosso-primeiro-beijo-foi-so-o-principio',
      title: 'Nuestro primer beso solo fue el principio',
      synopsis:
        'Después de que un autobús, una llamada y varias risas interrumpan cada intento, el primer beso llega cuando dejan de buscar la perfección.',
      excerpt: 'Durante años discutieron sobre quién se acercó primero.',
      sampleTitle: 'El beso que no quiso seguir el plan',
      sampleParagraphs: [
        'El autobús llegó en el peor momento, después sonó el teléfono y luego ambos se rieron demasiado para decir algo sensato.',
        'Cuando dejaron de organizar el instante, ocurrió en silencio y se convirtió en una historia que cada uno recordaría de forma distinta.',
      ],
      imageAlt: 'Libro romántico sobre una pareja que recuerda su primer beso',
      styleLabel: 'Minimalista',
      contextLabel: 'Primer beso',
    }),
    book('es-ES', {
      sourceSlug: 'duas-chavenas-uma-vida',
      title: 'Dos tazas, una vida',
      synopsis:
        'Una vida compartida se cuenta a través de las tazas que acompañaron casas nuevas, trabajos, mañanas con prisa y silencios cómodos.',
      excerpt: 'La primera taza se desconchó antes de que tuvieran una casa donde guardarla.',
      sampleTitle: 'La taza de la línea azul',
      sampleParagraphs: [
        'Una taza venía de un piso diminuto; la otra, de la cocina que eligieron juntos años después. No combinaban, pero lo recordaban todo.',
        'Cada marca señalaba una mañana, una decisión o un silencio que pesaba menos porque era compartido.',
      ],
      imageAlt: 'Libro personalizado para parejas junto a dos tazas usadas',
      styleLabel: 'Pintura al óleo',
      contextLabel: 'Vida compartida',
    }),
    book('es-ES', {
      sourceSlug: 'leonor-e-matilde-dois-paises-uma-casa',
      title: 'Leonor y Matilde — Dos países, un hogar',
      synopsis:
        'Entre Madrid y París, audios, vuelos retrasados y listas compartidas ayudan a Leonor y Matilde a construir su propia idea de hogar.',
      excerpt: 'Durante dos años, su hogar tuvo dos puertas de embarque.',
      sampleTitle: 'Un domingo entre dos husos horarios',
      sampleParagraphs: [
        'Cada domingo empezaba con un móvil cargándose en Madrid y otro sonando en París. Cocinaban lo mismo y comparaban el tiempo.',
        'La distancia seguía siendo real, pero sus rituales le daban puertas, ventanas y una mesa que ya podían imaginar juntas.',
      ],
      imageAlt: 'Libro romántico sobre Leonor y Matilde viviendo en dos países',
      styleLabel: 'Arte digital',
      contextLabel: 'Amor a distancia',
    }),
    book('es-ES', {
      sourceSlug: 'rui-e-tomas-o-ultimo-capitulo-antes-do-sim',
      title: 'Raúl y Tomás — El último capítulo antes del sí',
      synopsis:
        'Raúl reúne los lugares donde él y Tomás se convirtieron en equipo y deja el capítulo final abierto para una respuesta fuera del libro.',
      excerpt: 'Todas sus decisiones importantes empezaron con un plan que ninguno cumplió.',
      sampleTitle: 'Un capítulo que todavía no tiene final',
      sampleParagraphs: [
        'Raúl apuntó la panadería del barrio, el parque bajo la lluvia y el suelo de la cocina donde habían empezado sus decisiones más grandes.',
        'Dejó casi vacía la última página. Aquel final pertenecía a una pregunta que el libro podía preparar, pero nunca responder por ellos.',
      ],
      imageAlt: 'Libro personalizado de pedida Raúl y Tomás — El último capítulo antes del sí',
      styleLabel: 'Minimalista',
      contextLabel: 'El siguiente capítulo',
    }),
  ],
  'fr-FR': [
    book('fr-FR', {
      sourceSlug: 'ines-e-diogo-um-amor-inesperado',
      title: 'Inès & Hugo — Un amour inattendu',
      synopsis:
        'Une averse à Paris réunit Inès et Hugo sous le même auvent et transforme un retard en premier chapitre de leur vie commune.',
      excerpt:
        'La pluie commença trois minutes avant qu’Inès décide que cette journée serait parfaitement ordinaire.',
      sampleTitle: 'Trois minutes de pluie',
      sampleParagraphs: [
        'Inès atteignit l’auvent d’un café parisien, un livre sous le bras, sans avoir le temps de le protéger. Hugo déplaça son sac en papier et lui proposa la seule chaise sèche.',
        'Ils parlèrent de livres, de cafés et des dernières phrases que certains lisent trop tôt. La pluie faiblit, mais aucun ne se leva.',
      ],
      imageAlt: 'Livre personnalisé Inès & Hugo — Un amour inattendu situé à Paris',
      styleLabel: 'Aquarelle',
      contextLabel: 'Première rencontre',
    }),
    book('fr-FR', {
      sourceSlug: 'o-nosso-primeiro-beijo-foi-so-o-principio',
      title: 'Notre premier baiser n’était que le début',
      synopsis:
        'Après un bus, un appel et plusieurs éclats de rire, le premier baiser arrive lorsqu’ils cessent de vouloir le rendre parfait.',
      excerpt:
        'Pendant des années, ils ne furent pas d’accord sur la personne qui s’était approchée la première.',
      sampleTitle: 'Le baiser qui refusa le programme',
      sampleParagraphs: [
        'Le bus arriva au mauvais moment, puis le téléphone sonna, et tous deux rirent trop pour prononcer une phrase utile.',
        'Lorsqu’ils cessèrent d’organiser l’instant, il arriva doucement et devint une histoire qu’ils raconteraient chacun à leur façon.',
      ],
      imageAlt: 'Livre romantique sur le souvenir d’un premier baiser',
      styleLabel: 'Minimaliste',
      contextLabel: 'Premier baiser',
    }),
    book('fr-FR', {
      sourceSlug: 'duas-chavenas-uma-vida',
      title: 'Deux tasses, une vie',
      synopsis:
        'Une vie à deux se raconte à travers les tasses qui ont connu nouveaux logements, emplois, matins pressés et silences confortables.',
      excerpt: 'La première tasse s’ébrécha avant qu’ils aient une maison où la ranger.',
      sampleTitle: 'La tasse au trait bleu',
      sampleParagraphs: [
        'Une tasse venait d’un minuscule appartement ; l’autre, de la cuisine choisie ensemble des années plus tard. Elles n’étaient pas assorties, mais se souvenaient de tout.',
        'Chaque marque racontait un matin, une décision ou un silence devenu plus léger parce qu’il était partagé.',
      ],
      imageAlt: 'Livre personnalisé pour couples près de deux tasses usées',
      styleLabel: 'Peinture à l’huile',
      contextLabel: 'Vie à deux',
    }),
    book('fr-FR', {
      sourceSlug: 'leonor-e-matilde-dois-paises-uma-casa',
      title: 'Léonie & Mathilde — Deux pays, un foyer',
      synopsis:
        'Entre Paris et Bruxelles, messages vocaux, vols retardés et listes partagées aident Léonie et Mathilde à construire leur idée du foyer.',
      excerpt: 'Pendant deux ans, leur maison eut deux portes d’embarquement.',
      sampleTitle: 'Un dimanche entre deux fuseaux horaires',
      sampleParagraphs: [
        'Chaque dimanche commençait avec un téléphone en charge à Paris et un autre qui sonnait à Bruxelles. Elles préparaient le même plat et comparaient la météo.',
        'La distance restait réelle, mais leurs rituels lui donnaient des portes, des fenêtres et une table qu’elles imaginaient déjà partager.',
      ],
      imageAlt: 'Livre romantique Léonie & Mathilde — Deux pays, un foyer',
      styleLabel: 'Art numérique',
      contextLabel: 'Amour à distance',
    }),
    book('fr-FR', {
      sourceSlug: 'rui-e-tomas-o-ultimo-capitulo-antes-do-sim',
      title: 'Louis & Thomas — Le dernier chapitre avant oui',
      synopsis:
        'Louis rassemble les lieux où Thomas et lui sont devenus une équipe, puis laisse le dernier chapitre ouvert pour une réponse hors du livre.',
      excerpt:
        'Toutes leurs grandes décisions avaient commencé par un projet qu’aucun des deux n’avait suivi.',
      sampleTitle: 'Un chapitre sans fin pour le moment',
      sampleParagraphs: [
        'Louis nota la boulangerie du quartier, le parc sous la pluie et le sol de la cuisine où leurs plus grandes décisions avaient commencé.',
        'Il laissa la dernière page presque vide. Cette fin appartenait à une question que le livre pouvait préparer, mais jamais résoudre à leur place.',
      ],
      imageAlt: 'Livre personnalisé de demande Louis & Thomas — Le dernier chapitre avant oui',
      styleLabel: 'Minimaliste',
      contextLabel: 'Le prochain chapitre',
    }),
  ],
};

const copy = {
  'en-US': {
    title: 'Personalized book for couples',
    metaTitle: 'Personalized Book for Couples | Your Story — Mythoria',
    metaDescription:
      'Turn meetings, messages, trips and everyday rituals into a personalized book for the person who lived them with you.',
    breadcrumb: 'Personalized book for couples',
    primaryCta: 'Start our story',
    secondaryCta: 'See sample books',
    cardDescription: 'A romantic gift shaped by the moments and details only the couple knows.',
    eyebrow: 'A gift that could only be yours',
    headline: 'Your story deserves a book.',
    subheadline:
      'From the first meeting to everyday rituals, turn your relationship memories into a unique story you can review before giving.',
    imageAlt: 'An adult couple reading a personalized romantic book together',
    quickTitle: 'What is a personalized book for a couple?',
    quickBody:
      'It is a story created from moments in your relationship—names, places, messages, firsts, trips and small habits—shaped into a book you can review before giving. Only the details you choose are included. You can select the tone, explore book examples and adjust the result before sharing it.',
    introTitle: 'Some gifts matter because of what they bring back',
    introBody: [
      'A beautiful object may still say very little. A story keeps the context: the message almost never sent, the table where you talked for hours or the trip that went wrong and became perfect.',
      'Mythoria helps arrange those fragments into a beginning, a middle and a future without asking you to be a writer.',
    ],
    fitTitle: 'Made from details, not formulas',
    fitBody: [
      'Tell an unlikely beginning, a long-distance relationship, years together or a quiet surprise whose real ending happens outside the book.',
      'Adjust the words, images and tone, then confirm names, dates and third-party details before sharing.',
    ],
    benefitsTitle: 'A personal story with room to review',
    benefits: [
      'Built from the memories you choose.',
      'Keeps the couple’s own tone.',
      'Editable before you give it.',
      'Private by default.',
    ],
    booksTitle: 'Five ways to tell a story for two',
    booksIntro: 'Open a chapter, see the illustration and listen to each localized excerpt.',
    processTitle: 'Begin with five simple details',
    process: [
      'Choose the people and occasion.',
      'Add the moments that hold the story together.',
      'Include meaningful places, phrases and rituals.',
      'Choose the narrative and visual style.',
      'Review every name, word and image before sharing.',
    ],
    formatsTitle: 'Available ways to enjoy the book',
    formats: [
      'Private digital reading.',
      'Localized audio when available.',
      'Self-print PDF when available.',
      'Printed book depending on destination and availability.',
    ],
    faq: [
      [
        'Do I need to know how to write?',
        'No. Begin with a memory, message or a few episodes; the guided flow helps shape them into a book.',
      ],
      [
        'Can I edit the book?',
        'Yes. Review and adjust names, dates, text, tone and images before giving it.',
      ],
      [
        'Can I include photos?',
        'Yes, when the option is available and you have permission to use images of identifiable people.',
      ],
      [
        'Does our story stay private?',
        'It stays private by default and is not automatically published.',
      ],
      [
        'Can we create it in another language?',
        'Yes. Choose one of the languages supported by Mythoria and review the localized result.',
      ],
    ],
    safetyTitle: 'Protect the details that belong to both of you',
    safetyBody:
      'Avoid addresses, contact details, intimate information and third-party data without permission. Review everything before sharing.',
    finalTitle: 'The next chapter can begin with the memories you already share.',
    finalBody:
      'Choose one moment and add the details only you recognize. Mythoria will help turn them into a book to give and revisit.',
    about: ['Personalized books for couples', 'Romantic gifts', 'Relationship memories'],
    serviceName: 'Mythoria personalized book for couples',
    serviceType: 'Personalized digital, audio, PDF and printed book',
  },
  'es-ES': {
    title: 'Libro personalizado para parejas',
    metaTitle: 'Libro personalizado para parejas | Vuestra historia — Mythoria',
    metaDescription:
      'Convierte encuentros, mensajes, viajes y rituales cotidianos en un libro personalizado para la persona que los vivió contigo.',
    breadcrumb: 'Libro personalizado para parejas',
    primaryCta: 'Empezar nuestra historia',
    secondaryCta: 'Ver libros de ejemplo',
    cardDescription:
      'Un regalo romántico creado con momentos y detalles que solo conoce la pareja.',
    eyebrow: 'Un regalo que solo podía ser vuestro',
    headline: 'Vuestra historia merece un libro.',
    subheadline:
      'Desde el primer encuentro hasta los rituales cotidianos, convierte los recuerdos de la relación en una historia única que podéis revisar antes de regalar.',
    imageAlt: 'Una pareja adulta lee junta un libro romántico personalizado',
    quickTitle: '¿Qué es un libro personalizado para una pareja?',
    quickBody:
      'Es una historia creada a partir de momentos de la relación —nombres, lugares, mensajes, primeras veces, viajes y pequeños hábitos— y organizada en un libro que podéis revisar antes de regalar. Solo incluye los detalles que decidáis contar. Podéis elegir el tono, explorar ejemplos de libros y ajustar el resultado antes de compartirlo.',
    introTitle: 'Hay regalos que importan por lo que hacen recordar',
    introBody: [
      'Un objeto bonito puede decir muy poco. Una historia guarda el contexto: el mensaje que casi no se envió, la mesa donde hablasteis durante horas o el viaje que salió mal y terminó siendo perfecto.',
      'Mythoria ayuda a ordenar esos fragmentos en un principio, un desarrollo y un futuro sin exigir que sepáis escribir.',
    ],
    fitTitle: 'Hecho con detalles, no con fórmulas',
    fitBody: [
      'Contad un comienzo improbable, una relación a distancia, años de vida compartida o una sorpresa cuyo final real sucede fuera del libro.',
      'Ajustad palabras, imágenes y tono, y confirmad nombres, fechas y datos de terceros antes de compartir.',
    ],
    benefitsTitle: 'Una historia personal que podéis revisar',
    benefits: [
      'Nace de los recuerdos que elegís.',
      'Mantiene el tono propio de la pareja.',
      'Se puede editar antes de regalar.',
      'Es privada por defecto.',
    ],
    booksTitle: 'Cinco formas de contar una historia de dos',
    booksIntro: 'Abre un capítulo, mira la ilustración y escucha cada fragmento localizado.',
    processTitle: 'Empieza con cinco detalles sencillos',
    process: [
      'Elige las personas y la ocasión.',
      'Añade los momentos que sostienen la historia.',
      'Incluye lugares, frases y rituales importantes.',
      'Escoge el estilo narrativo y visual.',
      'Revisa todos los nombres, palabras e imágenes antes de compartir.',
    ],
    formatsTitle: 'Formas disponibles de disfrutar el libro',
    formats: [
      'Lectura digital privada.',
      'Audio localizado cuando esté disponible.',
      'PDF para imprimir cuando esté disponible.',
      'Libro impreso según destino y disponibilidad.',
    ],
    faq: [
      [
        '¿Necesito saber escribir?',
        'No. Empieza con un recuerdo, un mensaje o varios episodios; el recorrido guiado ayuda a convertirlos en un libro.',
      ],
      [
        '¿Puedo editar el libro?',
        'Sí. Revisa y ajusta nombres, fechas, texto, tono e imágenes antes de regalar.',
      ],
      [
        '¿Puedo incluir fotos?',
        'Sí, cuando la opción esté disponible y tengas permiso para usar imágenes de personas identificables.',
      ],
      [
        '¿Nuestra historia se mantiene privada?',
        'Se mantiene privada por defecto y no se publica automáticamente.',
      ],
      [
        '¿Podemos crearla en otro idioma?',
        'Sí. Elige uno de los idiomas compatibles con Mythoria y revisa el resultado localizado.',
      ],
    ],
    safetyTitle: 'Proteged los detalles que os pertenecen',
    safetyBody:
      'Evitad direcciones, contactos, información íntima y datos de terceros sin permiso. Revisadlo todo antes de compartir.',
    finalTitle: 'El siguiente capítulo puede empezar con los recuerdos que ya compartís.',
    finalBody:
      'Elegid un momento y añadid los detalles que solo vosotros reconocéis. Mythoria os ayudará a convertirlos en un libro para regalar y releer.',
    about: ['Libros personalizados para parejas', 'Regalos románticos', 'Recuerdos de pareja'],
    serviceName: 'Libro personalizado para parejas Mythoria',
    serviceType: 'Libro personalizado digital, audio, PDF e impreso',
  },
  'fr-FR': {
    title: 'Livre personnalisé pour couples',
    metaTitle: 'Livre personnalisé pour couples | Votre histoire — Mythoria',
    metaDescription:
      'Transformez rencontres, messages, voyages et rituels du quotidien en un livre personnalisé pour la personne qui les a vécus avec vous.',
    breadcrumb: 'Livre personnalisé pour couples',
    primaryCta: 'Commencer notre histoire',
    secondaryCta: 'Voir les livres d’exemple',
    cardDescription:
      'Un cadeau romantique créé avec les moments et détails que seul le couple connaît.',
    eyebrow: 'Un cadeau qui ne pouvait être que le vôtre',
    headline: 'Votre histoire mérite un livre.',
    subheadline:
      'De la première rencontre aux rituels du quotidien, transformez vos souvenirs en une histoire unique à relire avant de l’offrir.',
    imageAlt: 'Un couple adulte lit ensemble un livre romantique personnalisé',
    quickTitle: 'Qu’est-ce qu’un livre personnalisé pour un couple ?',
    quickBody:
      'C’est une histoire créée à partir des moments de votre relation — noms, lieux, messages, premières fois, voyages et petites habitudes — puis organisée dans un livre que vous pouvez relire avant de l’offrir. Seuls les détails que vous choisissez sont inclus. Vous pouvez sélectionner le ton, découvrir des exemples de livres et ajuster le résultat avant de le partager.',
    introTitle: 'Certains cadeaux comptent par les souvenirs qu’ils réveillent',
    introBody: [
      'Un bel objet peut malgré tout dire peu de choses. Une histoire garde le contexte : le message presque jamais envoyé, la table où vous avez parlé pendant des heures ou le voyage raté devenu parfait.',
      'Mythoria aide à réunir ces fragments dans un début, un développement et un avenir, sans exiger de savoir écrire.',
    ],
    fitTitle: 'Fait de détails, pas de formules',
    fitBody: [
      'Racontez un début improbable, une relation à distance, des années partagées ou une surprise dont la véritable fin se joue hors du livre.',
      'Ajustez les mots, les images et le ton, puis vérifiez les noms, dates et informations concernant des tiers.',
    ],
    benefitsTitle: 'Une histoire personnelle que vous pouvez relire',
    benefits: [
      'Créée à partir des souvenirs choisis.',
      'Respecte le ton propre au couple.',
      'Modifiable avant de l’offrir.',
      'Privée par défaut.',
    ],
    booksTitle: 'Cinq façons de raconter une histoire à deux',
    booksIntro: 'Ouvrez un chapitre, regardez l’illustration et écoutez chaque extrait localisé.',
    processTitle: 'Commencez avec cinq détails simples',
    process: [
      'Choisissez les personnes et l’occasion.',
      'Ajoutez les moments qui structurent l’histoire.',
      'Incluez lieux, phrases et rituels importants.',
      'Sélectionnez le style narratif et visuel.',
      'Vérifiez chaque nom, mot et image avant de partager.',
    ],
    formatsTitle: 'Les façons de profiter du livre',
    formats: [
      'Lecture numérique privée.',
      'Audio localisé lorsqu’il est disponible.',
      'PDF à imprimer lorsqu’il est disponible.',
      'Livre imprimé selon la destination et la disponibilité.',
    ],
    faq: [
      [
        'Faut-il savoir écrire ?',
        'Non. Commencez avec un souvenir, un message ou quelques épisodes ; le parcours guidé aide à les transformer en livre.',
      ],
      [
        'Puis-je modifier le livre ?',
        'Oui. Vérifiez et ajustez noms, dates, texte, ton et images avant de l’offrir.',
      ],
      [
        'Puis-je inclure des photos ?',
        'Oui, lorsque l’option est disponible et que vous avez l’autorisation d’utiliser les images des personnes identifiables.',
      ],
      [
        'Notre histoire reste-t-elle privée ?',
        'Elle reste privée par défaut et n’est pas publiée automatiquement.',
      ],
      [
        'Peut-on la créer dans une autre langue ?',
        'Oui. Choisissez une langue prise en charge par Mythoria et relisez le résultat localisé.',
      ],
    ],
    safetyTitle: 'Protégez les détails qui vous appartiennent',
    safetyBody:
      'Évitez adresses, coordonnées, informations intimes et données concernant des tiers sans autorisation. Relisez tout avant de partager.',
    finalTitle: 'Le prochain chapitre peut commencer avec les souvenirs que vous partagez déjà.',
    finalBody:
      'Choisissez un moment et ajoutez les détails que vous seuls reconnaissez. Mythoria vous aidera à en faire un livre à offrir et à relire.',
    about: ['Livres personnalisés pour couples', 'Cadeaux romantiques', 'Souvenirs de couple'],
    serviceName: 'Livre personnalisé pour couples Mythoria',
    serviceType: 'Livre personnalisé numérique, audio, PDF et imprimé',
  },
} as const;

function createRomanceLandingPage(locale: LocalizedLandingLocale): LandingPageContent {
  const c = copy[locale];
  const slug = slugs[locale];
  const assetBase = getLocalizedAssetBase(sourceLandingSlug, locale);
  return {
    translationKey: 'romance-gifts',
    slug,
    locale,
    title: c.title,
    metaTitle: c.metaTitle,
    metaDescription: c.metaDescription,
    primaryIntent: 'romance',
    riskRating: 'green',
    updatedAt: '2026-08-04',
    indexable: true,
    showFormatsNearHero: false,
    breadcrumbLabel: c.breadcrumb,
    ogImageSrc: `${assetBase}/hero/og-cover.jpeg`,
    primaryCta: c.primaryCta,
    primaryCtaHref: `/${locale}/tell-your-story/step-1?landingSlug=${slug}&primaryIntent=romance`,
    secondaryCta: c.secondaryCta,
    secondaryCtaHref: '#exemplos',
    homepageCard: { title: c.title, description: c.cardDescription },
    analytics: { pageViewEvent: 'landing_page_view', variant: `romance-${locale}` },
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
      translationKey: 'romance-gifts',
      sourceLandingSlug,
      locale,
      books: books[locale],
    }),
    process: { title: c.processTitle, steps: [...c.process] },
    formats: { title: c.formatsTitle, items: [...c.formats] },
    faq: c.faq.map(([question, answer]) => ({ question, answer })),
    safetyNote: { title: c.safetyTitle, body: c.safetyBody },
    finalCta: { title: c.finalTitle, body: c.finalBody },
    trustBadges:
      locale === 'en-US'
        ? ['Private by default', 'Review before giving']
        : locale === 'es-ES'
          ? ['Privado por defecto', 'Revisa antes de regalar']
          : ['Privé par défaut', 'À relire avant d’offrir'],
    structuredData: {
      about: [...c.about],
      serviceName: c.serviceName,
      serviceType: c.serviceType,
      areaServed: getAreaServed(locale),
    },
  };
}

export const romanceLocalizedLandingPages = (['en-US', 'es-ES', 'fr-FR'] as const).map(
  createRomanceLandingPage,
);
