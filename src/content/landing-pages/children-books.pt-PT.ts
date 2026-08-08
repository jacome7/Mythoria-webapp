import type { LandingPageContent } from './types';

const landingBase = '/landing-pages/livro-personalizado-crianca/assets';
const bookBase = `${landingBase}/books`;
const iconBase = '/Papercut_icons';

export const childrenBooksLandingPage: LandingPageContent = {
  translationKey: 'personalized-children-books',
  slug: 'livro-personalizado-crianca',
  locale: 'pt-PT',
  title: 'Livro personalizado para crianças',
  metaTitle: 'Livro Personalizado para Crianças | Mythoria',
  metaDescription:
    'Transforme o nome, os interesses, as memórias ou um desenho da criança numa história ilustrada para ler, ouvir, imprimir ou oferecer.',
  breadcrumbLabel: 'Livro personalizado para crianças',
  ogImageSrc: `${landingBase}/hero/og-cover.jpeg`,
  primaryIntent: 'kids_adventures',
  riskRating: 'yellow',
  updatedAt: '2026-08-06',
  editorialReviewDaysAgo: 17,
  indexable: false,
  showFormatsNearHero: false,
  showFormatsNearProcess: true,
  primaryCtaHref:
    '/pt-PT/tell-your-story/step-1?landingSlug=livro-personalizado-crianca&primaryIntent=kids_adventures',
  secondaryCtaHref: '#exemplos',
  primaryCta: 'Criar um livro para uma criança',
  secondaryCta: 'Ver livros criados',
  templateIcons: {
    heroEyebrow: { src: `${iconBase}/sparkles.webp`, alt: '' },
    ctaArrow: { src: `${iconBase}/fa-chevron-right-papercut.webp`, alt: '' },
    quickAnswer: { src: `${iconBase}/fa-check-papercut.webp`, alt: '' },
    audioSample: { src: `${iconBase}/fa-microphone-papercut.webp`, alt: '' },
    sampleChapter: { src: `${iconBase}/openBook.webp`, alt: '' },
    safetyNote: { src: `${iconBase}/fa-exclamation-triangle-papercut.webp`, alt: '' },
    formats: [
      { src: `${iconBase}/openBook.webp`, alt: '' },
      { src: `${iconBase}/fa-microphone-papercut.webp`, alt: '' },
      { src: `${iconBase}/fa-file-upload-papercut.webp`, alt: '' },
      { src: `${iconBase}/fa-book-open-papercut.webp`, alt: '' },
    ],
  },
  analytics: {
    pageViewEvent: 'landing_page_view',
    variant: 'personalized-children-books-v1',
  },
  hero: {
    eyebrow: 'Uma história feita à medida da criança',
    heading: 'Crie um livro personalizado onde a criança é a heroína.',
    headline:
      'Transforme nomes, interesses, pessoas, animais, lugares, memórias ou desenhos numa história que parece ter sido feita só para ela.',
    subheadline:
      'Escolha os detalhes, o tom e o estilo. Depois, reveja o livro com calma antes de o partilhar ou escolher um formato disponível.',
    imageSrc: `${landingBase}/hero/hero.jpeg`,
    imageAlt:
      'Livro infantil Mia e a Pastelaria da Lua num cenário de leitura noturna, criado com a Mythoria',
  },
  trustBadges: ['Conta adulta', 'Privado por defeito', 'Reveja antes de partilhar'],
  quickAnswer: {
    title: 'O que é um livro personalizado para uma criança?',
    body: 'É uma história construída com o nome, a idade, os interesses e os detalhes que o adulto escolher — pessoas familiares, animais, lugares, memórias, desenhos ou ideias. O adulto define o tom e o estilo e revê o resultado antes de o partilhar.',
  },
  intro: {
    title: 'Mais do que o nome na capa.',
    body: [
      'Uma personalização com significado muda quem entra na história, onde a aventura acontece, qual é o desafio, que escolhas aparecem, como a linguagem se adapta e que detalhes regressam nas imagens.',
      'Por exemplo, “adora cães, panquecas e uma manta amarela” pode tornar-se uma pequena pastelaria lunar onde a criança e o seu cão levam a manta amarela e preparam o pão dos sonhos.',
    ],
  },
  whyThisFits: {
    title: 'Um livro acabado, preparado por um adulto.',
    body: [
      'Não precisa de saber escrever uma história inteira. Começa com os detalhes que conhece e escolhe uma direção narrativa e visual.',
      'Antes de o livro sair do espaço privado, o adulto deve confirmar nomes, texto, imagens, pessoas identificáveis e tudo o que prefere retirar.',
    ],
  },
  useCases: {
    title: 'Uma história pode começar em muitos lugares.',
    intro:
      'Escolha um ponto de partida próximo da criança e deixe que esse detalhe conduza o livro.',
    items: [
      {
        title: 'A criança como heroína',
        body: 'Uma aventura construída à volta de um lugar, criatura ou objeto favorito.',
        iconSrc: `${iconBase}/fa-child-careful-ages-papercut.webp`,
        iconAlt: 'Ícone Paper Cut de uma criança',
      },
      {
        title: 'Uma história de adormecer',
        body: 'Ritmo mais calmo, rotinas familiares e áudio quando estiver disponível.',
        iconSrc: `${iconBase}/fa-moon-support-papercut.webp`,
        iconAlt: 'Ícone Paper Cut de uma lua',
      },
      {
        title: 'Um desenho transformado em história',
        body: 'Use a fotografia autorizada de um desenho como semente criativa para personagens e mundos.',
        iconSrc: `${iconBase}/fa-pencil-alt-papercut.webp`,
        iconAlt: 'Ícone Paper Cut de um lápis',
      },
      {
        title: 'Um interesse favorito',
        body: 'Futebol, dinossauros, espaço, comboios, animais, música, ciência ou outro interesse seguro.',
        iconSrc: `${iconBase}/fa-star-business-differentiation-papercut.webp`,
        iconAlt: 'Ícone Paper Cut de uma estrela',
      },
      {
        title: 'Uma memória de família',
        body: 'Uma receita, uma viagem, uma frase, um animal ou um dia que a família quer guardar.',
        iconSrc: `${iconBase}/fa-heart-business-family-papercut.webp`,
        iconAlt: 'Ícone Paper Cut de um coração familiar',
      },
      {
        title: 'Uma prenda para um dia especial',
        body: 'Um aniversário, o Natal, um batizado ou outra ocasião que pede algo só daquela criança.',
        iconSrc: `${iconBase}/fa-gift-papercut.webp`,
        iconAlt: 'Ícone Paper Cut de uma prenda',
      },
    ],
  },
  personalization: {
    title: 'Personalize os detalhes que tornam a história única.',
    intro:
      'Comece com poucos detalhes úteis. Não precisa de expor informação privada para a história parecer próxima da criança.',
    groups: [
      {
        title: 'A criança',
        body: 'Escolha a forma como a personagem aparece e como o texto se adapta.',
        choices: [
          'Primeiro nome ou nome da personagem',
          'Faixa etária',
          'Pronomes',
          'Nível de leitura',
        ],
        iconSrc: `${iconBase}/fa-child-careful-ages-papercut.webp`,
        iconAlt: 'Ícone Paper Cut de uma criança',
      },
      {
        title: 'Pessoas e animais',
        body: 'Inclua apenas pessoas e animais relevantes e com autorização adequada.',
        choices: ['Familiares', 'Amigos', 'Animais de companhia', 'Companheiro imaginário'],
        iconSrc: `${iconBase}/fa-heart-business-family-papercut.webp`,
        iconAlt: 'Ícone Paper Cut de relações familiares',
      },
      {
        title: 'Interesses e detalhes',
        body: 'Use elementos concretos que a criança reconhece sem revelar o que não é necessário.',
        choices: [
          'Hobbies e objetos',
          'Frases familiares',
          'Cores e alimentos',
          'Lugares e rotinas seguras',
        ],
        iconSrc: `${iconBase}/fa-star-business-differentiation-papercut.webp`,
        iconAlt: 'Ícone Paper Cut de uma estrela',
      },
      {
        title: 'Direção da história',
        body: 'Escolha o tipo de experiência que quer ler em conjunto.',
        choices: [
          'Aventura ou mistério',
          'Adormecer ou humor',
          'Fantasia ou descoberta',
          'Desporto ou memória familiar',
        ],
        iconSrc: `${iconBase}/openBook.webp`,
        iconAlt: 'Ícone Paper Cut de um livro aberto',
      },
      {
        title: 'Direção visual',
        body: 'Defina o ambiente das imagens e use media apenas quando é autorizado.',
        choices: ['Estilo visual', 'Ambiente de cor', 'Desenho fornecido', 'Fotografia autorizada'],
        iconSrc: `${iconBase}/fa-pencil-alt-papercut.webp`,
        iconAlt: 'Ícone Paper Cut de um lápis',
      },
    ],
    ctaLabel: 'Começar com uma ideia',
  },
  carefulBenefits: {
    title: 'O resultado é único e pessoal, não é genérico.',
    items: [
      'A personagem, o cenário e o desafio podem nascer dos detalhes escolhidos pelo adulto.',
      'A idade, o ritmo e a linguagem orientam a forma como a história é contada.',
      'O estilo visual ajuda a dar uma identidade própria ao livro.',
      'A revisão final permite corrigir ou retirar detalhes antes de qualquer partilha.',
    ],
  },
  booksSection: {
    eyebrow: 'Livros criados com a Mythoria',
    title: 'Cinco histórias, cinco maneiras de pôr uma criança dentro do livro.',
    intro:
      'Explore livros criados na Mythoria para diferentes idades, interesses e estilos visuais. Abra um capítulo e ouça um excerto antes de começar o seu.',
  },
  books: [
    {
      id: 'children-book-01',
      slug: 'mia-e-a-pastelaria-da-lua',
      title: 'Mia e a Pastelaria da Lua',
      synopsis:
        'Mia e o seu cão descobrem uma pastelaria lunar onde os sonhos são amassados antes do amanhecer.',
      excerpt:
        'Quando a Lua abriu a sua pequena pastelaria, Mia foi a primeira a sentir o cheiro a estrelas quentes.',
      imageSrc: `${bookBase}/mia-e-a-pastelaria-da-lua/feature.jpeg`,
      imageAlt:
        'Livro Mia e a Pastelaria da Lua num cenário de leitura noturna com uma manta amarela',
      styleLabel: 'Claymation',
      contextLabel: 'História de adormecer',
      ageLabel: '4–7 anos',
      sampleChapterHref: '/pt-PT/sample-books/mia-e-a-pastelaria-da-lua',
      audioSampleSrc: `${bookBase}/mia-e-a-pastelaria-da-lua/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir um excerto de Mia',
      audioTranscriptLabel: 'Ler a transcrição do excerto',
      audioSampleTranscript:
        'Quando a Lua abriu a sua pequena pastelaria, Mia foi a primeira a sentir o cheiro a estrelas quentes. Ao lado dela, Pingo levantou as orelhas. Dentro da loja, pães redondos dormiam em tabuleiros de prata e uma massa muito pequena suspirava por baixo de uma manta amarela. Antes do amanhecer, Mia teria de descobrir para quem era aquele último sonho. Do outro lado da janela, uma escada de luz começou a aparecer, degrau a degrau, como bolachas iluminadas.',
      sampleChapter: {
        title: 'O pão do último sonho',
        imageSrc: `${bookBase}/mia-e-a-pastelaria-da-lua/chapter-01.jpeg`,
        imageAlt:
          'Mia, Pingo e Dona Aurora transportam um pão luminoso na pastelaria lunar em claymation',
        paragraphs: [
          'Quando a Lua abriu a sua pequena pastelaria, Mia foi a primeira a sentir o cheiro a estrelas quentes. Estava na cama, enrolada na manta amarela, quando o aroma entrou pela janela.',
          'No fim de uma escada de luz havia uma pastelaria minúscula. Batedeiras de cobre rodavam devagar e, em tabuleiros de prata, pães redondos dormiam debaixo de panos bordados.',
          'Dona Aurora explicou que faltava o último pão da noite. Precisava de uma recordação que aquecesse, uma coragem pequenina e alguém com quem partilhar.',
          'Mia contou os domingos de bolo de maçã, admitiu que também tinha medo do escuro e dividiu a massa em duas partes.',
          'Quando o forno crescente tocou a sua campainha suave, o pão do senhor Silvestre brilhava por dentro — o suficiente para lhe devolver uma estrada azul em sonhos.',
        ],
      },
    },
    {
      id: 'children-book-02',
      slug: 'tomas-e-o-mapa-das-portas-escondidas',
      title: 'Tomás e o Mapa das Portas Escondidas',
      synopsis:
        'Um mapa encontrado num livro antigo abre portas de papel por uma cidade em camadas, mas a última pede ajuda.',
      excerpt: 'O mapa parecia feito de papel normal, até a primeira porta se levantar da página.',
      imageSrc: `${bookBase}/tomas-e-o-mapa-das-portas-escondidas/feature.jpeg`,
      imageAlt:
        'Livro Tomás e o Mapa das Portas Escondidas numa mesa de biblioteca com um mapa dobrado',
      styleLabel: 'Papercut',
      contextLabel: 'Aventura e mistério',
      ageLabel: '6–9 anos',
      sampleChapterHref: '/pt-PT/sample-books/tomas-e-o-mapa-das-portas-escondidas',
      audioSampleSrc: `${bookBase}/tomas-e-o-mapa-das-portas-escondidas/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir um excerto de Tomás',
      audioTranscriptLabel: 'Ler a transcrição do excerto',
      audioSampleTranscript:
        'O mapa parecia feito de papel normal, até a primeira porta se levantar da página. Tomás tocou-lhe com a ponta do lápis e ouviu a cidade respirar do outro lado. No bolso levava uma bússola de brincar; na cabeça, a frase que a avó repetia sempre: uma pista só fica completa quando é partilhada. Então a porta dobrou-se outra vez e revelou um caminho azul. Sara aproximou-se da mesa, e os dois perceberam que aquela porta só se abriria com duas mãos.',
      sampleChapter: {
        title: 'A porta que precisava de duas mãos',
        imageSrc: `${bookBase}/tomas-e-o-mapa-das-portas-escondidas/chapter-01.jpeg`,
        imageAlt: 'Tomás e Sara abrem juntos uma porta azul numa cidade de papel em camadas',
        paragraphs: [
          'O mapa parecia feito de papel normal, até a primeira porta se levantar da página. Tomás encontrou-o dentro de um livro sem título, na biblioteca.',
          'Ele e Sara atravessaram uma cidade recortada em camadas, onde as árvores eram leques e os pássaros tinham asas feitas de envelopes.',
          'Cada pista precisava de capacidades diferentes: Tomás segurava os objetos, Sara descobria o ângulo e ambos paravam para escutar.',
          'A última porta não tinha maçaneta. Tinha duas marcas, uma de cada lado, exatamente do tamanho das mãos deles.',
          'Quando pousaram as mãos ao mesmo tempo, a porta desdobrou-se como uma flor e a bússola apontou para o espaço entre os dois.',
        ],
      },
    },
    {
      id: 'children-book-03',
      slug: 'lia-e-o-jardim-das-palavras-perdidas',
      title: 'Lia e o Jardim das Palavras Perdidas',
      synopsis:
        'Lia entra num jardim onde as palavras de família crescem como flores e só podem ser levadas depois de se conhecer a sua história.',
      excerpt:
        'No jardim de Lia, as palavras não estavam escritas: cresciam devagar entre as folhas.',
      imageSrc: `${bookBase}/lia-e-o-jardim-das-palavras-perdidas/feature.jpeg`,
      imageAlt:
        'Livro Lia e o Jardim das Palavras Perdidas numa mesa de jardim com alecrim e uma flor prensada',
      styleLabel: 'Aguarela',
      contextLabel: 'Descoberta poética',
      ageLabel: '5–8 anos',
      sampleChapterHref: '/pt-PT/sample-books/lia-e-o-jardim-das-palavras-perdidas',
      audioSampleSrc: `${bookBase}/lia-e-o-jardim-das-palavras-perdidas/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir um excerto de Lia',
      audioTranscriptLabel: 'Ler a transcrição do excerto',
      audioSampleTranscript:
        'No jardim de Lia, as palavras não estavam escritas: cresciam devagar entre as folhas. Havia uma flor que dizia aconchego e outra que só sabia repetir já vou. Lia quis levar todas, mas a tia explicou que cada palavra precisava da sua história. Por isso sentaram-se junto ao alecrim e começaram pela expressão que fazia toda a família sorrir. Quando o vento passou, novas sílabas acordaram no canteiro, cada uma com uma cor, um perfume e uma memória diferente.',
      sampleChapter: {
        title: 'A palavra que cheirava a alecrim',
        imageSrc: `${bookBase}/lia-e-o-jardim-das-palavras-perdidas/chapter-01.jpeg`,
        imageAlt: 'Lia e tia Amélia escutam uma flor junto ao alecrim num jardim em aguarela',
        paragraphs: [
          'No jardim de Lia, as palavras não estavam escritas: cresciam devagar entre as folhas. Uma flor azul abriu-se junto ao alecrim e disse “aconchego”.',
          'Lia quis levar todas as palavras, mas tia Amélia explicou que uma palavra sem a sua história fica leve demais e desaparece.',
          'Sentaram-se no banco. A tia contou que, em casa da avó, “ainda há aconchego” era uma forma de acrescentar uma cadeira e dividir o pão.',
          'Em vez de arrancar a flor, Lia desenhou-a e recebeu uma semente. Deixou outra palavra no jardim quando percebeu que ainda não conhecia a sua história.',
          'Ao jantar, a família reviu o livro em conjunto. As páginas acomodaram-se como pessoas a chegar a uma mesa onde ainda havia lugar.',
        ],
      },
    },
    {
      id: 'children-book-04',
      slug: 'a-equipa-que-marcou-um-golo-nas-estrelas',
      title: 'A Equipa que Marcou um Golo nas Estrelas',
      synopsis:
        'Um campo de bairro ilumina-se quando cada jogador contribui com uma capacidade diferente.',
      excerpt:
        'A bola brilhou pela primeira vez quando o passe chegou a quem ninguém estava a ver.',
      imageSrc: `${bookBase}/a-equipa-que-marcou-um-golo-nas-estrelas/feature.jpeg`,
      imageAlt:
        'Livro A Equipa que Marcou um Golo nas Estrelas junto a uma bola e a um cachecol sem marca',
      styleLabel: 'Banda desenhada europeia',
      contextLabel: 'Desporto e equipa',
      ageLabel: '8–11 anos',
      sampleChapterHref: '/pt-PT/sample-books/a-equipa-que-marcou-um-golo-nas-estrelas',
      audioSampleSrc: `${bookBase}/a-equipa-que-marcou-um-golo-nas-estrelas/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir um excerto da equipa',
      audioTranscriptLabel: 'Ler a transcrição do excerto',
      audioSampleTranscript:
        'A bola brilhou pela primeira vez quando o passe chegou a quem ninguém estava a ver. No Campo da Aurora, cada linha acendeu-se como uma constelação. Uma jogadora encontrou espaço, outra ouviu o aviso do guarda-redes e a mais nova fez o passe simples. Não havia uma estrela sozinha: o céu inteiro parecia desenhado pelos movimentos da equipa. A treinadora sorriu sem dar instruções; queria que descobrissem como ouvir o jogo antes de correr atrás da bola.',
      sampleChapter: {
        title: 'O passe que acendeu o campo',
        imageSrc: `${bookBase}/a-equipa-que-marcou-um-golo-nas-estrelas/chapter-01.jpeg`,
        imageAlt:
          'Cinco jogadores ligam um passe luminoso num campo de bairro em banda desenhada europeia',
        paragraphs: [
          'A bola brilhou pela primeira vez quando o passe chegou a quem ninguém estava a ver. Uma faixa de luz atravessou o Campo da Aurora.',
          'Os Cometas descobriram que as linhas só apareciam quando levantavam a cabeça e ligavam capacidades diferentes.',
          'No jogo de sábado, Rui viu o espaço, Simão recuou, Lara fez o passe curto, Mei escolheu o momento e Noa continuou a corrida.',
          'O golo não pertenceu a uma única estrela. O campo mostrou cinco constelações ligadas pelo caminho da bola.',
          'Depois do empate, a equipa reviu em conjunto o capítulo do jogo e confirmou o contributo de cada pessoa.',
        ],
      },
    },
    {
      id: 'children-book-05',
      slug: 'ines-e-o-robo-feito-de-desenhos',
      title: 'Inês e o Robô Feito de Desenhos',
      synopsis:
        'Um robô de formas desencontradas sai da página e pede ajuda para descobrir o seu propósito.',
      excerpt:
        'O robô de Inês tinha três rodas, duas asas de papel e uma pergunta desenhada no peito.',
      imageSrc: `${bookBase}/ines-e-o-robo-feito-de-desenhos/feature.jpeg`,
      imageAlt: 'Livro Inês e o Robô Feito de Desenhos numa secretária com lápis e formas de papel',
      styleLabel: 'Lápis de cor',
      contextLabel: 'Desenho e invenção',
      ageLabel: '7–10 anos',
      sampleChapterHref: '/pt-PT/sample-books/ines-e-o-robo-feito-de-desenhos',
      audioSampleSrc: `${bookBase}/ines-e-o-robo-feito-de-desenhos/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir um excerto de Inês',
      audioTranscriptLabel: 'Ler a transcrição do excerto',
      audioSampleTranscript:
        'O robô de Inês tinha três rodas, duas asas de papel e uma pergunta desenhada no peito. À meia-noite, saiu da folha com um ruído de lápis a riscar. Conseguia rolar, voar baixinho e encontrar parafusos perdidos, mas não sabia para que tinha sido inventado. Inês pegou no caderno e decidiu que aquela resposta não viria de um manual. Risco inclinou a cabeça de papel, abriu as asas e apontou para uma estrela desenhada no canto da página.',
      sampleChapter: {
        title: 'A pergunta no peito',
        imageSrc: `${bookBase}/ines-e-o-robo-feito-de-desenhos/chapter-01.jpeg`,
        imageAlt: 'Inês e o robô Risco organizam lápis numa ilustração de lápis de cor',
        paragraphs: [
          'O robô de Inês tinha três rodas, duas asas de papel e uma pergunta desenhada no peito. À meia-noite, saiu do caderno com um ruído de lápis.',
          'Risco conseguia correr pelo tapete e levantar objetos pequenos, mas nenhuma tarefa parecia explicar para que tinha sido inventado.',
          'Inês desenhou três círculos: “consigo”, “gosto” e “ajuda”. O robô encontrava coisas pequenas, organizava formas e deixava a decisão a quem criava.',
          'Quando ajudou Inês a comparar possibilidades sem escolher por ela, o ponto de interrogação ganhou luz.',
          'O propósito ficou com espaço para crescer: Risco seria um explorador de ideias, revisto à medida que ambos aprendessem.',
        ],
      },
    },
  ],
  process: {
    title: 'Como criar o livro',
    steps: [
      'Comece com uma ideia, memória, desenho, fotografia ou mensagem de voz.',
      'Escolha as personagens, o tom, o estilo e a idade de leitura.',
      'Crie a história e veja o primeiro resultado.',
      'Reveja nomes, texto, imagens e detalhes.',
      'Leia, ouça, partilhe, imprima ou encomende apenas os formatos disponíveis.',
    ],
  },
  formats: {
    title: 'Escolha entre as opções disponíveis para a história',
    items: [
      'Leitura digital privada para rever antes de partilhar.',
      'Áudio narrado quando estiver disponível para a história.',
      'Partilha privada e PDF para autoimpressão quando disponíveis.',
      'Livro físico conforme a oferta atual, o preço aplicável e o destino.',
    ],
  },
  trustAndPrivacy: {
    title: 'Uma história sobre uma criança merece escolhas cuidadas.',
    intro:
      'Use apenas o necessário para criar o livro. O adulto é responsável pela revisão e por qualquer decisão posterior de partilha.',
    items: [
      {
        title: 'Conta e revisão adultas',
        body: 'Um adulto inicia a criação, confirma os detalhes e decide o que acontece ao livro.',
        iconSrc: `${iconBase}/fa-user-papercut.webp`,
        iconAlt: 'Ícone Paper Cut de uma conta',
      },
      {
        title: 'Privado por defeito',
        body: 'Criar a história não a transforma automaticamente numa página pública.',
        iconSrc: `${iconBase}/fa-lock-romance-papercut.webp`,
        iconAlt: 'Ícone Paper Cut de um cadeado',
      },
      {
        title: 'Media com autorização',
        body: 'Use fotografias, desenhos ou voz apenas quando tem o direito e a autorização adequados.',
        iconSrc: `${iconBase}/fa-camera-papercut.webp`,
        iconAlt: 'Ícone Paper Cut de uma câmara',
      },
      {
        title: 'Revisão antes de partilhar',
        body: 'Confirme texto, imagens, terceiros e detalhes sensíveis antes de enviar, imprimir ou publicar.',
        iconSrc: `${iconBase}/fa-check-papercut.webp`,
        iconAlt: 'Ícone Paper Cut de confirmação',
      },
    ],
  },
  faq: [
    {
      question: 'O que posso personalizar num livro infantil?',
      answer:
        'Pode adaptar a personagem, a faixa etária, os pronomes, os interesses, as pessoas e animais autorizados, os lugares, as frases, o tipo de aventura e o estilo visual. Inclua apenas os detalhes necessários e assinale tudo o que prefere excluir.',
    },
    {
      question: 'Preciso de saber escrever?',
      answer:
        'Não. Pode começar com uma ideia curta, uma memória, um desenho, uma fotografia autorizada ou uma mensagem de voz. A Mythoria ajuda a construir a narrativa; o adulto continua responsável por rever o resultado.',
    },
    {
      question: 'Para que idades pode ser adaptada a história?',
      answer:
        'A criação permite escolher uma faixa etária e orientar o vocabulário, o ritmo e o tipo de história. Confirme sempre se o resultado é adequado à criança antes de o partilhar.',
    },
    {
      question: 'A criança pode ser a personagem principal?',
      answer:
        'Sim. Pode usar o primeiro nome ou escolher outro nome para a personagem e adaptar interesses, aparência e detalhes narrativos sem divulgar informação desnecessária.',
    },
    {
      question: 'Posso incluir familiares ou animais?',
      answer:
        'Sim, quando forem relevantes para a história. Para pessoas identificáveis, use apenas dados e imagens que tem autorização para utilizar; para animais, escolha os traços que ajudam a reconhecê-los na narrativa.',
    },
    {
      question: 'Posso transformar um desenho numa história?',
      answer:
        'Pode usar a fotografia autorizada de um desenho como ponto de partida quando essa opção estiver disponível no percurso de criação. Evite personagens protegidas e confirme como os elementos do desenho aparecem no resultado.',
    },
    {
      question: 'Posso usar fotografias?',
      answer:
        'Pode usar fotografias próprias e autorizadas através das opções disponíveis. Evite documentos, moradas, nomes de escolas, localizações precisas e imagens de terceiros sem consentimento adequado.',
    },
    {
      question: 'Posso escolher uma história de adormecer mais calma?',
      answer:
        'Sim. Pode pedir um ritmo mais tranquilo, um ambiente familiar e uma aventura suave. É uma escolha narrativa, não uma promessa de que a criança adormece ou de qualquer outro resultado.',
    },
    {
      question: 'Posso rever e alterar a história?',
      answer:
        'O adulto deve rever nomes, texto, imagens e detalhes antes de partilhar. As opções de alteração disponíveis são apresentadas durante a criação; se algo estiver errado ou for sensível, retire-o antes de avançar.',
    },
    {
      question: 'A história é privada?',
      answer:
        'A história começa privada e não se torna pública apenas por ser criada. Uma partilha ou publicação posterior exige uma ação própria. Consulte a política de privacidade para informação atual sobre tratamento, conservação e eliminação de dados.',
    },
    {
      question: 'Posso ouvir a história?',
      answer:
        'Os cinco livros desta página têm um breve teaser áudio. Para uma história criada por si, a disponibilidade de narração é mostrada na própria experiência. Não apresentamos um audiobook completo quando existe apenas um excerto.',
    },
    {
      question: 'Que formatos digitais, PDF, áudio e impressão estão disponíveis?',
      answer:
        'A leitura digital privada faz parte da experiência. Áudio, partilha privada, PDF para autoimpressão e livro físico dependem das opções atuais da história, do preço aplicável e, quando relevante, do destino. Confirme o que é mostrado antes de avançar.',
    },
    {
      question: 'Quanto custa?',
      answer:
        'Consulte a página de preços e o valor apresentado no percurso antes de confirmar. O preço depende da opção escolhida; esta landing não publica valores ou promoções separados da oferta atual.',
    },
    {
      question: 'Quanto tempo demora a criação e a entrega?',
      answer:
        'O tempo pode variar com a história e com o formato. Quando existir impressão ou entrega para a opção escolhida, o prazo aplicável deve ser apresentado antes da confirmação. Esta página não promete um prazo fixo.',
    },
    {
      question: 'O livro pode ser criado noutra língua?',
      answer:
        'Escolha uma das línguas atualmente apresentadas no percurso de criação. Reveja sempre nomes, expressões familiares e pronúncia, sobretudo quando mistura idiomas ou inclui palavras próprias da família.',
    },
  ],
  safetyNote: {
    title: 'Criado por um adulto, revisto antes de sair do espaço privado.',
    body: 'A Mythoria é uma ferramenta criativa para fazer histórias personalizadas. Não substitui orientação familiar, escolar, clínica ou terapêutica e não promete resultados de sono, aprendizagem ou comportamento.',
  },
  finalCta: {
    title: 'A próxima história pode começar com aquilo que a criança já adora.',
    body: 'Comece com um nome, um interesse, um desenho, uma memória ou uma ideia. Crie o primeiro resultado e reveja-o com calma antes de decidir o passo seguinte.',
  },
  structuredData: {
    about: [
      'Livro personalizado para criança',
      'Livro infantil personalizado',
      'História infantil personalizada',
      'Presente personalizado para criança',
    ],
    serviceName: 'Livro personalizado Mythoria para crianças',
    serviceType: 'Criação de história infantil personalizada e ilustrada',
    areaServed: 'Portugal',
    includeProduct: false,
  },
};
