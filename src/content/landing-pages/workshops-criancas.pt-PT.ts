import type { LandingPageContent } from './types';

const slug = 'workshops-criancas';
const assetBase = `/landing-pages/${slug}/assets`;
const sampleBookBase = `${assetBase}/sample-books`;
const iconBase = '/Papercut_icons';

export const workshopsChildrenLandingPage: LandingPageContent = {
  slug,
  locale: 'pt-PT',
  title: 'Workshops Mythoria para crianças',
  metaTitle: 'Workshops para crianças, ATL e ateliers | Mythoria',
  metaDescription:
    'Workshops de escrita criativa, ilustração e livros personalizados para ATL, ateliers, bibliotecas, escolas e campos de férias.',
  primaryIntent: 'children_workshops_atl',
  riskRating: 'green',
  updatedAt: '2026-06-16',
  indexable: true,
  breadcrumbLabel: 'Workshops para crianças',
  ogImageSrc: `${assetBase}/hero/og-cover.jpg`,
  primaryCta: 'Quero oferecer esta atividade no meu ATL',
  primaryCtaHref: `/pt-PT/contactUs?topic=workshops&landingSlug=${slug}`,
  secondaryCta: 'Ver atividades por idade',
  secondaryCtaHref: '#atividades-idade',
  templateIcons: {
    heroEyebrow: {
      src: `${iconBase}/sparkles.webp`,
      alt: '',
    },
    ctaArrow: {
      src: `${iconBase}/fa-chevron-right-papercut.webp`,
      alt: '',
    },
    quickAnswer: {
      src: `${iconBase}/fa-check-papercut.webp`,
      alt: '',
    },
    audioSample: {
      src: `${iconBase}/fa-microphone-papercut.webp`,
      alt: '',
    },
    sampleChapter: {
      src: `${iconBase}/openBook.webp`,
      alt: '',
    },
    professionalPanel: {
      src: `${iconBase}/fa-heart-business-family-papercut.png`,
      alt: '',
    },
    formats: [
      {
        src: `${iconBase}/openBook.webp`,
        alt: '',
      },
      {
        src: `${iconBase}/fa-microphone-papercut.webp`,
        alt: '',
      },
      {
        src: `${iconBase}/fa-file-upload-papercut.webp`,
        alt: '',
      },
      {
        src: `${iconBase}/fa-book-open-papercut.png`,
        alt: '',
      },
    ],
  },
  booksSection: {
    eyebrow: 'Exemplos de demonstração',
    title: 'Livros que mostram o resultado aos pais',
    intro:
      'Estes exemplos ajudam a visualizar o que uma criança pode criar numa sessão: uma história com ideias suas, pronta para ler, ouvir ou partilhar em família.',
  },
  hero: {
    eyebrow: 'Para ATL, ateliers, bibliotecas e programas de férias',
    headline: 'Transforme uma atividade infantil num atelier de criação de livros.',
    subheadline:
      'As crianças desenham, imaginam personagens, escolhem estilos e terminam com uma história personalizada que pode ser lida, ouvida, partilhada, impressa em PDF ou transformada em livro físico.',
    imageSrc: `${assetBase}/hero/workshop-desenho-livro.jpg`,
    imageAlt:
      'Crianças num atelier a desenhar um dragão, com um monitor a fotografar o desenho e um livro ilustrado aberto na mesa',
  },
  quickAnswer: {
    title: 'A ideia em poucas palavras',
    body: 'O Mythoria transforma desenho, texto, fotografia ou voz numa história personalizada. A criança decide, o monitor orienta e a tecnologia ajuda a dar forma ao livro final.',
  },
  intro: {
    title: 'Uma atividade completa, simples de preparar',
    body: [
      'Funciona em férias escolares, tardes temáticas, eventos culturais e programas de leitura. Junta desenho, escrita, imaginação, colaboração e literacia digital com orientação adulta.',
      'Pode durar uma hora, meio dia ou um dia inteiro, em formato individual, pares, grupos por mesa ou história coletiva.',
    ],
  },
  whyThisFits: {
    title: 'Porque os pais valorizam o resultado',
    body: [
      'No fim, a criança leva mais do que uma memória da atividade. Leva uma história criada a partir das suas ideias, com personagens e estilo escolhidos por si.',
      'Para as famílias, o valor é claro: um livro para ler em casa, oferecer aos avós, ouvir em audiobook ou guardar como recordação.',
    ],
  },
  workshop: {
    audiences: {
      title: 'Para que espaços foi pensado',
      intro:
        'A atividade adapta-se a equipas que precisam de propostas educativas, fáceis de explicar aos pais e com um resultado visível no fim.',
      items: [
        {
          title: 'ATL e centros de estudo',
          body: 'Uma oficina orientada, com passos claros, para férias escolares ou tardes temáticas.',
          iconSrc: `${iconBase}/fa-chalkboard-teacher-papercut.webp`,
          iconAlt: 'Ícone papercut de monitor junto a quadro',
        },
        {
          title: 'Campos de férias',
          body: 'Pode ser uma sessão curta, meio dia criativo ou um dia dedicado à criação de livros.',
          iconSrc: `${iconBase}/fa-route-papercut.webp`,
          iconAlt: 'Ícone papercut de percurso com dois marcadores',
        },
        {
          title: 'Bibliotecas e livrarias',
          body: 'Liga leitura, escrita e apresentação oral num formato fácil de divulgar às famílias.',
          iconSrc: `${iconBase}/fa-book-open-papercut.png`,
          iconAlt: 'Ícone papercut de livro aberto',
        },
        {
          title: 'Ateliers criativos',
          body: 'Começa no desenho, passa pela narrativa e termina num objeto digital ou imprimível.',
          iconSrc: `${iconBase}/PaperAndPencil.webp`,
          iconAlt: 'Ícone papercut de papel e lápis',
        },
        {
          title: 'Escolas e turmas',
          body: 'Ajuda a trabalhar enredo, personagens, revisão e leitura em voz alta.',
          iconSrc: `${iconBase}/fa-school-papercut.webp`,
          iconAlt: 'Ícone papercut de escola',
        },
        {
          title: 'Museus e eventos familiares',
          body: 'Transforma uma visita, exposição ou tema local numa história criada pelas crianças.',
          iconSrc: `${iconBase}/sparkles.webp`,
          iconAlt: 'Ícone papercut de brilhos',
        },
      ],
    },
    paperToBook: {
      title: 'Do papel ao livro, passo a passo',
      body: 'A criança pode começar com uma ilha, um dragão, uma escola secreta ou uma família de exploradores. O monitor fotografa o desenho, recolhe escolhas e o Mythoria transforma essa semente numa história ilustrada.',
      imageSrc: `${assetBase}/hero/workshop-paper-to-book-iphone.jpg`,
      imageAlt:
        'Crianças num workshop a desenhar em papel, com um livro infantil ilustrado ao lado de um desenho de dragão',
      steps: [
        {
          title: 'Desenho em papel',
          body: 'A criança desenha uma personagem, cenário, objeto mágico ou problema.',
          iconSrc: `${iconBase}/PaperAndPencil.webp`,
          iconAlt: 'Ícone papercut de papel e lápis',
        },
        {
          title: 'Fotografia ou ideia falada',
          body: 'O monitor usa imagem, texto ou áudio como ponto de partida.',
          iconSrc: `${iconBase}/fa-camera-papercut.webp`,
          iconAlt: 'Ícone papercut de câmara',
        },
        {
          title: 'Personagens',
          body: 'Entram amigos, família, animais, vilões, mentores ou objetos mágicos.',
          iconSrc: `${iconBase}/characters.webp`,
          iconAlt: 'Ícone papercut de personagens',
        },
        {
          title: 'Estilo e enredo',
          body: 'O grupo escolhe aventura, mistério, fantasia, humor, diário ou fábula.',
          iconSrc: `${iconBase}/Color_pallete.webp`,
          iconAlt: 'Ícone papercut de paleta de cores',
        },
        {
          title: 'História criada',
          body: 'O Mythoria organiza as escolhas numa história com início, meio e fim.',
          iconSrc: `${iconBase}/openBook.webp`,
          iconAlt: 'Ícone papercut de livro aberto',
        },
        {
          title: 'Leitura e revisão',
          body: 'A turma lê, comenta, ajusta títulos e escolhe capa ou imagens.',
          iconSrc: `${iconBase}/fa-microphone-papercut.webp`,
          iconAlt: 'Ícone papercut de microfone',
        },
        {
          title: 'Livro para casa',
          body: 'A história pode seguir como link, PDF, audiobook ou livro físico.',
          iconSrc: `${iconBase}/fa-certificate-papercut.webp`,
          iconAlt: 'Ícone papercut de certificado',
        },
      ],
    },
    ageActivities: {
      title: 'Atividades por idade',
      intro:
        'O mesmo formato adapta-se ao desenvolvimento do grupo: mais visual e oral nos mais novos, mais estruturado e autoral nos adolescentes.',
      items: [
        {
          ageRange: '6-8 anos',
          title: 'Do desenho à história',
          objective: 'Transformar imaginação visual em narrativa simples.',
          activitySteps: [
            'Desenhar uma personagem ou cenário.',
            'Fotografar o desenho.',
            'Escolher herói, problema e final.',
          ],
          concepts: ['Início, meio e fim.', 'Herói e lugar da história.', 'Desenho e texto.'],
          exampleTitle: 'O Monstro que Saiu do Meu Desenho',
          exampleBody:
            'O Tomás desenha um monstro simpático. Quando o desenho ganha vida, os dois procuram a porta certa para o Reino das Cores.',
          imageSrc: `${assetBase}/books/book-01-monstro-desenho.jpg`,
          imageAlt:
            'Capa ilustrativa sem texto para O Monstro que Saiu do Meu Desenho, com uma criatura simpática a sair de um desenho infantil',
        },
        {
          ageRange: '9-12 anos',
          title: 'A minha aventura tem regras',
          objective: 'Trabalhar enredo, conflito e escolhas criativas.',
          activitySteps: [
            'Escolher género e cenário.',
            'Definir protagonista e obstáculo.',
            'Criar três momentos-chave da história.',
          ],
          concepts: ['Enredo e conflito.', 'Personagens.', 'Revisão criativa.'],
          exampleTitle: 'A Sociedade Secreta dos Guarda-Chuvas Azuis',
          exampleBody:
            'Quatro amigos descobrem que guarda-chuvas esquecidos são portais para cidades onde nunca chove.',
          imageSrc: `${assetBase}/books/book-02-guarda-chuvas.jpg`,
          imageAlt:
            'Capa ilustrativa sem texto para A Sociedade Secreta dos Guarda-Chuvas Azuis, com crianças e guarda-chuvas diante de um portal',
        },
        {
          ageRange: '13-16 anos',
          title: 'Laboratório de narrativa',
          objective: 'Explorar voz narrativa, tema, estilo e reescrita.',
          activitySteps: [
            'Escolher tema e voz narrativa.',
            'Criar personagens com motivações.',
            'Rever uma cena e apresentar o pitch.',
          ],
          concepts: ['Ponto de vista.', 'Arco da personagem.', 'Uso responsável de tecnologia.'],
          exampleTitle: 'Manual para Sobreviver a uma Cidade que Lê Pensamentos',
          exampleBody:
            'Numa Lisboa do futuro, uma adolescente escreve uma história que a cidade não consegue prever.',
          imageSrc: `${assetBase}/books/book-03-cidade-pensamentos.jpg`,
          imageAlt:
            'Capa ilustrativa sem texto para Manual para Sobreviver a uma Cidade que Lê Pensamentos, com uma adolescente a escrever numa cidade futura',
        },
      ],
    },
    learningOutcomes: {
      title: 'O que as crianças aprendem',
      intro:
        'A oficina transforma conceitos de escrita criativa em escolhas concretas que as crianças conseguem experimentar e discutir.',
      items: [
        {
          title: 'Criatividade',
          body: 'Começam por uma ideia, desenho, fotografia, personagem ou problema.',
          iconSrc: `${iconBase}/fa-magic-papercut.webp`,
          iconAlt: 'Ícone papercut de magia criativa',
        },
        {
          title: 'Estrutura narrativa',
          body: 'Percebem início, desenvolvimento, conflito e final.',
          iconSrc: `${iconBase}/fa-route-papercut.webp`,
          iconAlt: 'Ícone papercut de percurso narrativo',
        },
        {
          title: 'Leitura',
          body: 'Leem uma história que nasceu das suas próprias escolhas.',
          iconSrc: `${iconBase}/openBook.webp`,
          iconAlt: 'Ícone papercut de livro aberto',
        },
        {
          title: 'Revisão',
          body: 'Ajustam títulos, frases, personagens, cenas ou imagens.',
          iconSrc: `${iconBase}/fa-pencil-alt-papercut.webp`,
          iconAlt: 'Ícone papercut de lápis',
        },
        {
          title: 'Expressão oral',
          body: 'Apresentam a história ao grupo e praticam leitura em voz alta.',
          iconSrc: `${iconBase}/fa-microphone-papercut.webp`,
          iconAlt: 'Ícone papercut de microfone',
        },
        {
          title: 'Literacia digital',
          body: 'Usam tecnologia como ferramenta criativa, com orientação adulta.',
          iconSrc: `${iconBase}/fa-mouse-pointer-papercut.webp`,
          iconAlt: 'Ícone papercut de interação digital',
        },
      ],
    },
    workshopFormats: {
      title: 'Formatos de workshop',
      intro:
        'A mesma atividade pode ser adaptada ao tempo disponível, à idade das crianças e ao resultado que pretende entregar.',
      items: [
        {
          title: 'Workshop curto',
          duration: '60 a 90 minutos',
          idealFor: 'Bibliotecas, livrarias, museus, feiras e eventos pontuais.',
          result: 'História curta, capa simples, leitura final e link digital ou PDF.',
        },
        {
          title: 'Meio dia',
          duration: '3 horas',
          idealFor: 'ATL, centros de estudo, escolas e programas de férias.',
          result: 'História com personagens, estilo visual, leitura em grupo e PDF.',
        },
        {
          title: 'Dia completo',
          duration: '1 dia',
          idealFor: 'Campos de férias, academias criativas e associações culturais.',
          result: 'História estruturada, capa, ilustrações, revisão e apresentação final.',
        },
      ],
    },
    businessBenefits: {
      title: 'Porque valoriza o seu programa de férias',
      intro:
        'Uma atividade com uma promessa simples para comunicar: cada criança cria uma história sua e termina com algo que pode mostrar em casa.',
      items: [
        {
          title: 'Diferenciação imediata',
          body: 'Poucas atividades permitem que a criança saia com um livro criado a partir das suas ideias.',
          iconSrc: `${iconBase}/fa-star-business-differentiation-papercut.webp`,
          iconAlt: 'Ícone papercut de estrela',
        },
        {
          title: 'Adapta-se a várias idades',
          body: 'Os mais novos começam com desenho e oralidade. Os adolescentes trabalham voz, tema e revisão.',
          iconSrc: `${iconBase}/fa-child-business-ages-papercut.webp`,
          iconAlt: 'Ícone papercut de criança',
        },
        {
          title: 'Resultado tangível para os pais',
          body: 'A família vê uma história concreta, partilhável e potencialmente imprimível.',
          iconSrc: `${iconBase}/fa-gift-business-result-papercut.webp`,
          iconAlt: 'Ícone papercut de presente',
        },
        {
          title: 'Criativa, educativa e tecnológica',
          body: 'Liga escrita, leitura, ilustração e literacia digital sem pôr a tecnologia no centro.',
          iconSrc: `${iconBase}/fa-laptop-code-business-tech-papercut.webp`,
          iconAlt: 'Ícone papercut de computador',
        },
        {
          title: 'Boa para partilha familiar',
          body: 'A história pode incluir pais, avós, irmãos, amigos ou animais de estimação.',
          iconSrc: `${iconBase}/fa-heart-business-family-papercut.png`,
          iconAlt: 'Ícone papercut de coração familiar',
        },
        {
          title: 'Pode gerar complemento de receita',
          body: 'PDF, audiobook ou livro físico podem ser vendidos como extra, quando fizer sentido.',
          iconSrc: `${iconBase}/fa-coins-business-revenue-papercut.webp`,
          iconAlt: 'Ícone papercut de moedas',
        },
        {
          title: 'Funciona em grupo',
          body: 'Uma mesa, turma ou grupo pode criar uma história coletiva com decisões distribuídas.',
          iconSrc: `${iconBase}/fa-users-business-group-papercut.webp`,
          iconAlt: 'Ícone papercut de grupo',
        },
        {
          title: 'Repete com novos temas',
          body: 'Verão, Natal, ciência, ambiente, cidade, família, animais ou aventuras locais.',
          iconSrc: `${iconBase}/fa-sync-alt-business-repeat-papercut.png`,
          iconAlt: 'Ícone papercut de repetição',
        },
      ],
    },
    implementationKit: {
      title: 'Materiais que ajudam a lançar a atividade',
      intro:
        'Podemos ajudar a transformar a oficina numa proposta simples de divulgar, preparar e repetir.',
      items: [
        {
          title: 'Guia para monitores',
          body: 'Um roteiro para preparar sala, recolher ideias, orientar escolhas, rever e apresentar.',
          iconSrc: `${iconBase}/fa-info-circle-papercut.webp`,
          iconAlt: 'Ícone papercut de informação',
        },
        {
          title: 'Certificado imprimível',
          body: 'Uma peça para a criança levar: "Criei o meu primeiro livro".',
          iconSrc: `${iconBase}/fa-certificate-papercut.webp`,
          iconAlt: 'Ícone papercut de certificado',
        },
        {
          title: 'Cartaz para famílias',
          body: 'Uma imagem simples para divulgar a oficina no ATL, biblioteca ou escola.',
          iconSrc: `${iconBase}/fa-image-papercut.webp`,
          iconAlt: 'Ícone papercut de imagem',
        },
        {
          title: 'Códigos de parceiro',
          body: 'Permitem ligar a sessão no espaço ao uso continuado pela família em casa.',
          iconSrc: `${iconBase}/fa-gift-papercut.webp`,
          iconAlt: 'Ícone papercut de presente',
        },
      ],
    },
    finalResults: {
      title: 'O resultado final pode continuar em casa',
      intro:
        'A experiência não precisa de terminar no fim da sessão. A história pode viver no telemóvel, no papel, na voz ou na estante.',
      items: [
        {
          title: 'Livro digital',
          body: 'Para ler no telemóvel, tablet ou computador.',
          iconSrc: `${iconBase}/openBook.webp`,
          iconAlt: 'Ícone papercut de livro aberto',
        },
        {
          title: 'Audiobook',
          body: 'Para ouvir a história em família ou numa sessão de grupo.',
          iconSrc: `${iconBase}/fa-microphone-papercut.webp`,
          iconAlt: 'Ícone papercut de microfone',
        },
        {
          title: 'PDF/self-print',
          body: 'Para impressão local quando precisa de uma entrega física rápida.',
          iconSrc: `${iconBase}/fa-file-upload-papercut.webp`,
          iconAlt: 'Ícone papercut de ficheiro',
        },
        {
          title: 'Livro físico',
          body: 'Uma opção especial para famílias, quando disponível para a morada.',
          iconSrc: `${iconBase}/fa-book-open-papercut.png`,
          iconAlt: 'Ícone papercut de livro aberto',
        },
      ],
    },
  },
  carefulBenefits: {
    title: 'Uma atividade que junta criatividade, leitura e conquista',
    items: [
      {
        title: 'Fácil de explicar às famílias.',
        body: '',
        iconSrc: `${iconBase}/fa-bullhorn-careful-explain-papercut.webp`,
        iconAlt: 'Ícone papercut de megafone',
      },
      {
        title: 'Adaptável a crianças dos 6 aos 16 anos.',
        body: '',
        iconSrc: `${iconBase}/fa-child-careful-ages-papercut.webp`,
        iconAlt: 'Ícone papercut de criança',
      },
      {
        title: 'Funciona em grupo, pares ou individualmente.',
        body: '',
        iconSrc: `${iconBase}/fa-users-careful-group-papercut.webp`,
        iconAlt: 'Ícone papercut de grupo',
      },
      {
        title: 'Começa com desenho, texto, imagem ou voz.',
        body: '',
        iconSrc: `${iconBase}/fa-pencil-alt-careful-input-papercut.webp`,
        iconAlt: 'Ícone papercut de lápis',
      },
      {
        title: 'Termina num resultado que se pode mostrar.',
        body: '',
        iconSrc: `${iconBase}/fa-award-careful-result-papercut.webp`,
        iconAlt: 'Ícone papercut de medalha',
      },
    ],
  },
  books: [
    {
      id: 'book-01',
      title: 'O Gato que Guardava a Lua',
      synopsis:
        'Exemplo para os 5-7 anos, criado a partir de um desenho de animal de estimação. Mostra como uma ideia pequena pode virar uma história calorosa, visual e fácil de ler em voz alta.',
      excerpt:
        'O Nilo sentou-se muito direito, como os guardas dos castelos nos livros. Só que, em vez de espada, tinha bigodes.',
      imageSrc: `${sampleBookBase}/o-gato-que-guardava-a-lua/feature.jpeg`,
      imageAlt:
        'Livro físico O Gato que Guardava a Lua numa mesa de workshop, ao lado de desenho infantil e lápis de cor',
      styleLabel: 'Lápis de cor',
      contextLabel: '5-7 anos',
      chapterCountLabel: '4 capítulos',
      durationLabel: 'Áudio 34 s',
      audioSampleSrc: `${sampleBookBase}/o-gato-que-guardava-a-lua/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'A lua no tapete azul',
        imageSrc: `${sampleBookBase}/o-gato-que-guardava-a-lua/chapter-01.jpeg`,
        imageAlt:
          'Ilustração do capítulo de O Gato que Guardava a Lua, com um gato numa varanda a guardar uma lua brilhante',
        paragraphs: [
          'A Inês desenhou o Nilo com três lápis: cinzento para o corpo, branco para o peito e amarelo para os olhos. Depois fez uma lua redonda, tão redonda que quase parecia uma bolacha de manteiga. A lua ficou no canto da folha, encostada às patas do gato.',
          '- Agora falta uma coisa - disse a Inês.',
          'O monitor do workshop inclinou-se um bocadinho. - Falta o quê?',
          '- Falta saber se a lua caiu ou se o Nilo a apanhou.',
          'Na folha, o Nilo continuava muito quieto. Tinha bigodes compridos, cauda enrolada e uma expressão séria, como se soubesse uma resposta que mais ninguém sabia. A Inês pegou no lápis azul e desenhou um tapete debaixo dele. O tapete ficou cheio de risquinhos, porque a Inês gostava de tapetes que pareciam mar.',
          'Nessa noite, quando a história começou, o tapete azul mexeu-se devagarinho. Primeiro fez uma onda pequena. Depois fez outra. Depois a lua desenhada soltou um brilho tão suave que nem acordou as plantas da varanda. O Nilo abriu um olho. Abriu o outro. Espreguiçou as patas da frente e tocou na lua com a ponta de uma unha.',
          '- Miau? - perguntou ele, que em língua de gato queria dizer: "Quem deixou isto aqui?"',
          'A lua respondeu com um brilho redondo. O Nilo sentou-se muito direito, como os guardas dos castelos nos livros. Só que, em vez de espada, tinha bigodes. E, em vez de castelo, tinha uma lua a fazer cócegas nas patas.',
          '- Muito bem - disse ele. - Se caíste aqui, eu guardo-te.',
          'A lua tentou rolar para o vaso do manjerico. O Nilo empurrou-a para trás com cuidado. - Nada disso. As luas não se escondem em vasos. Depois cheiram a sopa.',
          'A lua tentou rolar para baixo da cadeira. O Nilo deitou-se à frente dela. - Também não. As luas debaixo das cadeiras apanham pó.',
          'Então a lua ficou quieta. O Nilo aproximou o focinho e viu, lá dentro, uma coisa pequenina a mexer: uma escada de luz, uma janela aberta e uma estrela com ar preocupado.',
          '- Ah - disse o Nilo. - Afinal não és uma bola. És uma casa.',
          'A estrela lá dentro acenou. Parecia dizer que precisava de voltar ao céu antes de o dia chegar. O Nilo olhou para cima. A varanda tinha grades seguras, o céu tinha nuvens e Lisboa dormia com as janelas meio douradas. Era alto demais para um salto. Até para um gato com muita opinião.',
          'O Nilo pensou. Depois viu os peixes de papel que a Inês tinha recortado para colar no desenho. Um peixe azul estava preso ao canto da folha. Um peixe cor-de-laranja dormia junto ao lápis amarelo. Um peixe verde parecia pronto para nadar.',
          '- Peixes - chamou o Nilo. - Hoje vamos ser pássaros.',
          'Os peixes de papel estremeceram. Descolaram-se devagarinho e fizeram uma fila no ar. O Nilo prendeu a lua com um fio de lã que tinha fugido da manta. Os peixes seguraram o fio com as barbatanas. Um puxou, dois puxaram, três puxaram, e a lua subiu um bocadinho.',
          '- Mais alto - disse a estrela lá dentro.',
          'O Nilo empurrou por baixo com a cabeça. A lua subiu até à mesa, depois até à cadeira, depois até à grade da varanda. A cidade lá em baixo parecia feita de migalhas de luz.',
          'Foi então que a Inês apareceu à porta, de pijama e olhos sonolentos. - Nilo?',
          'O gato congelou. Os peixes congelaram. A lua tentou fingir que era apenas uma bola normal, mas brilhou demais.',
          'A Inês sorriu. - Foste tu que guardaste a lua?',
          'O Nilo endireitou os bigodes. Não sabia se devia responder. Gatos não costumam explicar trabalhos importantes.',
          'A Inês aproximou-se sem pressa e segurou no fio de lã. - Então eu ajudo.',
          'Juntos, menina, gato e peixes de papel levantaram a lua até ela tocar na primeira nuvem. A estrela lá dentro abriu a janela. A lua encaixou no céu com um som baixinho: plim.',
          'Quando tudo voltou ao lugar, a folha da Inês tinha mudado. O desenho já não mostrava apenas um gato e uma lua. Mostrava também três peixes voadores, um fio de lã e uma menina de pijama a sorrir.',
          'No dia seguinte, no workshop, a Inês apontou para a folha. - Afinal a minha história é sobre guardar uma coisa bonita até ela encontrar o caminho.',
          'O monitor escreveu essa frase no quadro. O Nilo, em casa, dormia no tapete azul com ar inocente. Mas, se alguém reparasse bem, veria um bocadinho de luar preso no bigode esquerdo.',
        ],
      },
    },
    {
      id: 'book-02',
      title: 'A Final do Bairro das Estrelas',
      synopsis:
        'Exemplo para os 8-10 anos, criado a partir de uma ideia sobre futebol. Mostra como desporto, regras e colaboração podem transformar-se numa aventura de equipa.',
      excerpt:
        'A bola não brilhou quando Rui tentou fintar toda a gente. Só acendeu quando passou para a Mia, que estava livre junto ao muro das constelações.',
      imageSrc: `${sampleBookBase}/a-final-do-bairro-das-estrelas/feature.jpeg`,
      imageAlt:
        'Livro físico A Final do Bairro das Estrelas numa mesa de workshop, junto a bola e desenho de táticas',
      styleLabel: 'Banda desenhada',
      contextLabel: '8-10 anos',
      chapterCountLabel: '5 capítulos',
      durationLabel: 'Áudio 25 s',
      audioSampleSrc: `${sampleBookBase}/a-final-do-bairro-das-estrelas/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'O passe que acendeu',
        imageSrc: `${sampleBookBase}/a-final-do-bairro-das-estrelas/chapter-01.jpeg`,
        imageAlt:
          'Ilustração do capítulo de A Final do Bairro das Estrelas, com crianças a jogar futebol e uma bola brilhante',
        paragraphs: [
          'O campo do bairro era pequeno, torto e muito importante. Tinha uma baliza com uma rede remendada, outra baliza sem rede nenhuma e um muro onde alguém desenhara constelações a giz branco. A Mia dizia que aquelas estrelas serviam para estudar táticas. O Rui dizia que serviam para dar sorte. O Samir dizia que serviam para ambos, porque uma boa tática também precisava de sorte.',
          'Na tarde da final, a bola apareceu no centro do campo dentro de um saco de pano azul. Não era nova. Tinha riscos, marcas de lama e uma estrela pintada de lado. Mas, quando a treinadora Lara a tirou do saco, a estrela piscou.',
          '- Viram? - perguntou a Leonor, que jogava à baliza e reparava em tudo.',
          '- Foi o sol - disse Rui. O sol estava atrás de uma nuvem.',
          'A treinadora colocou a bola no chão. - A regra de hoje é simples. Ninguém joga sozinho.',
          'Rui sorriu como quem ouve uma frase bonita mas pouco útil. Ele gostava de correr. Gostava de fintar. Gostava daquele segundo em que todos prendiam a respiração antes do remate. Se alguém ia decidir a final, Rui tinha a certeza de que seria ele.',
          'O apito soou. Nos primeiros minutos, Rui recebeu a bola perto do muro das constelações. A Mia levantou o braço do outro lado.',
          '- Estou livre!',
          'Rui viu-a. Também viu dois adversários à frente, um espaço pequeno entre eles e a baliza ao fundo. Era um espaço quase impossível. Os espaços quase impossíveis eram os preferidos dele.',
          'Arrancou. Passou pelo primeiro. A bola não brilhou. Tentou passar pelo segundo. A bola continuou apagada. Quando preparou o remate, o segundo jogador tocou-lhe de leve na bola e ela fugiu para fora.',
          '- Quase! - disse Rui, ofegante.',
          '- Quase não conta como passe - respondeu Mia, sem zangar.',
          'No lance seguinte, Samir recuperou a bola. Viu Rui a pedir, viu Mia encostada à linha e viu Leonor, lá atrás, a apontar para o muro. No muro, uma constelação parecia uma seta.',
          'Samir passou para Mia. Nesse instante, a estrela pintada na bola acendeu-se como uma lanterna. Todos pararam um segundo. Até a equipa adversária.',
          '- A bola gosta de passes? - perguntou alguém.',
          '- A bola gosta de ideias - disse Leonor.',
          'Mia recebeu, correu dois passos e devolveu a Samir. A estrela brilhou outra vez, mais forte. Samir passou para Rui, que estava melhor colocado. A estrela manteve-se acesa, mas Rui sentiu uma coisa estranha: já não parecia a bola dele. Parecia a bola da equipa.',
          'Tinha espaço para rematar. Tinha vontade de rematar. Tinha também Mia, sozinha junto ao muro das constelações, com o pé esquerdo pronto.',
          'Rui ouviu a frase da treinadora: ninguém joga sozinho. Passou.',
          'A bola atravessou o campo como se seguisse uma linha desenhada a giz. A estrela brilhou tanto que as constelações do muro responderam, uma a uma. Mia recebeu e rematou rasteiro, sem força a mais, sem pressa a mais. A bola entrou junto ao poste.',
          'Golo.',
          'O bairro gritou. Rui gritou também, mas não com o som de quem tinha perdido o momento. Gritou com o som de quem tinha encontrado um momento maior.',
          'Mia correu até ele. - Viste? A tua assistência acendeu tudo.',
          'Rui olhou para a bola no fundo da baliza. A estrela piscava devagar, como se estivesse satisfeita.',
          '- Foi o meu melhor remate - disse Rui.',
          '- Mas tu não remataste.',
          '- Exatamente.',
          'A treinadora Lara riu-se e apontou para o quadro improvisado que tinham feito no workshop de manhã. Lá estavam três palavras escritas por todos: coragem, passe, equipa.',
          'Leonor apanhou a bola e colocou-a debaixo do braço. - Ainda falta a segunda parte.',
          'Rui olhou para o campo, para os colegas e para as constelações de giz. Pela primeira vez, não procurou o caminho até à baliza. Procurou o caminho até aos outros.',
          'E a bola, quieta debaixo do braço da guarda-redes, continuou acesa.',
        ],
      },
    },
    {
      id: 'book-03',
      title: 'O Clube dos Mapas Impossíveis',
      synopsis:
        'Exemplo para os 10-12 anos, criado a partir de um mapa desenhado em grupo. Mostra como crianças mais velhas podem trabalhar pistas, mundo ficcional e revisão criativa.',
      excerpt:
        'O mapa não mostrava o caminho mais curto. Mostrava o caminho que cada um ainda não tinha coragem de sugerir.',
      imageSrc: `${sampleBookBase}/o-clube-dos-mapas-impossiveis/feature.jpeg`,
      imageAlt:
        'Livro físico O Clube dos Mapas Impossíveis numa mesa de workshop, junto a mapas desenhados e notas coloridas',
      styleLabel: 'Aguarela',
      contextLabel: '10-12 anos',
      chapterCountLabel: '6 capítulos',
      durationLabel: 'Áudio 36 s',
      audioSampleSrc: `${sampleBookBase}/o-clube-dos-mapas-impossiveis/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'A ponte que não estava desenhada',
        imageSrc: `${sampleBookBase}/o-clube-dos-mapas-impossiveis/chapter-01.jpeg`,
        imageAlt:
          'Ilustração do capítulo de O Clube dos Mapas Impossíveis, com três crianças à volta de um mapa luminoso numa biblioteca',
        paragraphs: [
          'O mapa começou por ser uma folha grande no centro da mesa. A Lara desenhou a biblioteca, porque gostava de lugares onde as coisas ficavam à espera. O Nico desenhou três chaves, porque dizia que uma aventura sem chaves era apenas um passeio. A Beatriz desenhou um farol no sítio errado: mesmo no meio da sala de leitura.',
          '- Não pode haver um farol dentro de uma biblioteca - disse Nico.',
          '- Pode, se a biblioteca se perder no mar - respondeu Beatriz.',
          'Lara sorriu e acrescentou ondas à volta das estantes.',
          'No fim do workshop, o mapa ficou cheio de caminhos impossíveis. Havia uma ponte que começava numa prateleira e acabava num vaso. Havia uma escada que subia para baixo. Havia uma porta marcada com um ponto de interrogação tão grande que quase parecia uma janela.',
          'O monitor fotografou o mapa e perguntou: - Que pergunta querem que a história responda?',
          'Os três olharam para a folha. - Onde está a ponte que falta - disse Lara.',
          'À noite, a biblioteca fechou. As cadeiras ficaram em cima das mesas, as luzes pequenas acenderam-se junto à receção e o mapa, esquecido dentro de uma pasta azul, começou a fazer um som de papel a respirar.',
          'Quando Lara, Nico e Beatriz entraram na história, estavam outra vez à volta da mesa. Mas a mesa era maior. Ou talvez eles estivessem mais pequenos. As linhas do mapa tinham subido do papel e formado ruas. As chaves de Nico estavam de pé como torres douradas. O farol de Beatriz lançava uma luz lenta sobre as estantes-mar.',
          '- Eu disse que podia haver um farol - murmurou Beatriz.',
          'Nico pegou na primeira chave. Era leve, feita de aguarela seca. - Se há chaves, há portas.',
          'Lara apontou para o ponto de interrogação. Agora era uma porta alta, encostada à lombada de um dicionário. Tinha uma fechadura em forma de estrela.',
          'Nico experimentou a chave. Nada. Experimentou a segunda. Nada. Experimentou a terceira. A porta suspirou, mas continuou fechada.',
          '- As chaves não chegam - disse Lara.',
          'Beatriz olhou para o farol. A luz passava por cima da porta e parava num espaço vazio entre duas ruas do mapa.',
          '- Falta a ponte.',
          '- Foi isso que perguntámos - disse Nico. - Onde está?',
          'O mapa não respondeu. Mas as ondas desenhadas por Lara começaram a mover-se. Empurraram barcos de papel contra a margem, um a seguir ao outro. Cada barco tinha uma palavra escrita no casco: "ideia", "escuta", "risco".',
          '- Acho que isto quer que façamos uma ponte com palavras - disse Lara.',
          'Nico franziu o nariz. - Uma ponte aguenta melhor se for com tábuas.',
          '- Num mapa impossível, talvez não - respondeu Beatriz.',
          'Então experimentaram. Lara pegou no barco "ideia" e colocou-o entre as duas ruas. Beatriz pôs o barco "escuta" a seguir. Nico hesitou com o barco "risco".',
          '- Risco de cair?',
          '- Risco de tentar - disse Lara.',
          'Nico colocou o terceiro barco. Os cascos tocaram-se. A aguarela espalhou-se como se a água tivesse encontrado tinta fresca. As palavras transformaram-se em tábuas, as tábuas em ponte, e a ponte apareceu exatamente onde nenhum deles a tinha desenhado.',
          'A porta com o ponto de interrogação abriu uma fresta. Do outro lado não havia tesouro, nem dragão, nem sala secreta. Havia uma mesa com três lápis: um azul, um amarelo e um verde.',
          'Ao lado dos lápis, uma frase brilhava no papel: "Um mapa impossível não mostra onde cada pessoa quer ir. Mostra o caminho que só aparece quando todos desenham juntos."',
          'Beatriz leu em voz alta. Nico pegou no lápis amarelo. - Então falta desenhar a próxima pergunta.',
          'Lara escolheu o azul. Beatriz ficou com o verde.',
          'Juntos, desenharam uma nova linha no mapa. Não era reta. Não era curta. Também não era de ninguém em particular.',
          'Era uma linha dos três.',
        ],
      },
    },
  ],
  process: {
    title: 'Como funciona no Mythoria',
    steps: [
      'A criança ou o grupo dá a ideia por texto, imagem, desenho fotografado ou áudio.',
      'O monitor ajuda a escolher personagens, papéis, traços e detalhes importantes.',
      'O grupo define estilo literário, estilo gráfico, enredo e idioma.',
      'O Mythoria gera a história e abre espaço para leitura, revisão e apresentação.',
    ],
  },
  formats: {
    title: 'Formatos disponíveis',
    items: [
      'Livro digital para leitura imediata.',
      'Audiobook para ouvir em grupo ou em casa.',
      'PDF para impressão local.',
      'Livro físico, quando disponível.',
    ],
  },
  forProfessionals: {
    title: 'Para equipas que querem lançar esta atividade',
    body: [
      'Ajudamos a adaptar o workshop ao seu espaço: duração, idades, número de crianças, materiais para monitores e comunicação para pais.',
      'A primeira conversa é prática: que grupos recebe, quanto tempo tem disponível e que resultado quer entregar no fim.',
    ],
    ctaLabel: 'Falar sobre um workshop Mythoria',
    ctaHref: `/pt-PT/contactUs?topic=workshops&landingSlug=${slug}`,
  },
  faq: [
    {
      question: 'O workshop exige que as crianças saibam escrever bem?',
      answer:
        'Não. Para crianças mais pequenas, a oficina pode começar com desenho, conversa oral e escolhas guiadas. O monitor pode mediar a escrita.',
    },
    {
      question: 'Que idades fazem mais sentido?',
      answer:
        'Recomendamos 6-8 anos para desenho e histórias simples, 9-12 anos para personagens e enredo, e 13-16 anos para voz narrativa, tema e revisão.',
    },
    {
      question: 'As crianças podem criar histórias em grupo?',
      answer:
        'Sim. Pode haver histórias individuais, em pares, por mesa ou uma história coletiva da turma.',
    },
    {
      question: 'Que materiais precisa o ATL de preparar?',
      answer:
        'Folhas, lápis, marcadores, telemóvel ou tablet para fotografar desenhos, computador ou tablet para acompanhar o fluxo Mythoria e um monitor para orientar a sessão.',
    },
    {
      question: 'O resultado pode ser impresso?',
      answer:
        'Sim. O Mythoria permite leitura digital, audiobook, PDF/self-print e, quando disponível para a morada, livro físico.',
    },
    {
      question: 'É uma atividade com IA?',
      answer:
        'Pode ser explicado aos pais como tecnologia criativa orientada por adultos. A criança decide, o monitor acompanha e o Mythoria ajuda a dar forma à história.',
    },
    {
      question: 'Os exemplos desta página são histórias reais?',
      answer:
        'Não. São exemplos ficcionais de demonstração, criados para mostrar formatos possíveis sem expor crianças, famílias ou clientes reais.',
    },
  ],
  finalCta: {
    title: 'Quer transformar a próxima atividade num livro?',
    body: 'Conte-nos o tipo de espaço, idades, número de crianças e duração pretendida. Ajudamos a desenhar um workshop Mythoria simples de operar, claro para os pais e memorável para as crianças.',
  },
  structuredData: {
    about: [
      'Workshops para crianças',
      'ATL',
      'Atelier de escrita criativa',
      'Atividades para campos de férias',
      'Livros personalizados para crianças',
      'Literacia digital',
    ],
    serviceName: 'Workshops Mythoria para crianças',
    serviceType: 'Atelier de escrita criativa, ilustração e criação de livros',
  },
};
