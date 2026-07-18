import type { LandingPageContent } from './types';

const slug = 'historias-de-apoio';
const iconBase = '/Papercut_icons';
const assetBase = `/landing-pages/${slug}/assets`;
const bookBase = `${assetBase}/books`;

export const supportiveStoriesLandingPage: LandingPageContent = {
  slug,
  locale: 'pt-PT',
  title: 'Histórias personalizadas para as mudanças pequenas e muito grandes da infância',
  metaTitle: 'Histórias Personalizadas para Ajudar Crianças | Mythoria',
  metaDescription:
    'Crie uma história personalizada para preparar mudanças, conversar sobre desafios ou guardar memórias, sempre com acompanhamento e revisão adulta.',
  primaryIntent: 'kids_transitions',
  riskRating: 'yellow',
  updatedAt: '2026-07-18',
  indexable: true,
  showInLandingPageIndex: true,
  showFormatsNearProcess: false,
  breadcrumbLabel: 'Histórias de Apoio',
  ogImageSrc: `${assetBase}/hero/og-cover.jpeg`,
  primaryCta: 'Escolher uma situação',
  primaryCtaHref: '#situacoes',
  secondaryCta: 'Ver livros de exemplo',
  secondaryCtaHref: '#exemplos',
  analytics: {
    pageViewEvent: 'supportive_story_page_view',
    variant: 'hub-v1',
  },
  trustBadges: ['Conta adulta', 'Privado por defeito', 'Reveja antes de partilhar'],
  templateIcons: {
    heroEyebrow: { src: `${iconBase}/sparkles.webp`, alt: '' },
    ctaArrow: { src: `${iconBase}/fa-chevron-right-papercut.webp`, alt: '' },
    quickAnswer: { src: `${iconBase}/fa-check-papercut.webp`, alt: '' },
    audioSample: { src: `${iconBase}/fa-microphone-papercut.webp`, alt: '' },
    professionalPanel: { src: `${iconBase}/fa-heart-business-family-papercut.webp`, alt: '' },
    sampleChapter: { src: `${iconBase}/openBook.webp`, alt: '' },
    formats: [
      { src: `${iconBase}/openBook.webp`, alt: '' },
      { src: `${iconBase}/fa-microphone-papercut.webp`, alt: '' },
      { src: `${iconBase}/fa-file-upload-papercut.webp`, alt: '' },
      { src: `${iconBase}/fa-book-open-papercut.webp`, alt: '' },
    ],
  },
  hero: {
    eyebrow: 'Histórias de Apoio · leitura acompanhada',
    heading:
      'As grandes mudanças parecem mais pequenas quando a criança consegue ver a história que vem a seguir.',
    headline:
      'Crie um livro personalizado para antecipar uma mudança, abrir uma conversa ou guardar as memórias de alguém especial.',
    subheadline:
      'Escolha uma situação, acrescente apenas os detalhes que fazem sentido e reveja tudo com calma antes de ler, ouvir, partilhar ou imprimir.',
    imageSrc: `${assetBase}/hero/hero.jpeg`,
    imageAlt: 'Adulto e criança a lerem juntos o livro fictício A Primeira Manhã Corajosa da Sofia',
  },
  quickAnswer: {
    title: 'O que é uma História de Apoio?',
    body: 'É uma história personalizada, criada e revista por um adulto, que torna uma situação mais familiar através de pessoas, lugares, rotinas e memórias que a criança reconhece. Pode ser um ponto de partida para conversar — nunca um diagnóstico, tratamento ou substituto do apoio familiar, escolar ou profissional.',
  },
  intro: {
    title: 'Começar pelas palavras que a família já conhece',
    body: [
      'Uma despedida à porta da escola, o quarto do novo bebé, a cama tranquila do cão ou uma receita da avó podem transformar uma ideia abstrata numa sequência concreta.',
      'A história acompanha o ritmo da criança. O adulto pode parar, repetir, mudar uma frase e deixar perguntas para outro dia.',
    ],
  },
  whyThisFits: {
    title: 'Uma ferramenta criativa para ler em conjunto',
    body: [
      'A leitura partilhada cria um momento de baixa pressão em que a criança pode observar, perguntar ou simplesmente ouvir. A personalização ajuda a ligar a história ao seu quotidiano sem prometer um resultado emocional.',
      'Cada exemplo desta página é totalmente fictício. Serve para mostrar possibilidades de tom, idade e personalização, não para representar uma família ou experiência real.',
    ],
  },
  supportHub: {
    title: 'Que história faz sentido para este momento?',
    intro:
      'Há mudanças que pedem um mapa do que vem a seguir e outras que pedem espaço para recordar. Escolha a entrada mais próxima do momento da família.',
    paths: [
      {
        id: 'grow-and-change',
        title: 'Crescer e mudar',
        body: 'Escola, irmãos, animais, rotinas, mudanças, saúde, noite, amizades, bullying e duas casas. Histórias concretas, quentes e sem finais perfeitos obrigatórios.',
        ctaLabel: 'Preparar uma mudança',
        tone: 'warm',
      },
      {
        id: 'remember-and-say-goodbye',
        title: 'Recordar e dizer adeus',
        body: 'Memórias de um animal ou de alguém especial, com linguagem calma, crenças escolhidas pela família e liberdade para fazer uma pausa.',
        ctaLabel: 'Começar com uma memória',
        tone: 'calm',
      },
    ],
    challengesTitle: 'Escolha uma situação',
    challengesIntro:
      'A escolha serve apenas para orientar o início da história. Não enviamos o conteúdo do tema, nomes ou fotografias para plataformas publicitárias.',
    initialVisibleCount: 6,
    showMoreLabel: 'Ver todas as situações',
    showLessLabel: 'Mostrar apenas as prioritárias',
    challenges: [
      {
        id: 'first-school-day',
        pathId: 'grow-and-change',
        title: 'Primeiro dia de escola',
        ageRange: '2–8 anos',
        body: 'Tornar o percurso, a despedida, os espaços e o reencontro mais familiares.',
        primaryIntent: 'kids_transitions',
        priority: 1,
        iconSrc: `${iconBase}/fa-school-support-papercut.webp`,
        iconAlt: 'Ícone papercut de uma escola',
      },
      {
        id: 'new-sibling',
        pathId: 'grow-and-change',
        title: 'Chegada de um novo irmão',
        ageRange: '2–8 anos',
        body: 'Dar espaço ao entusiasmo, à espera e às emoções que podem aparecer juntas.',
        primaryIntent: 'kids_transitions',
        priority: 2,
        iconSrc: `${iconBase}/fa-baby-support-papercut.webp`,
        iconAlt: 'Ícone papercut de um bebé',
      },
      {
        id: 'new-dog',
        pathId: 'grow-and-change',
        title: 'Um novo cão em casa',
        ageRange: '3–9 anos',
        body: 'Ensaiar rotinas, descanso, aproximação calma e tarefas sempre supervisionadas.',
        primaryIntent: 'pet_stories',
        priority: 3,
        iconSrc: `${iconBase}/fa-dog-support-papercut.webp`,
        iconAlt: 'Ícone papercut de um cão',
      },
      {
        id: 'two-homes',
        pathId: 'grow-and-change',
        title: 'Separação e duas casas',
        ageRange: '3–10 anos',
        body: 'Mostrar duas casas com igual dignidade, sem culpa nem promessas de reconciliação.',
        primaryIntent: 'kids_transitions',
        priority: 4,
        iconSrc: `${iconBase}/fa-map-marked-alt-support-papercut.webp`,
        iconAlt: 'Ícone papercut de um mapa entre duas casas',
      },
      {
        id: 'remember-pet',
        pathId: 'remember-and-say-goodbye',
        title: 'Recordar um animal',
        ageRange: '3–12 anos',
        body: 'Guardar hábitos, fotografias e pequenas memórias sem apresentar outro animal como substituto.',
        primaryIntent: 'remembrance',
        priority: 5,
        iconSrc: `${iconBase}/fa-paw-support-papercut.webp`,
        iconAlt: 'Ícone papercut de uma pata',
      },
      {
        id: 'remember-someone',
        pathId: 'remember-and-say-goodbye',
        title: 'Recordar alguém especial',
        ageRange: '3–12 anos',
        body: 'Reunir histórias, vozes, objetos ou receitas com as crenças escolhidas pela família.',
        primaryIntent: 'remembrance',
        priority: 6,
        iconSrc: `${iconBase}/fa-photo-video-support-papercut.webp`,
        iconAlt: 'Ícone papercut de fotografias de memória',
      },
      {
        id: 'new-routines',
        pathId: 'grow-and-change',
        title: 'Novas rotinas',
        ageRange: '2–8 anos',
        body: 'Dividir uma rotina em pequenos passos, escolhas simples e tentativas sem vergonha.',
        primaryIntent: 'kids_transitions',
        priority: 7,
        iconSrc: `${iconBase}/fa-list-ol-support-papercut.webp`,
        iconAlt: 'Ícone papercut de uma lista de passos',
      },
      {
        id: 'moving-home-or-school',
        pathId: 'grow-and-change',
        title: 'Mudar de casa ou escola',
        ageRange: '3–10 anos',
        body: 'Ligar lugares antigos e novos através de mapas, objetos e rotinas que continuam.',
        primaryIntent: 'kids_transitions',
        priority: 8,
        iconSrc: `${iconBase}/fa-house-user-support-papercut.webp`,
        iconAlt: 'Ícone papercut de uma casa',
      },
      {
        id: 'medical-visit',
        pathId: 'grow-and-change',
        title: 'Médico, dentista ou hospital',
        ageRange: '3–10 anos',
        body: 'Mostrar apenas a sequência e as sensações confirmadas pela equipa responsável.',
        primaryIntent: 'kids_transitions',
        priority: 9,
        iconSrc: `${iconBase}/fa-stethoscope-support-papercut.webp`,
        iconAlt: 'Ícone papercut de um estetoscópio',
      },
      {
        id: 'night-fears',
        pathId: 'grow-and-change',
        title: 'Medos noturnos',
        ageRange: '2–8 anos',
        body: 'Repetir uma rotina calma sem tornar a ameaça mais vívida nem prometer sono.',
        primaryIntent: 'kids_transitions',
        priority: 10,
        iconSrc: `${iconBase}/fa-moon-support-papercut.webp`,
        iconAlt: 'Ícone papercut de uma lua',
      },
      {
        id: 'friendships',
        pathId: 'grow-and-change',
        title: 'Amizades e solidão',
        ageRange: '4–10 anos',
        body: 'Ensaiar um pequeno passo e vários finais possíveis sem garantir a resposta de outra criança.',
        primaryIntent: 'kids_transitions',
        priority: 11,
        iconSrc: `${iconBase}/fa-user-friends-support-papercut.webp`,
        iconAlt: 'Ícone papercut de duas pessoas amigas',
      },
      {
        id: 'bullying-help',
        pathId: 'grow-and-change',
        title: 'Bullying e pedir ajuda',
        ageRange: '6–12 anos',
        body: 'Retirar a culpa e identificar adultos e lugares seguros, sem reconstruir o alegado agressor.',
        primaryIntent: 'kids_transitions',
        priority: 12,
        iconSrc: `${iconBase}/fa-hands-helping-support-papercut.webp`,
        iconAlt: 'Ícone papercut de mãos que ajudam',
      },
    ],
  },
  carefulBenefits: {
    title: 'O que uma história personalizada pode fazer',
    items: [
      {
        title: 'Antecipar uma sequência',
        body: 'Mostrar pessoas, lugares, objetos e passos que a criança pode reconhecer.',
        iconSrc: `${iconBase}/fa-route-papercut.webp`,
        iconAlt: 'Ícone papercut de um percurso',
      },
      {
        title: 'Abrir uma conversa',
        body: 'Dar ao adulto frases e perguntas que pode adaptar ao ritmo da criança.',
        iconSrc: `${iconBase}/fa-users-papercut.webp`,
        iconAlt: 'Ícone papercut de pessoas',
      },
      {
        title: 'Guardar memórias',
        body: 'Reunir fotografias, hábitos, lugares, receitas ou palavras de família.',
        iconSrc: `${iconBase}/fa-camera-papercut.webp`,
        iconAlt: 'Ícone papercut de uma câmara',
      },
      {
        title: 'Aceitar mais do que um sentimento',
        body: 'A história não obriga a criança a ficar feliz, corajosa ou pronta.',
        iconSrc: `${iconBase}/fa-heart-papercut.webp`,
        iconAlt: 'Ícone papercut de um coração',
      },
      {
        title: 'Parar e rever',
        body: 'O adulto pode corrigir factos, retirar detalhes e continuar noutro momento.',
        iconSrc: `${iconBase}/fa-redo-alt-papercut.webp`,
        iconAlt: 'Ícone papercut de revisão',
      },
    ],
  },
  useCases: {
    title: 'O que pode fazer hoje',
    intro:
      'Estas sugestões gerais apoiam a conversa familiar; não substituem orientações específicas de uma escola, profissional de saúde ou serviço de apoio.',
    items: [
      {
        title: 'Pergunte por uma coisa concreta',
        body: 'Em vez de tentar resolver tudo, descubra qual é a pessoa, lugar, som ou momento que mais precisa de ser explicado.',
      },
      {
        title: 'Diga o que sabe — e o que ainda não sabe',
        body: 'Uma sequência honesta pode incluir mudanças de plano. Retire factos que ainda não estejam confirmados.',
      },
      {
        title: 'Preserve uma rotina pequena',
        body: 'Uma canção, um objeto, uma chamada ou a pessoa que vai buscar a criança pode criar continuidade.',
      },
      {
        title: 'Leia sem exigir uma reação',
        body: 'A criança pode querer falar, mudar de assunto ou voltar à mesma página várias vezes.',
      },
      {
        title: 'Peça apoio quando a situação o exige',
        body: 'Risco imediato, violência, abuso, sofrimento persistente ou instruções médicas precisam de apoio competente, não de uma história genérica.',
      },
    ],
  },
  personalization: {
    title: 'Personalize apenas o que ajuda a tornar a história familiar',
    intro:
      'Comece com poucos detalhes. Não é necessário incluir informação íntima para criar uma história reconhecível.',
    ctaLabel: 'Escolher uma situação',
    groups: [
      {
        title: 'Quem acompanha',
        body: 'Um ou mais adultos de confiança, com relação e forma de tratamento claras.',
        choices: ['Mãe', 'Pai', 'Avó ou avô', 'Educador', 'Outro adulto seguro'],
        iconSrc: `${iconBase}/fa-users-careful-group-papercut.webp`,
        iconAlt: 'Ícone papercut de um grupo familiar',
      },
      {
        title: 'O que a criança reconhece',
        body: 'Lugares, objetos, animais e pequenos rituais do quotidiano.',
        choices: ['Casa', 'Escola', 'Objeto de conforto', 'Animal', 'Rotina'],
        iconSrc: `${iconBase}/fa-house-user-support-papercut.webp`,
        iconAlt: 'Ícone papercut de uma casa',
      },
      {
        title: 'Tom da história',
        body: 'Escolha uma direção simples e adequada ao momento.',
        choices: ['Prático', 'Tranquilo', 'Memória'],
        iconSrc: `${iconBase}/fa-magic-papercut.webp`,
        iconAlt: 'Ícone papercut de brilho',
      },
      {
        title: 'O que não deve aparecer',
        body: 'Registe limites antes de criar e retire qualquer detalhe incerto.',
        choices: ['Nomes de terceiros', 'Factos por confirmar', 'Crenças não escolhidas'],
        iconSrc: `${iconBase}/fa-stop-papercut.webp`,
        iconAlt: 'Ícone papercut de parar',
      },
      {
        title: 'Como guardar',
        body: 'A história começa privada e só é partilhada por uma ação posterior.',
        choices: ['Leitura digital', 'Áudio', 'PDF', 'Livro impresso quando disponível'],
        iconSrc: `${iconBase}/fa-folder-papercut.webp`,
        iconAlt: 'Ícone papercut de uma pasta',
      },
    ],
  },
  booksSection: {
    title: 'Uma história diferente para cada tipo de momento',
  },
  books: [
    {
      id: 'book-01',
      title: 'A Primeira Manhã Corajosa da Sofia',
      synopsis:
        'Sofia percorre cada passo da manhã com o pai Miguel e descobre quem a espera na sala e quem regressa para a buscar.',
      excerpt: 'A mochila levava lápis, uma maçã e uma pergunta que ainda não sabia sair da boca.',
      imageSrc: `${bookBase}/a-primeira-manha-corajosa-da-sofia/feature.jpeg`,
      imageAlt: 'Livro físico A Primeira Manhã Corajosa da Sofia numa leitura acompanhada',
      styleLabel: 'Papercut digital',
      contextLabel: 'Primeiro dia',
      ageLabel: '3–6 anos',
      chapterCountLabel: 'Capítulo de amostra',
      durationLabel: 'Áudio 26 s',
      audioSampleSrc: `${bookBase}/a-primeira-manha-corajosa-da-sofia/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'O mapa da primeira manhã',
        imageSrc: `${bookBase}/a-primeira-manha-corajosa-da-sofia/cover.jpeg`,
        imageAlt: 'Capa ilustrada de A Primeira Manhã Corajosa da Sofia',
        paragraphs: [
          'Na véspera do primeiro dia, Sofia pôs a mochila no chão da sala e ficou a olhar para ela. Já lá estavam os lápis, a garrafa de água e o pequeno lenço amarelo que o pai Miguel tinha dobrado em quatro.',
          '“A escola tem muitas portas?”, perguntou. O pai não disse que não havia nada para recear. Abriu antes o mapa que tinham desenhado juntos: portão verde, corredor com janelas, sala da professora Inês e casa de banho junto à biblioteca.',
          'De manhã seguiram o mapa sem pressa. Sofia encontrou o portão verde e contou três janelas no corredor. Quando chegaram à sala, a professora Inês mostrou-lhe onde podia guardar o lenço amarelo.',
          'Na despedida, o pai repetiu a frase combinada: “Eu vou trabalhar, tu ficas com a professora Inês e volto depois do lanche e da história.” Sofia não sorriu logo. Apertou o lenço e entrou.',
          'Houve um momento em que o barulho das cadeiras pareceu demasiado grande. A professora apontou para o canto dos livros e Sofia escolheu esperar ali até o corpo ficar um pouco mais quieto.',
          'Depois da história, o pai apareceu no portão verde. No caminho para casa, perguntou apenas duas coisas: “O que reconheceste?” e “O que ainda queres pôr no mapa amanhã?”',
        ],
      },
    },
    {
      id: 'book-02',
      title: 'A Leonor Abre Espaço para o Amor',
      synopsis:
        'Leonor prepara a chegada do bebé Duarte sem ter de esconder que esperar, ouvir choro e partilhar atenção também pode ser difícil.',
      excerpt:
        'O amor podia crescer. A paciência, descobriu Leonor, precisava de pequenos intervalos.',
      imageSrc: `${bookBase}/a-leonor-abre-espaco-para-o-amor/feature.jpeg`,
      imageAlt: 'Livro físico A Leonor Abre Espaço para o Amor num quarto familiar',
      styleLabel: 'Desenho e colagem',
      contextLabel: 'Novo irmão',
      ageLabel: '3–6 anos',
      chapterCountLabel: 'Capítulo de amostra',
      durationLabel: 'Áudio 27 s',
      audioSampleSrc: `${bookBase}/a-leonor-abre-espaco-para-o-amor/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'Uma cadeira ao lado da janela',
        imageSrc: `${bookBase}/a-leonor-abre-espaco-para-o-amor/cover.jpeg`,
        imageAlt: 'Capa ilustrada de A Leonor Abre Espaço para o Amor',
        paragraphs: [
          'Leonor ajudou a escolher uma cadeira para o quarto do bebé Duarte. Escolheu a que ficava junto à janela, porque dali ainda conseguia ver a árvore onde os pardais faziam reuniões.',
          'A mãe explicou que o bebé choraria, dormiria muitas vezes e precisaria de colo. Leonor perguntou se ainda haveria colo para ela. “Haverá”, respondeu a mãe, “e podes dizer quando precisares.”',
          'No dia em que os adultos foram ao hospital, a avó Teresa ficou em casa. O pequeno-almoço, a ida ao jardim e a história antes de dormir continuaram nos lugares combinados.',
          'Quando Duarte chegou, Leonor quis vê-lo e depois quis ir brincar. Ninguém lhe pediu que fosse logo uma irmã feliz ou ajudante. Ela escolheu trazer uma manta e deixou o resto para outro dia.',
          'Nessa noite, o choro pareceu ocupar a casa inteira. Leonor tapou os ouvidos e disse que não gostava daquele som. O pai agradeceu-lhe por dizer a verdade e foram juntos até à cozinha beber água.',
          'Mais tarde, sentaram-se na cadeira junto à janela. Duarte dormia. Leonor viu os pardais e percebeu que abrir espaço não era perder o seu lugar. Era poder dizer o que sentia enquanto a família aprendia uma rotina nova.',
        ],
      },
    },
    {
      id: 'book-03',
      title: 'O Mateus e a Lua Aprendem Juntos',
      synopsis:
        'Mateus descobre que ensinar a cadela Lua também significa respeitar o descanso, repetir as mesmas palavras e pedir sempre ajuda a um adulto.',
      excerpt: 'A primeira regra não era “senta”. Era deixar a Lua chegar ao seu próprio ritmo.',
      imageSrc: `${bookBase}/o-mateus-e-a-lua-aprendem-juntos/feature.jpeg`,
      imageAlt: 'Livro físico O Mateus e a Lua Aprendem Juntos junto a uma família e um cão',
      styleLabel: 'Cartoon',
      contextLabel: 'Novo cão',
      ageLabel: '4–8 anos',
      chapterCountLabel: 'Capítulo de amostra',
      durationLabel: 'Áudio 28 s',
      audioSampleSrc: `${bookBase}/o-mateus-e-a-lua-aprendem-juntos/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'O cantinho sossegado da Lua',
        imageSrc: `${bookBase}/o-mateus-e-a-lua-aprendem-juntos/cover.jpeg`,
        imageAlt: 'Capa ilustrada de O Mateus e a Lua Aprendem Juntos',
        paragraphs: [
          'Quando Lua chegou, Mateus queria mostrar-lhe a casa toda de uma vez. A mãe pediu-lhe que se sentasse no chão e esperasse. Lua cheirou a porta, a mesa e, por fim, a ponta do sapato dele.',
          'Ao lado da cozinha havia uma cama macia. “Este é o cantinho sossegado”, explicou a mãe. “Quando a Lua está aqui, damos espaço. Até os amigos precisam de pausas.”',
          'No primeiro dia aprenderam apenas o nome. Mateus dizia “Lua” uma vez, a mãe ajudava e, quando ela olhava, recebia a recompensa aprovada pelo treinador.',
          'No segundo dia juntaram “senta”. No terceiro, praticaram vir quando chamavam. Mateus percebeu que repetir devagar funcionava melhor do que mudar a palavra ou levantar a voz.',
          'Houve também um sapato mordido e uma poça no corredor. A história não chamou Lua de má nem Mateus de mau treinador. Chamaram um adulto, limparam e voltaram ao plano.',
          'No quadro dos sete dias, Mateus desenhou uma lua pequena por cada tarefa feita com supervisão: água, passeio curto e brincadeira calma. O quadro não dizia “perfeito”. Dizia “a aprender juntos”.',
        ],
      },
    },
    {
      id: 'book-04',
      title: 'A Semana da Clara Tem Duas Cozinhas',
      synopsis:
        'Clara conhece o calendário, as rotinas e os objetos das duas casas sem ter de escolher uma como a casa mais importante.',
      excerpt:
        'As cozinhas eram diferentes. O lugar de Clara em cada uma delas não precisava de ser.',
      imageSrc: `${bookBase}/a-semana-da-clara-tem-duas-cozinhas/feature.jpeg`,
      imageAlt: 'Livro físico A Semana da Clara Tem Duas Cozinhas entre dois ambientes familiares',
      styleLabel: 'Aguarela',
      contextLabel: 'Duas casas',
      ageLabel: '4–8 anos',
      chapterCountLabel: 'Capítulo de amostra',
      durationLabel: 'Áudio 25 s',
      audioSampleSrc: `${bookBase}/a-semana-da-clara-tem-duas-cozinhas/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'O calendário com duas cores',
        imageSrc: `${bookBase}/a-semana-da-clara-tem-duas-cozinhas/cover.jpeg`,
        imageAlt: 'Capa ilustrada de A Semana da Clara Tem Duas Cozinhas',
        paragraphs: [
          'A mãe Sofia e o pai André sentaram-se com Clara à mesa. Disseram que tinham decidido viver em casas diferentes. Também disseram uma coisa que Clara precisava de ouvir mais do que uma vez: não tinha sido por causa dela.',
          'Na parede colocaram um calendário. Os dias na casa da mãe eram terracota; os dias na casa do pai eram azuis. A escola, o treino e a chamada de boa-noite ficavam marcados no mesmo lugar.',
          'Na primeira cozinha havia canecas amarelas. Na segunda, uma mesa junto à janela. Clara tinha uma escova de dentes, pijama e livros em cada casa para não carregar tudo às costas.',
          'Às vezes sentia saudades da casa onde não estava. Podia dizê-lo sem magoar o adulto que estava com ela. Os adultos tratavam das mensagens entre si; Clara não precisava de ser mensageira.',
          'Num dia, o plano mudou. O pai escreveu a nova combinação no calendário e explicou quem a iria buscar. A mudança não desapareceu, mas deixou de ser um segredo entre adultos.',
          'Clara continuava a ter perguntas. Nenhuma página prometia que os pais voltariam a viver juntos. O livro mostrava apenas o que era conhecido: duas casas, pessoas que cuidavam dela e um calendário que podia ser revisto.',
        ],
      },
    },
    {
      id: 'book-05',
      title: 'A Beatriz Recorda os Melhores Dias do Max',
      synopsis:
        'Beatriz reúne passeios, sons e fotografias do cão Max num livro de memórias que não lhe pede para deixar de sentir saudades.',
      excerpt:
        'Max já não corria até à porta, mas as histórias dos seus passos ainda sabiam o caminho.',
      imageSrc: `${bookBase}/a-beatriz-recorda-os-melhores-dias-do-max/feature.jpeg`,
      imageAlt: 'Livro físico A Beatriz Recorda os Melhores Dias do Max com fotografias de um cão',
      styleLabel: 'Lápis de cor',
      contextLabel: 'Memória de animal',
      ageLabel: '5–9 anos',
      chapterCountLabel: 'Capítulo de amostra',
      durationLabel: 'Áudio 28 s',
      audioSampleSrc: `${bookBase}/a-beatriz-recorda-os-melhores-dias-do-max/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'A fotografia do caminho comprido',
        imageSrc: `${bookBase}/a-beatriz-recorda-os-melhores-dias-do-max/cover.jpeg`,
        imageAlt: 'Capa ilustrada de A Beatriz Recorda os Melhores Dias do Max',
        paragraphs: [
          'Beatriz escolheu uma caixa azul para guardar as coisas de Max: a chapa com o nome, uma fotografia no parque e a bola que já quase não saltava.',
          'O pai explicou com palavras diretas que Max tinha morrido e que o corpo dele já não funcionava. Beatriz perguntou a mesma coisa em dias diferentes. O pai respondeu de novo, sem inventar uma resposta para acabar depressa.',
          'Na primeira página colaram a fotografia do caminho comprido, onde Max parava em todas as árvores. Beatriz escreveu: “Aqui demorávamos muito e isso era parte do passeio.”',
          'Na página seguinte desenhou o som das patas no corredor. Noutra, escreveu três coisas de que não gostava: a trela molhada, os pelos no sofá e quando Max lhe roubava as meias.',
          'Não fizeram uma página para dizer que a tristeza tinha terminado. Fizeram uma para escolher um ritual. Beatriz decidiu plantar uma erva cheirosa no vaso junto à janela.',
          'A caixa azul ficou numa prateleira ao alcance da família. Alguns dias abriam-na. Noutros, não. Recordar Max não obrigava Beatriz a sentir sempre a mesma coisa nem fazia de um novo animal uma substituição.',
        ],
      },
    },
    {
      id: 'book-06',
      title: 'O Tomás Guarda as Histórias de Domingo da Avó Teresa',
      synopsis:
        'Tomás transforma receitas, frases e domingos na casa da avó Teresa num livro familiar que distingue memória, imaginação e crença.',
      excerpt:
        'A receita tinha medidas. As histórias da avó mediam-se de outra maneira: pelo tempo que ficavam à mesa.',
      imageSrc: `${bookBase}/o-tomas-guarda-as-historias-de-domingo-da-avo-teresa/feature.jpeg`,
      imageAlt:
        'Livro físico O Tomás Guarda as Histórias de Domingo da Avó Teresa com receitas de família',
      styleLabel: 'Aguarela',
      contextLabel: 'Memória familiar',
      ageLabel: '6–10 anos',
      chapterCountLabel: 'Capítulo de amostra',
      durationLabel: 'Áudio 27 s',
      audioSampleSrc: `${bookBase}/o-tomas-guarda-as-historias-de-domingo-da-avo-teresa/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'A receita escrita a duas mãos',
        imageSrc: `${bookBase}/o-tomas-guarda-as-historias-de-domingo-da-avo-teresa/cover.jpeg`,
        imageAlt: 'Capa ilustrada de O Tomás Guarda as Histórias de Domingo da Avó Teresa',
        paragraphs: [
          'Ao domingo, a avó Teresa fazia sopa numa panela grande e contava histórias sem olhar para o relógio. Tomás dizia que as histórias começavam quando ela pousava a colher de pau.',
          'Depois de a avó morrer, a mãe explicou que o corpo dela tinha deixado de funcionar e que não voltariam a vê-la como antes. Tomás perguntou se ela ainda sabia a receita. A família respondeu de acordo com aquilo em que acreditava, sem apresentar a crença como um facto que todos tinham de aceitar.',
          'Na gaveta da cozinha encontraram um papel com metade da receita. As quantidades estavam escritas pela avó; ao lado havia espaço para as memórias de Tomás.',
          'Ele escreveu sobre o avental azul, o prato fundo e a frase “prova antes de dizer que falta sal”. A mãe acrescentou a história do dia em que a sopa ficou doce por engano.',
          'Na página seguinte, Tomás desenhou a cozinha como a recordava. O livro dizia claramente que aquela era uma memória, não uma visita nova da avó nem uma mensagem enviada depois da morte.',
          'No domingo seguinte fizeram a sopa. Não ficou igual. Tomás guardou essa diferença no livro também. As histórias de família não precisavam de repetir tudo perfeitamente para continuarem a ser partilhadas.',
        ],
      },
    },
  ],
  process: {
    title: 'Como criar com calma',
    steps: [
      'Escolha uma situação e confirme que é adequado começar agora.',
      'Acrescente nomes, pessoas seguras, lugares, rotinas ou memórias — sem dados desnecessários.',
      'Escolha um tom e um estilo visual adequados à idade.',
      'Leia e corrija factos, linguagem, crenças e detalhes sensíveis.',
      'Só depois decida se quer ler, ouvir, partilhar em privado ou usar um formato de impressão disponível.',
    ],
  },
  formats: {
    title: 'Formatos que acompanham a família',
    items: [
      'Leitura digital privada.',
      'Audiolivro narrado quando solicitado.',
      'PDF para autoimpressão quando disponível.',
      'Livro impresso conforme disponibilidade e destino.',
    ],
  },
  faq: [
    {
      question: 'O que é uma História de Apoio Mythoria?',
      answer:
        'É um livro personalizado criado a partir da situação, das pessoas e dos pequenos detalhes que a criança reconhece. Ao ver o seu mundo dentro da história, a família ganha um ponto de partida familiar para ler, fazer perguntas e conversar ao seu ritmo.',
    },
    {
      question: 'Em que momentos pode ser útil criar uma história personalizada?',
      answer:
        'Pode ajudar a preparar mudanças como o primeiro dia de escola, uma mudança de casa, a chegada de um irmão ou a separação dos pais. Também pode dar forma a conversas sobre bullying, doença, a perda de uma pessoa ou animal e memórias que a família quer guardar.',
    },
    {
      question: 'Como pode um livro ajudar a falar sobre um tema difícil?',
      answer:
        'Nem sempre é fácil encontrar a primeira frase. Uma história cria uma linguagem comum: a criança pode reconhecer uma situação, antecipar o que vem a seguir, parar numa página, fazer uma pergunta ou simplesmente ouvir. A conversa pode continuar durante a leitura ou mais tarde, sem pressa.',
    },
    {
      question: 'Preciso de saber escrever ou de ter a história toda pensada?',
      answer:
        'Não. Pode começar com uma frase, uma memória, algumas notas ou uma ideia dita por voz. A Mythoria ajuda a transformar essa faísca numa história ilustrada; depois, pode rever o texto, ajustar o tom e alterar o que não soar verdadeiro para a sua família.',
    },
    {
      question: 'O que posso personalizar na história?',
      answer:
        'Pode incluir o nome e a idade da criança, pessoas de confiança, animais, lugares, rotinas, objetos de conforto, frases de família e memórias reais. Também escolhe o tom, a linguagem e o estilo das ilustrações para criar um livro que pareça verdadeiramente próximo.',
    },
    {
      question: 'A história pode ser adaptada à idade da criança?',
      answer:
        'Sim. A idade e o nível de leitura ajudam a ajustar o vocabulário, o comprimento das frases, o ritmo e a forma de explicar cada momento. Para crianças mais pequenas, o livro também pode ser pensado para leitura partilhada por um adulto.',
    },
    {
      question: 'Posso escolher como o livro aborda um tema delicado?',
      answer:
        'Sim. Pode indicar o que deve aparecer, o que prefere não incluir e a linguagem que a família costuma usar. Em temas como separação, doença ou morte, pode ainda orientar factos, crenças familiares e palavras importantes, revendo tudo antes da primeira leitura.',
    },
    {
      question: 'A criança pode participar na criação?',
      answer:
        'Pode participar de forma simples e acompanhada: escolher o nome da personagem, um animal, um objeto especial, uma cor ou o estilo das imagens. O adulto mantém a conta e a revisão final, enquanto a criança ajuda a tornar o livro reconhecível e seu.',
    },
    {
      question: 'É obrigatório usar fotografias da criança?',
      answer:
        'Não. Pode criar uma personagem totalmente ilustrada a partir de uma descrição. Se quiser usar fotografias, escolha apenas imagens que pode utilizar e reveja-as antes de guardar ou partilhar a história.',
    },
    {
      question: 'Posso rever e alterar a história antes de a partilhar?',
      answer:
        'Sim — o controlo final é seu. Pode corrigir factos, trocar palavras, retirar detalhes, ajustar o tom e rever as ilustrações. Assim, a primeira leitura acontece com uma versão em que a família se reconhece e se sente confortável.',
    },
    {
      question: 'A história fica privada?',
      answer:
        'Sim. Cada história começa privada na sua conta. Só é partilhada se decidir fazê-lo, por exemplo através de uma ligação enviada a alguém da família, e pode rever primeiro nomes, fotografias e outros detalhes pessoais.',
    },
    {
      question: 'Como posso ler, ouvir ou guardar o livro?',
      answer:
        'Pode ler a história no telemóvel, tablet ou computador, criar uma versão narrada e partilhá-la em privado. Também pode preparar um PDF para imprimir ou encomendar um livro físico, conforme os formatos disponíveis para a história e o destino.',
    },
  ],
  finalCta: {
    title: 'Comece por uma situação. Acrescente apenas o que ajuda.',
    body: 'Uma pessoa segura, um lugar familiar ou uma memória pequena podem ser suficientes para começar. O resto pode ser revisto com calma.',
  },
  structuredData: {
    about: [
      'Histórias personalizadas para crianças',
      'Mudanças na infância',
      'Leitura partilhada',
      'Livros de memória para famílias',
    ],
    serviceName: 'Histórias de Apoio Mythoria',
    serviceType: 'Histórias personalizadas para leitura acompanhada em família',
    includeProduct: false,
  },
};
