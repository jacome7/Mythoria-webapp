import type { LandingPageContent } from './types';

const slug = 'livro-personalizado-para-casais';
const iconBase = '/Papercut_icons';
const assetBase = `/landing-pages/${slug}/assets`;
const sampleBookBase = `${assetBase}/books`;

export const romanceGiftsLandingPage: LandingPageContent = {
  slug,
  locale: 'pt-PT',
  title: 'Livro personalizado para casais',
  metaTitle: 'Livro Personalizado para Casais | A Vossa História — Mythoria',
  metaDescription:
    'Transforme encontros, mensagens, viagens e memórias num livro personalizado para oferecer a quem viveu esta história consigo.',
  primaryIntent: 'romance',
  riskRating: 'green',
  updatedAt: '2026-07-19',
  indexable: true,
  showFormatsNearHero: false,
  breadcrumbLabel: 'Livro personalizado para casais',
  ogImageSrc: `${assetBase}/hero/romance-og.jpeg`,
  primaryCta: 'Começar a nossa história',
  primaryCtaHref: `/pt-PT/tell-your-story/step-1?landingSlug=${slug}&primaryIntent=romance`,
  secondaryCta: 'Ver livros de exemplo',
  secondaryCtaHref: '#exemplos',
  analytics: {
    pageViewEvent: 'landing_page_view',
    variant: 'romance-v1',
  },
  trustBadges: ['Privado por defeito', 'Reveja antes de oferecer'],
  templateIcons: {
    heroEyebrow: { src: `${iconBase}/sparkles.webp`, alt: '' },
    ctaArrow: { src: `${iconBase}/fa-chevron-right-papercut.webp`, alt: '' },
    quickAnswer: { src: `${iconBase}/fa-heart-papercut.webp`, alt: '' },
    audioSample: { src: `${iconBase}/fa-microphone-papercut.webp`, alt: '' },
    sampleChapter: { src: `${iconBase}/openBook.webp`, alt: '' },
    safetyNote: { src: `${iconBase}/fa-lock-romance-papercut.webp`, alt: '' },
    formats: [
      { src: `${iconBase}/openBook.webp`, alt: '' },
      { src: `${iconBase}/fa-microphone-papercut.webp`, alt: '' },
      { src: `${iconBase}/fa-file-upload-papercut.webp`, alt: '' },
      { src: `${iconBase}/fa-book-open-papercut.webp`, alt: '' },
    ],
  },
  booksSection: {
    eyebrow: 'Histórias para descobrir',
    title: 'Cinco maneiras de contar uma história a dois',
    intro: 'Abra um capítulo, veja a ilustração e ouça um excerto de cada história.',
  },
  hero: {
    eyebrow: 'Uma prenda que só podia ser vossa',
    headline: 'A vossa história merece um livro.',
    subheadline:
      'Do primeiro encontro aos pequenos rituais de todos os dias, transforme as memórias da relação numa história única — sempre com revisão antes de oferecer.',
    imageSrc: `${assetBase}/hero/romance-hero.jpeg`,
    imageAlt:
      'Casal adulto a ler em conjunto o livro personalizado “Inês & Diogo — Um Amor Inesperado” numa sala em Lisboa',
  },
  quickAnswer: {
    title: 'O que é um livro personalizado para um casal?',
    body: 'É uma história criada a partir de momentos da relação — nomes, lugares, mensagens, primeiras vezes, viagens e pequenos hábitos — organizada num livro que pode rever antes de oferecer. Só entram os detalhes que decidir contar. Pode escolher o tom, acompanhar exemplos de histórias e ajustar o resultado antes de o partilhar.',
  },
  intro: {
    title: 'Há coisas que valem pelo que fazem recordar',
    body: [
      'Um objeto pode ser bonito e, ainda assim, dizer pouco. Uma história guarda o contexto: a mensagem que quase não foi enviada, a mesa onde ficaram horas a conversar ou a viagem que correu mal e acabou por ser perfeita.',
      'A Mythoria ajuda a juntar esses fragmentos num livro com princípio, desenvolvimento e futuro. Não precisa de saber escrever; precisa apenas de reconhecer os momentos que tornaram a vossa história vossa.',
    ],
  },
  whyThisFits: {
    title: 'Uma prenda feita de detalhes, não de fórmulas',
    body: [
      'Pode contar um início improvável, uma relação à distância, anos de vida partilhada ou uma surpresa cujo verdadeiro final acontece fora do livro.',
      'O texto, as imagens e o tom podem ser ajustados. Antes de partilhar, confirme sempre nomes, datas, fotografias e qualquer detalhe de terceiros.',
    ],
  },
  useCases: {
    title: 'Que capítulo querem celebrar?',
    intro: 'Escolha uma ocasião ou use apenas uma memória que ainda vos faça sorrir.',
    items: [
      {
        title: 'Como nos conhecemos',
        body: 'O acaso, a primeira conversa e os detalhes que só ganharam significado mais tarde.',
        iconSrc: `${iconBase}/fa-heart-papercut.webp`,
        iconAlt: 'Ícone papercut de coração',
      },
      {
        title: 'O nosso primeiro beijo',
        body: 'Uma memória cúmplice, divertida ou imperfeita contada sem a transformar num cliché.',
        iconSrc: `${iconBase}/gi-drama-masks-papercut.webp`,
        iconAlt: 'Ícone papercut de máscaras narrativas',
      },
      {
        title: 'Amor à distância',
        body: 'Mensagens, viagens, fusos horários e os rituais que ajudaram a aproximar duas casas.',
        iconSrc: `${iconBase}/fa-globe-americas-papercut.webp`,
        iconAlt: 'Ícone papercut de globo',
      },
      {
        title: 'Aniversário da relação',
        body: 'Uma data importante contada através dos momentos que aconteceram entre um ano e o seguinte.',
        iconSrc: `${iconBase}/fa-calendar-alt-romance-papercut.webp`,
        iconAlt: 'Ícone papercut de calendário',
      },
      {
        title: 'Uma vida partilhada',
        body: 'Casas, rotinas, decisões e pequenos objetos que aprenderam a contar a história por vocês.',
        iconSrc: `${iconBase}/fa-users-papercut.webp`,
        iconAlt: 'Ícone papercut de vida partilhada',
      },
      {
        title: 'Uma surpresa discreta',
        body: 'Uma narrativa que conduz ao próximo capítulo sem revelar publicamente a pergunta ou a resposta.',
        iconSrc: `${iconBase}/fa-gift-papercut.webp`,
        iconAlt: 'Ícone papercut de presente',
      },
    ],
  },
  personalization: {
    title: 'Comece com cinco detalhes simples',
    intro:
      'Não precisa de escrever a história inteira. Escolha os elementos essenciais e acrescente contexto à medida que a narrativa ganha forma.',
    ctaLabel: 'Começar com as nossas memórias',
    groups: [
      {
        title: 'Quem entra',
        body: 'Nomes, pronomes e pessoas secundárias que autorizou incluir.',
        choices: ['O casal', 'Amigos', 'Família', 'Animais'],
        iconSrc: `${iconBase}/fa-users-papercut.webp`,
        iconAlt: 'Ícone papercut de pessoas',
      },
      {
        title: 'O momento',
        body: 'Escolha o acontecimento ou período que segura o fio da história.',
        choices: ['Primeiro encontro', 'Viagem', 'Mudança', 'Aniversário'],
        iconSrc: `${iconBase}/fa-calendar-alt-romance-papercut.webp`,
        iconAlt: 'Ícone papercut de calendário',
      },
      {
        title: 'Só vocês sabem',
        body: 'Junte frases, comidas, lugares e rituais sem expor dados desnecessários.',
        choices: ['Frase', 'Lugar', 'Comida', 'Ritual'],
        iconSrc: `${iconBase}/fa-lock-romance-papercut.webp`,
        iconAlt: 'Ícone papercut de cadeado',
      },
      {
        title: 'Tom e género',
        body: 'Dê à narrativa a voz que melhor combina convosco.',
        choices: ['Terno', 'Divertido', 'Cinematográfico', 'Cartas'],
        iconSrc: `${iconBase}/fa-magic-papercut.webp`,
        iconAlt: 'Ícone papercut de magia',
      },
      {
        title: 'Imagem e formato',
        body: 'Escolha o estilo visual e confirme no produto os formatos disponíveis.',
        choices: ['Aguarela', 'Minimalista', 'Digital', 'Óleo'],
        iconSrc: `${iconBase}/Color_pallete.webp`,
        iconAlt: 'Ícone papercut de paleta de cores',
      },
    ],
  },
  carefulBenefits: {
    title: 'Uma história pessoal, com espaço para rever',
    items: [
      {
        title: 'Parte das vossas memórias',
        body: 'A narrativa nasce dos detalhes que escolhe fornecer.',
        iconSrc: `${iconBase}/fa-heart-papercut.webp`,
        iconAlt: 'Ícone papercut de coração',
      },
      {
        title: 'Mantém o tom do casal',
        body: 'Pode pedir ternura, humor, realismo ou um registo mais cinematográfico.',
        iconSrc: `${iconBase}/gi-drama-masks-papercut.webp`,
        iconAlt: 'Ícone papercut de máscaras',
      },
      {
        title: 'Permite ajustar antes de oferecer',
        body: 'Reveja nomes, detalhes, texto e imagens antes de partilhar.',
        iconSrc: `${iconBase}/fa-pencil-alt-papercut.webp`,
        iconAlt: 'Ícone papercut de lápis',
      },
      {
        title: 'Inclui leitura e som',
        body: 'O livro pode combinar texto, ilustração e áudio quando disponíveis.',
        iconSrc: `${iconBase}/fa-microphone-papercut.webp`,
        iconAlt: 'Ícone papercut de microfone',
      },
      {
        title: 'Continua privado por defeito',
        body: 'Partilhar ou publicar exige uma ação posterior e explícita.',
        iconSrc: `${iconBase}/fa-lock-romance-papercut.webp`,
        iconAlt: 'Ícone papercut de cadeado',
      },
    ],
  },
  books: [
    {
      id: 'romance-book-01',
      slug: 'ines-e-diogo-um-amor-inesperado',
      title: 'Inês & Diogo — Um Amor Inesperado',
      synopsis:
        'Uma chuvada em Lisboa obriga Inês e Diogo a partilhar o único lugar seco de uma esplanada. O atraso transforma-se no primeiro capítulo de uma vida comum.',
      excerpt:
        'A chuva começou três minutos antes de Inês decidir que aquele seria um dia perfeitamente normal.',
      imageSrc: `${sampleBookBase}/ines-e-diogo-um-amor-inesperado/feature.jpeg`,
      imageAlt:
        'Livro físico “Inês & Diogo — Um Amor Inesperado” numa mesa de café em Lisboa depois da chuva',
      styleLabel: 'Aguarela',
      contextLabel: 'Primeiro encontro',
      ageLabel: 'Adultos',
      chapterCountLabel: 'Capítulo de amostra',
      durationLabel: 'Áudio 33 s',
      audioSampleSrc: `${sampleBookBase}/ines-e-diogo-um-amor-inesperado/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'Três Minutos de Chuva',
        imageSrc: `${sampleBookBase}/ines-e-diogo-um-amor-inesperado/chapter-01.jpeg`,
        imageAlt: 'Inês e Diogo abrigados da chuva numa esplanada de Lisboa',
        paragraphs: [
          'A chuva começou três minutos antes de Inês decidir que aquele seria um dia perfeitamente normal. Até então, Lisboa parecia colaborar: o elétrico chegara com apenas um minuto de atraso, o café não tinha entornado e o livro debaixo do braço ainda conservava os cantos direitos.',
          'Inês correu para a primeira esplanada que encontrou. O toldo cobria pouco mais do que uma mesa e duas cadeiras, e uma delas já estava ocupada por um homem que tentava salvar um saco de papel. “Cabe mais uma pessoa. O café é que talvez não sobreviva.”',
          'Ela sentou-se sem tempo para agradecer. O homem segurava o saco contra o peito com uma seriedade desproporcionada. “É alguma coisa frágil?”, perguntou Inês. “Pastéis de nata. Portanto, sim.”',
          'Falaram do livro. Depois de outros livros. Depois das livrarias onde cada um entrava sem precisar de comprar nada. Inês contou que lia a última frase antes de começar uma história; Diogo classificou isso como vandalismo narrativo.',
          'A chuva diminuiu, mas nenhum dos dois se levantou. Pediram dois cafés e partilharam o único pastel que desertara do escritório dentro do saco de papel.',
          'Anos depois, continuariam a discordar sobre quem tinha inventado a desculpa do livro. Concordavam apenas nisto: se a chuva tivesse começado três minutos mais tarde, talvez tivessem chegado a horas — e perdido o dia que passou a organizar todos os outros.',
        ],
      },
    },
    {
      id: 'romance-book-02',
      slug: 'o-nosso-primeiro-beijo-foi-so-o-principio',
      title: 'O Nosso Primeiro Beijo Foi Só o Princípio',
      synopsis:
        'Depois de várias tentativas interrompidas por um autocarro, um telefonema e uma gargalhada, o primeiro beijo acontece quando deixam de tentar torná-lo perfeito.',
      excerpt: 'Durante muitos anos, os dois discordaram sobre quem se aproximou primeiro.',
      imageSrc: `${sampleBookBase}/o-nosso-primeiro-beijo-foi-so-o-principio/feature.jpeg`,
      imageAlt: 'Livro físico “O Nosso Primeiro Beijo Foi Só o Princípio” numa mesa de cabeceira',
      styleLabel: 'Minimalista',
      contextLabel: 'Primeiro beijo',
      ageLabel: 'Adultos',
      chapterCountLabel: 'Capítulo de amostra',
      durationLabel: 'Áudio 33 s',
      audioSampleSrc: `${sampleBookBase}/o-nosso-primeiro-beijo-foi-so-o-principio/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'Quase, Outra Vez',
        imageSrc: `${sampleBookBase}/o-nosso-primeiro-beijo-foi-so-o-principio/chapter-01.jpeg`,
        imageAlt: 'Dois adultos a rir numa paragem de autocarro em Lisboa à noite',
        paragraphs: [
          'Durante muitos anos, os dois discordaram sobre quem se aproximou primeiro. Marta dizia que tinha sido Miguel, porque ele inclinara a cabeça. Miguel defendia que inclinar a cabeça não contava como movimento, apenas como preparação logística.',
          'Tinham saído de um cinema pequeno. Nenhum se lembrava do final do filme; lembravam-se de terem ficado sentados mais um minuto porque levantar-se significava decidir o que vinha depois.',
          'Quando ficaram frente a frente na paragem, um autocarro apareceu com um rugido e travou diante deles. Afastaram-se para dar passagem e perceberam que tinham acabado de falhar qualquer coisa.',
          'Na segunda tentativa, o telemóvel de Marta começou a tocar. Na terceira, aproximaram-se ao mesmo tempo, ficaram nervosos e ela começou a rir. Miguel tentou manter uma expressão séria durante dois segundos e acabou por se rir também.',
          'Quando o riso abrandou, Marta deu um passo e perguntou, ainda a sorrir: “Posso?” O beijo foi curto, desajeitado e perfeito apenas por não tentar sê-lo.',
          'Nunca chegaram a acordo sobre quem se aproximara primeiro. Talvez por isso a história tenha permanecido tão viva: uma memória com espaço para duas versões, três interrupções e uma gargalhada que abriu finalmente o caminho.',
        ],
      },
    },
    {
      id: 'romance-book-03',
      slug: 'duas-chavenas-uma-vida',
      title: 'Duas Chávenas, Uma Vida',
      synopsis:
        'A vida de um casal é contada através das chávenas que acompanharam casas, empregos, manhãs apressadas, escolhas grandes e silêncios confortáveis.',
      excerpt: 'A primeira chávena lascou-se antes de eles terem uma casa onde a guardar.',
      imageSrc: `${sampleBookBase}/duas-chavenas-uma-vida/feature.jpeg`,
      imageAlt: 'Livro físico “Duas Chávenas, Uma Vida” numa cozinha com duas chávenas gastas',
      styleLabel: 'Pintura a óleo',
      contextLabel: 'Vida partilhada',
      ageLabel: 'Adultos',
      chapterCountLabel: 'Capítulo de amostra',
      durationLabel: 'Áudio 35 s',
      audioSampleSrc: `${sampleBookBase}/duas-chavenas-uma-vida/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'A Prateleira Mais Alta',
        imageSrc: `${sampleBookBase}/duas-chavenas-uma-vida/chapter-01.jpeg`,
        imageAlt: 'Duas chávenas diferentes numa mesa de cozinha iluminada pela manhã',
        paragraphs: [
          'A primeira chávena lascou-se antes de eles terem uma casa onde a guardar. Sofia comprara-a numa feira porque era a única coisa que conseguia imaginar na cozinha de um apartamento que ainda só existia em anúncios guardados no telemóvel.',
          'Levou-a para o quarto que arrendava e colocou-a numa caixa com a etiqueta “casa”. Não havia pratos, talheres ou chaves. Havia uma confiança quase imprudente de que a caixa acabaria por ser aberta no lugar certo.',
          'A chávena lascou-se durante a mudança. André mostrou-lhe a falha branca junto da asa. “Ainda funciona”, disse. Sofia passou o dedo pela pequena irregularidade. “Então fica.”',
          'A segunda chávena apareceu num domingo. Era verde, pesada e ligeiramente torta. Durante anos, as duas acompanharam empregos, contas, mudanças e conversas que precisaram de mais de uma manhã.',
          'Na terceira casa havia finalmente espaço. Compraram pratos iguais e uma máquina de café, mas as duas chávenas antigas ficaram na prateleira onde apanhavam melhor a luz.',
          'Quando Sofia perguntou onde André se imaginava dali a dez anos, ele pensou antes de responder: “Com uma prateleira maior.” Era a maneira que tinham encontrado de falar do futuro, deixando espaço para mais mudanças e mais manhãs.',
        ],
      },
    },
    {
      id: 'romance-book-04',
      slug: 'leonor-e-matilde-dois-paises-uma-casa',
      title: 'Leonor & Matilde — Dois Países, Uma Casa',
      synopsis:
        'Leonor vive em Lisboa e Matilde em Bruxelas. Entre áudios, voos atrasados e listas de coisas para fazer juntas, constroem uma definição própria de casa.',
      excerpt: 'Durante dois anos, a casa delas teve duas portas de embarque.',
      imageSrc: `${sampleBookBase}/leonor-e-matilde-dois-paises-uma-casa/feature.jpeg`,
      imageAlt: 'Livro físico “Leonor & Matilde — Dois Países, Uma Casa” dentro de uma mala aberta',
      styleLabel: 'Arte digital',
      contextLabel: 'Amor à distância',
      ageLabel: 'Adultos',
      chapterCountLabel: 'Capítulo de amostra',
      durationLabel: 'Áudio 35 s',
      audioSampleSrc: `${sampleBookBase}/leonor-e-matilde-dois-paises-uma-casa/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'Duas Portas de Embarque',
        imageSrc: `${sampleBookBase}/leonor-e-matilde-dois-paises-uma-casa/chapter-01.jpeg`,
        imageAlt: 'Duas mulheres adultas a despedirem-se numa zona de embarque',
        paragraphs: [
          'Durante dois anos, a casa delas teve duas portas de embarque. Uma anunciava voos para Bruxelas; a outra, regressos a Lisboa. Entre ambas existia uma coleção de pequenos rituais.',
          'Na primeira despedida, Leonor chegou cedo demais ao aeroporto. Matilde afastou-se com a mochila ao ombro, virou-se duas vezes e, quando o avião levantou voo, enviou uma mensagem: “Ainda aqui.”',
          'Às segundas-feiras enviavam um áudio enquanto faziam o pequeno-almoço. Leonor descrevia a luz de Lisboa; Matilde respondia com o som da chuva na janela de Bruxelas.',
          'Havia também uma lista chamada “Quando estivermos na mesma cidade”. Começou com museus e viagens, depois ganhou coisas menos ambiciosas: comprar uma planta, escolher uma mesa, passar um domingo sem verificar voos.',
          'No dia da mudança, Matilde trouxe três malas, uma caixa de livros e a chávena amarela que aparecia nos áudios. Leonor esperava-a à porta com uma chave presa a uma fita cor de vinho.',
          'Casa nunca tinha sido uma cidade escolhida contra a outra. Era a coleção de gestos praticados à distância e que agora cabia num único espaço: duas chávenas, duas línguas e uma porta que já não era de embarque.',
        ],
      },
    },
    {
      id: 'romance-book-05',
      slug: 'rui-e-tomas-o-ultimo-capitulo-antes-do-sim',
      title: 'Rui & Tomás — O Último Capítulo Antes do Sim',
      synopsis:
        'Rui reúne os lugares onde ele e Tomás aprenderam a ser uma equipa. O último capítulo fica incompleto porque precisa de uma resposta dada fora do livro.',
      excerpt:
        'Todas as grandes decisões deles começaram com um plano que nenhum dos dois cumpriu.',
      imageSrc: `${sampleBookBase}/rui-e-tomas-o-ultimo-capitulo-antes-do-sim/feature.jpeg`,
      imageAlt:
        'Livro físico “Rui & Tomás — O Último Capítulo Antes do Sim” embrulhado com fita cor de vinho',
      styleLabel: 'Minimalista',
      contextLabel: 'Próximo capítulo',
      ageLabel: 'Adultos',
      chapterCountLabel: 'Capítulo de amostra',
      durationLabel: 'Áudio 37 s',
      audioSampleSrc: `${sampleBookBase}/rui-e-tomas-o-ultimo-capitulo-antes-do-sim/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'O Plano que Ficou por Cumprir',
        imageSrc: `${sampleBookBase}/rui-e-tomas-o-ultimo-capitulo-antes-do-sim/chapter-01.jpeg`,
        imageAlt: 'Dois homens adultos a partilhar sopa num pequeno café durante uma viagem',
        paragraphs: [
          'Todas as grandes decisões deles começaram com um plano que nenhum dos dois cumpriu. Rui tinha preparado um percurso e uma lista de miradouros. Tomás levou a convicção de que as melhores estradas eram as que pareciam erradas.',
          'Ao fim de quarenta minutos estavam perdidos. Viraram para uma aldeia, perderam a reserva e acabaram num café com três mesas enquanto chovia com força.',
          'Falaram de coisas que ainda não tinham coragem de chamar planos: uma casa com luz de manhã, um cão demasiado grande e trabalhos que permitissem jantar à mesma hora.',
          'Quando a chuva parou, a dona do café desenhou num guardanapo o caminho de volta. Rui fotografou a praça para se lembrar da primeira vez que um dia completamente falhado lhes parecera uma vida possível.',
          'Anos depois, escreveu sobre estradas erradas, sopa inesperada, um cão teimoso e a capacidade de ficarem quando nenhum sabia qual era o caminho. Deixou a última página em branco.',
          'Tal como na primeira viagem, o plano deixou de importar. A história tinha-os levado até ali. O capítulo seguinte continuava, inteira e livremente, nas mãos dos dois.',
        ],
      },
    },
  ],
  process: {
    title: 'Como transformar memórias num livro',
    steps: [
      'Escolha o tipo de história e a pessoa a quem quer oferecer.',
      'Conte os momentos e detalhes essenciais, usando apenas informação que pode partilhar.',
      'Escolha o tom, o género narrativo e o estilo visual.',
      'Leia, corrija e personalize texto, nomes e imagens.',
      'Partilhe ou ofereça apenas quando estiver satisfeito com a revisão.',
    ],
  },
  formats: {
    title: 'Formatos disponíveis no percurso',
    items: [
      'Leitura digital privada.',
      'Áudio quando disponível para a história.',
      'PDF para autoimpressão quando disponível.',
      'Livro impresso conforme disponibilidade e destino.',
    ],
  },
  trustAndPrivacy: {
    title: 'Confiança e privacidade em cada página',
    intro:
      'Uma história romântica pode conter detalhes pessoais. Mantenha apenas o que serve a narrativa e confirme sempre o que pretende partilhar.',
    items: [
      {
        title: 'Privado por defeito',
        body: 'A história não se torna um exemplo público só por ser criada.',
        iconSrc: `${iconBase}/fa-lock-romance-papercut.webp`,
        iconAlt: 'Ícone papercut de cadeado',
      },
      {
        title: 'Revisão antes da oferta',
        body: 'Confirme nomes, datas, tom e imagens antes de enviar ou imprimir.',
        iconSrc: `${iconBase}/fa-check-papercut.webp`,
        iconAlt: 'Ícone papercut de visto de confirmação',
      },
      {
        title: 'Consentimento de terceiros',
        body: 'Inclua fotografias e detalhes de outras pessoas apenas com autorização adequada.',
        iconSrc: `${iconBase}/fa-camera-papercut.webp`,
        iconAlt: 'Ícone papercut de câmara',
      },
      {
        title: 'Partilha sob controlo',
        body: 'É o utilizador que decide quando, como e com quem partilha a história.',
        iconSrc: `${iconBase}/fa-user-papercut.webp`,
        iconAlt: 'Ícone papercut de utilizador',
      },
    ],
  },
  faq: [
    {
      question: 'Como funciona a criação de um livro personalizado para um casal?',
      answer:
        'Comece por partilhar as memórias que quer guardar: como se conheceram, uma viagem, uma mensagem, uma tradição ou aqueles pequenos hábitos que só vocês reconhecem. A Mythoria ajuda a organizar esses momentos numa narrativa, permite escolher o tom e o estilo visual e cria um primeiro livro que pode rever e personalizar antes de oferecer.',
    },
    {
      question: 'Preciso de saber escrever ou de ter a história toda preparada?',
      answer:
        'Não. Pode começar apenas com uma memória, uma frase ou alguns episódios soltos. Escreva, conte a história por voz ou use notas que já tenha; o percurso guiado ajuda a transformar esse ponto de partida num livro com princípio, desenvolvimento e um final à vossa medida.',
    },
    {
      question: 'Até que ponto posso personalizar a nossa história?',
      answer:
        'Muito para além dos nomes. Pode definir as personagens, os lugares, os momentos essenciais, o número de capítulos, o tom romântico, a voz narrativa e o estilo das ilustrações. Também pode acrescentar frases, dedicatórias e detalhes privados que façam o livro parecer verdadeiramente vosso.',
    },
    {
      question: 'Posso incluir fotografias do casal?',
      answer:
        'Sim, quando essa opção estiver disponível no percurso. As fotografias podem ajudar a tornar as personagens mais reconhecíveis, mas deve carregar apenas imagens que pode utilizar e para as quais tem a autorização adequada das pessoas identificáveis.',
    },
    {
      question: 'Posso rever e alterar o livro antes de o oferecer?',
      answer:
        'Sim. O primeiro resultado é um ponto de partida, não uma versão fechada. Pode corrigir nomes e datas, editar o texto, ajustar o tom, refinar capítulos e substituir imagens até sentir que cada página conta a história que queria oferecer.',
    },
    {
      question: 'A nossa história fica privada?',
      answer:
        'Sim, por defeito. O livro fica associado à sua conta e não é publicado automaticamente. Se quiser partilhá-lo com a pessoa a quem o vai oferecer ou com um pequeno grupo, pode fazê-lo de forma intencional através das opções de partilha disponíveis.',
    },
    {
      question: 'Posso criar uma surpresa sem revelar o que estou a preparar?',
      answer:
        'Sim. Pode escolher um título e uma capa discretos, guardar o livro em privado enquanto o prepara e rever tudo antes de partilhar. É uma boa opção para aniversários de namoro ou casamento, pedidos especiais e prendas que só devem fazer sentido no momento certo.',
    },
    {
      question: 'Este livro serve apenas para aniversários de namoro?',
      answer:
        'Não. Pode celebrar um primeiro encontro, um casamento, uma relação à distância, uma viagem inesquecível, uma vida inteira em conjunto ou simplesmente a beleza dos dias comuns. A ocasião muda; o que torna a prenda especial são os detalhes que pertencem aos dois.',
    },
    {
      question: 'Que formatos posso escolher para o livro?',
      answer:
        'A leitura digital está no centro da experiência e, consoante a história e as opções disponíveis, pode também criar um audiolivro, descarregar um PDF preparado para impressão ou encomendar um livro físico. A disponibilidade e o custo de cada formato são apresentados no produto antes de confirmar.',
    },
    {
      question: 'Quanto custa criar um livro personalizado?',
      answer:
        'Criar uma conta é gratuito e a Mythoria funciona com créditos, que pode usar na criação do livro e em opções adicionais, como áudio, edições assistidas ou impressão. O custo aplicável é sempre apresentado antes de confirmar, para poder escolher apenas os formatos e acabamentos que fazem sentido para a sua prenda.',
    },
    {
      question: 'Quanto tempo demora a criar e receber o livro?',
      answer:
        'O tempo de criação depende do número de capítulos, das ilustrações e das opções escolhidas. Pode acompanhar o progresso e regressar à história mais tarde para a rever. Se escolher impressão e envio, a estimativa atual de produção e entrega depende do destino e é apresentada durante a encomenda.',
    },
    {
      question: 'Posso guardar o rascunho e continuar noutro dia?',
      answer:
        'Sim. A história fica guardada na sua conta, para poder reunir memórias com calma, voltar a editar no telemóvel ou no computador e preparar a surpresa ao seu ritmo. Não precisa de decidir todos os capítulos numa única sessão.',
    },
    {
      question: 'Posso criar o livro noutra língua?',
      answer:
        'Sim, pode escolher uma das línguas suportadas pela Mythoria e, quando disponível, traduzir uma história já criada. É especialmente útil para casais de países diferentes, relações à distância ou prendas destinadas a uma família bilingue.',
    },
  ],
  safetyNote: {
    title: 'Proteja os detalhes que pertencem aos dois',
    body: 'Evite moradas, contactos, documentos, dados íntimos e informação de terceiros sem autorização. Conteúdo privado não deve ser reutilizado como exemplo público ou marketing sem uma ação e base legítima próprias.',
  },
  finalCta: {
    title: 'O próximo capítulo pode começar com as memórias que já têm.',
    body: 'Escolha um momento. Acrescente os detalhes que só vocês reconhecem. A Mythoria ajuda a transformá-los num livro para oferecer, reler e guardar.',
  },
  structuredData: {
    about: [
      'Livro personalizado para casais',
      'História de amor personalizada',
      'Prenda de aniversário de namoro',
      'Livro de memórias de casal',
    ],
    serviceName: 'Livro personalizado Mythoria para casais',
    serviceType: 'História personalizada, leitura digital, áudio, PDF e livro impresso',
    includeProduct: false,
  },
};
