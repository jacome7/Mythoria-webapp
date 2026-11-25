import { christmasBookSamples } from './christmas-book-samples';
import type { LandingPageContent } from './types';

const portuguese: LandingPageContent = {
  translationKey: 'christmas-gifts',
  locale: 'pt-PT',
  pricingExample: {
    description:
      'Numa conta nova, os 5 créditos de boas-vindas pagam a primeira história digital. Se quiser oferecê-la em papel, este é o exemplo de um livro de capa mole com quatro capítulos, entregue em Portugal.',
    lines: [
      { label: 'Criar a história digital · 5 créditos de boas-vindas', amount: '0 €' },
      { label: 'Imprimir um exemplar · 22 créditos', amount: '≈ 18,33 €' },
      { label: 'Entrega em casa · 5 créditos', amount: '≈ 4,17 €' },
      { label: 'Impressão e entrega · 27 créditos', amount: '≈ 22,50 €' },
    ],
    checkout:
      'Quanto paga? 25 € pelo pack de 30 créditos. Usa 27 na encomenda e fica com 3 para outra ocasião.',
    note: 'Exemplo de 24 de novembro de 2026. Os equivalentes em euros usam o preço deste pack. A partir do quinto capítulo, a impressão custa mais 1 crédito por capítulo e por exemplar. O exemplo é para a edição normal de capa mole. Confirme o total e a morada antes de encomendar.',
  },
  slug: 'prendas-de-natal-para-criancas',
  title: 'Prendas de Natal para crianças: uma história personalizada',
  metaTitle: 'Prendas de Natal para Crianças | Histórias Personalizadas | Mythoria',
  metaDescription:
    'Uma prenda para a criança que já tem tantos brinquedos. Leia um álbum ilustrado inteiro, explore quatro histórias dos 3 aos 12 anos e crie a sua.',
  primaryIntent: 'kids_adventures',
  riskRating: 'yellow',
  updatedAt: '2026-11-24',
  ogImageSrc: '/seasonal-books/ines/pt-PT/share.jpg',
  indexable: true,
  showFormatsNearHero: false,
  examplesFirst: true,
  primaryCta: 'Criar uma história',
  secondaryCta: 'Explorar os livros',
  homepageCard: {
    title: 'Prendas de Natal para crianças',
    description: 'Uma história personalizada para oferecer e ler em família.',
  },
  analytics: { pageViewEvent: 'landing_page_view', variant: 'christmas-pt-PT' },
  templateIcons: {
    heroEyebrow: { src: '/Papercut_icons/christmas-paper-boat.webp', alt: '' },
    quickAnswer: { src: '/Papercut_icons/christmas-lantern.webp', alt: '' },
    sampleChapter: { src: '/Papercut_icons/fa-book-open-papercut.webp', alt: '' },
  },
  hero: {
    eyebrow: 'Uma prenda com imaginação',
    heading: 'O que oferecer no Natal a uma criança que já tem tantos brinquedos?',
    headline:
      'Um livro em que a criança reconhece o seu mundo, desde a pedra que virou no passeio até à peça de teatro que inventou na sala.',
    subheadline:
      'Escolha um nome e uma aventura. Depois, abram o livro e leiam a primeira página juntos.',
    imageSrc: '/seasonal-books/ines/pt-PT/spread.webp',
    imageAlt:
      'A Inês segura o seu barco de papel vermelho junto ao ribeiro seco, entre pedras e areia.',
    samplePdf: {
      href: '/seasonal-books/ines/pt-PT/leitura.pdf',
      label: 'Ler o livro da Inês',
      description:
        'O barco que tinha sede · Álbum ilustrado premium da Mythoria, para ler na íntegra dos 3 aos 6 anos.',
    },
  },
  quickAnswer: {
    title: 'Que prenda de Natal personalizada posso oferecer a uma criança?',
    body: 'Ofereça-lhe uma história que só podia acontecer com ela. Se o seu afilhado faz cabanas debaixo da mesa, imagine o que poderia descobrir atrás da última almofada. Na Mythoria, pode escolher esse ponto de partida, o nome da personagem e o estilo das ilustrações.',
  },
  intro: {
    title: 'Uma prenda que começa com o que ela adora.',
    body: [
      'Na Consoada, uma lanterna desaparecida pode pôr os primos todos à procura. E se a criança passa o ano a desenhar pássaros, a melhor história para desembrulhar em dezembro talvez comece num jardim em abril.',
      'Escolha uma coisa que ela já adora e outra que gostava de experimentar. O encontro entre as duas dá à história um rumo só dela.',
    ],
  },
  whyThisFits: {
    title: 'Deixe a criança virar a página.',
    body: [
      'Quando a Inês ouve um «plim», faça uma pausa. Onde se terá escondido a água? Deixe a criança apontar uma pista na ilustração antes de continuarem.',
      'Com leitores mais crescidos, troquem de papéis. Um lê a voz da repórter, o outro escolhe que pergunta faria à testemunha. Voltar à página anterior faz parte do mistério.',
    ],
  },
  useCases: {
    title: 'Ideias para a sua história de Natal',
    items: [
      {
        title: 'Uma aventura junto à árvore',
        body: 'Um pequeno mistério transforma a noite de Natal numa descoberta em família.',
        iconSrc: '/Papercut_icons/christmas-lantern.webp',
        iconAlt: '',
      },
      {
        title: 'Uma viagem para partilhar',
        body: 'A criança e as suas personagens favoritas encontram uma forma de ajudar alguém.',
        iconSrc: '/Papercut_icons/christmas-paper-boat.webp',
        iconAlt: '',
      },
      {
        title: 'Uma memória de família',
        iconSrc: '/Papercut_icons/fa-gift-papercut.webp',
        iconAlt: '',
        body: 'Uma receita, um lugar ou uma tradição inspiram uma história para guardar.',
      },
    ],
  },
  carefulBenefits: {
    title: 'Uma história com espaço para imaginar',
    items: [
      'Escolha uma idade e um tom adequados.',
      'Inclua interesses, personagens e detalhes queridos.',
      'Escolha uma direção visual.',
      'Reveja texto e imagens antes de partilhar.',
      'Consulte os formatos e custos disponíveis.',
    ],
  },
  booksSection: {
    eyebrow: 'Livros de exemplo',
    title: 'Cinco histórias para acender a imaginação',
    intro:
      'Dos 3 aos 6 anos, leiam ao colo o livro da Inês ou contem os dedos da luva da Rita. Dos 6 aos 9, entrem nos bastidores do teatro ou investiguem um telhado com fuga. Dos 9 aos 12, a redação de um jornal espera por quem saiba fazer boas perguntas.',
  },
  books: christmasBookSamples('pt-PT'),
  process: {
    title: 'Como criar a sua história',
    steps: [
      'Comece com um gosto, uma memória ou uma pergunta da criança.',
      'Escolha as personagens, a idade e o estilo.',
      'Crie a história e reveja o texto e as imagens.',
      'Escolha como ler ou partilhar, entre os formatos disponíveis.',
    ],
  },
  formats: {
    title: 'Escolha como viver a história',
    items: [
      'Leitura digital privada.',
      'Áudio quando disponível.',
      'PDF para impressão quando disponível.',
      'Livro físico sujeito à disponibilidade, preço e destino.',
    ],
  },
  faq: [
    {
      question: 'Posso personalizar uma história de Natal para uma criança?',
      answer:
        'Sim. Pode escolher o nome da personagem, a idade, os interesses e outros detalhes que queira incluir.',
    },
    {
      question: 'Para que idades são estes exemplos?',
      answer:
        'Dos 3 aos 6 anos, os álbuns convidam a ouvir e a procurar pistas na imagem. Dos 6 aos 9, há aventuras para ler a meias. Dos 9 aos 12, há um mistério com testemunhos para comparar.',
    },
    {
      question: 'E se a criança preferir videojogos ou jogos de tabuleiro?',
      answer:
        'Parta daquilo que a entusiasma no jogo. Se adora descobrir passagens secretas, inventem uma debaixo da bancada da cozinha. Se gosta de jogar em equipa, dê-lhe dois amigos e um problema que só consigam resolver juntos. Na primeira leitura, deixe-a procurar a pista antes da personagem.',
    },
    {
      question: 'Posso oferecer o livro impresso?',
      answer:
        'Sim, quando disponível para a morada. No exemplo acima, um livro de capa mole com quatro capítulos e entrega em Portugal custa 27 créditos: compra um pack de 30 por 25 € e ficam 3 créditos. Confirme o total antes de encomendar.',
    },
    {
      question: 'Posso ler um livro inteiro antes de começar?',
      answer:
        'Sim. Pode abrir gratuitamente O barco que tinha sede, da primeira página à última. As outras quatro histórias incluem a abertura ilustrada para experimentar o tom e a leitura.',
    },
  ],
  safetyNote: {
    title: 'Uma história preparada por um adulto',
    body: 'Use apenas fotografias, desenhos ou dados que tem autorização para utilizar e reveja o resultado antes de o partilhar.',
  },
  finalCta: {
    title: 'Que aventura vai nascer neste Natal?',
    body: 'Comece com uma ideia e crie uma história para oferecer.',
  },
  structuredData: {
    about: ['Prendas de Natal para crianças', 'Histórias personalizadas'],
    serviceName: 'Mythoria',
    serviceType: 'Criação de histórias personalizadas',
    areaServed: 'Portugal',
  },
};

const spanish: LandingPageContent = {
  translationKey: 'christmas-gifts',
  locale: 'es-ES',
  pricingExample: {
    description:
      'Al abrir una cuenta, los 5 créditos de bienvenida cubren tu primer cuento digital. Si quieres regalarlo en papel, este es el ejemplo de un libro de tapa blanda de cuatro capítulos, con entrega en España.',
    lines: [
      { label: 'Crear el cuento digital · 5 créditos de bienvenida', amount: '0 €' },
      { label: 'Imprimir un ejemplar · 22 créditos', amount: '≈ 18,33 €' },
      { label: 'Envío a domicilio · 5 créditos', amount: '≈ 4,17 €' },
      { label: 'Impresión y envío · 27 créditos', amount: '≈ 22,50 €' },
    ],
    checkout:
      '¿Cuánto pagas? 25 € por el pack de 30 créditos. Usas 27 en el pedido y te quedan 3 para otra ocasión.',
    note: 'Ejemplo del 24 de noviembre de 2026. Los importes aproximados en euros se calculan al precio de este pack. A partir del quinto capítulo, la impresión cuesta 1 crédito más por capítulo y ejemplar. El ejemplo corresponde a la edición estándar de tapa blanda. Comprueba el total y la dirección antes de hacer el pedido.',
  },
  slug: 'regalos-de-navidad-y-reyes-para-ninos',
  title: 'Regalos de Navidad y Reyes para niños: un cuento personalizado',
  metaTitle: 'Regalos de Navidad y Reyes para Niños | Mythoria',
  metaDescription:
    'Un regalo para niños que ya tienen de todo. Lee un álbum ilustrado completo, descubre cuatro historias de 3 a 12 años y crea tu propio cuento.',
  primaryIntent: 'kids_adventures',
  riskRating: 'yellow',
  updatedAt: '2026-11-24',
  ogImageSrc: '/seasonal-books/ines/es-ES/share.jpg',
  indexable: true,
  showFormatsNearHero: false,
  examplesFirst: true,
  primaryCta: 'Crear un cuento',
  secondaryCta: 'Explorar los libros',
  homepageCard: {
    title: 'Regalos de Navidad y Reyes para niños',
    description: 'Un cuento personalizado para regalar y leer en familia.',
  },
  analytics: { pageViewEvent: 'landing_page_view', variant: 'christmas-es-ES' },
  templateIcons: {
    heroEyebrow: { src: '/Papercut_icons/christmas-paper-boat.webp', alt: '' },
    quickAnswer: { src: '/Papercut_icons/christmas-lantern.webp', alt: '' },
    sampleChapter: { src: '/Papercut_icons/fa-book-open-papercut.webp', alt: '' },
  },
  hero: {
    eyebrow: 'Un regalo lleno de imaginación',
    heading: '¿Qué regalar por Navidad o Reyes a un niño que ya tiene de todo?',
    headline:
      'Un libro en el que reconozca su mundo, desde la piedra que levantó en el parque hasta la obra de teatro que montó en el salón.',
    subheadline:
      'Elige un nombre y una aventura. Luego, abrid el libro y leed juntos la primera página.',
    imageSrc: '/seasonal-books/ines/es-ES/spread.webp',
    imageAlt: 'Inés sostiene su barco rojo de papel junto al arroyo seco, entre piedras y arena.',
    samplePdf: {
      href: '/seasonal-books/ines/es-ES/leitura.pdf',
      label: 'Leer el cuento de Inés',
      description:
        'El barco que tenía sed · Álbum ilustrado prémium de Mythoria, para leer entero con niños de 3 a 6 años.',
    },
  },
  quickAnswer: {
    title: '¿Qué regalo personalizado puedo hacer a un niño en Navidad o Reyes?',
    body: 'Regálale una historia que solo podría pasarle a él. Si tu sobrina monta cabañas debajo de la mesa, imagina qué podría encontrar detrás del último cojín. En Mythoria puedes elegir ese punto de partida, el nombre del personaje y el estilo de las ilustraciones.',
  },
  intro: {
    title: 'Un regalo que empieza con lo que le gusta.',
    body: [
      'Una linterna que se pierde al volver de la cabalgata puede poner a toda la familia a buscar. Y si se pasa el año dibujando pájaros, el cuento que encuentre junto a sus zapatos la mañana de Reyes bien podría empezar en un jardín en abril.',
      'Piensa en algo que ya le encanta y en algo que le gustaría probar. Júntalos y ya tienes el principio de una aventura muy suya.',
    ],
  },
  whyThisFits: {
    title: 'Deja que pase la página.',
    body: [
      'Cuando Inés oiga un «plin», haced una pausa. ¿Dónde se habrá metido el agua? Buscad una pista en el dibujo antes de seguir.',
      'Con los mayores, repartíos los papeles. Uno lee lo que dice la reportera y el otro elige qué preguntaría al testigo. En este misterio merece la pena volver una página atrás.',
    ],
  },
  useCases: {
    title: 'Ideas para tu cuento de Navidad y Reyes',
    items: [
      {
        title: 'Una aventura junto al árbol',
        body: 'Un pequeño misterio convierte la noche en un descubrimiento familiar.',
        iconSrc: '/Papercut_icons/christmas-lantern.webp',
        iconAlt: '',
      },
      {
        title: 'Un viaje para compartir',
        body: 'El niño y sus personajes favoritos encuentran una manera de ayudar a alguien.',
        iconSrc: '/Papercut_icons/christmas-paper-boat.webp',
        iconAlt: '',
      },
      {
        title: 'Un recuerdo familiar',
        iconSrc: '/Papercut_icons/fa-gift-papercut.webp',
        iconAlt: '',
        body: 'Una receta, un lugar o una tradición inspiran una historia para conservar.',
      },
    ],
  },
  carefulBenefits: {
    title: 'Un cuento con espacio para imaginar',
    items: [
      'Elige una edad y un tono adecuados.',
      'Incluye intereses, personajes y detalles queridos.',
      'Escoge una dirección visual.',
      'Revisa texto e imágenes antes de compartir.',
      'Consulta los formatos y costes disponibles.',
    ],
  },
  booksSection: {
    eyebrow: 'Libros de ejemplo',
    title: 'Cinco cuentos para encender la imaginación',
    intro:
      'De 3 a 6 años, leed juntos el cuento de Inés o contad los dedos del guante de Rita. De 6 a 9, asomaos entre bastidores o investigad la gotera de un tejado. De 9 a 12, la redacción de un periódico espera a quien sepa hacer buenas preguntas.',
  },
  books: christmasBookSamples('es-ES'),
  process: {
    title: 'Cómo crear tu cuento',
    steps: [
      'Empieza con una afición, un recuerdo o una pregunta que se haga el niño.',
      'Elige los personajes, la edad y el estilo.',
      'Crea el cuento y revisa el texto y las imágenes.',
      'Elige cómo leerlo o compartirlo entre los formatos disponibles.',
    ],
  },
  formats: {
    title: 'Elige cómo vivir el cuento',
    items: [
      'Lectura digital privada.',
      'Audio cuando esté disponible.',
      'PDF para imprimir cuando esté disponible.',
      'Libro físico sujeto a disponibilidad, precio y destino.',
    ],
  },
  faq: [
    {
      question: '¿Puedo personalizar un cuento de Navidad o Reyes para un niño?',
      answer:
        'Sí. Puedes elegir el nombre del personaje, la edad, sus intereses y otros detalles que quieras incluir.',
    },
    {
      question: '¿Para qué edades son estos ejemplos?',
      answer:
        'Entre los 3 y los 6 años, los álbumes invitan a escuchar y buscar pistas en los dibujos. De 6 a 9, hay aventuras para leer a medias. De 9 a 12, hay un misterio con versiones distintas de una misma noticia.',
    },
    {
      question: '¿Y si le gustan más los videojuegos o los juegos de mesa?',
      answer:
        'Fíjate en qué le engancha del juego. Si le encanta encontrar pasadizos secretos, podéis inventar uno detrás de la despensa. Si lo suyo es jugar en equipo, dale dos compañeros y un problema que solo puedan resolver juntos. Cuando leáis el cuento, deja que descubra la pista antes que el protagonista.',
    },
    {
      question: '¿Puedo regalar el libro impreso?',
      answer:
        'Sí, cuando esté disponible para la dirección de entrega. En el ejemplo anterior, un libro de tapa blanda de cuatro capítulos con envío a España cuesta 27 créditos: compras un pack de 30 por 25 € y te quedan 3 créditos. Comprueba el total antes de hacer el pedido.',
    },
    {
      question: '¿Puedo leer un libro entero antes de empezar?',
      answer:
        'Sí. Puedes abrir gratis El barco que tenía sed y leerlo de principio a fin. Los otros cuatro cuentos incluyen un comienzo ilustrado para probar distintas historias y estilos.',
    },
  ],
  safetyNote: {
    title: 'Un cuento preparado por un adulto',
    body: 'Utiliza solo fotos, dibujos o datos para los que tengas autorización y revisa el resultado antes de compartirlo.',
  },
  finalCta: {
    title: '¿Qué aventura nacerá estas fiestas?',
    body: 'Empieza con una idea y crea un cuento para regalar.',
  },
  structuredData: {
    about: ['Regalos de Navidad y Reyes para niños', 'Cuentos personalizados'],
    serviceName: 'Mythoria',
    serviceType: 'Creación de cuentos personalizados',
    areaServed: 'España',
  },
};

export const christmasLandingPages = [portuguese, spanish];
