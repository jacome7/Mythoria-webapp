import type { LandingPageContent } from './types';

const slug = 'livro-personalizado-ferias';
const iconBase = '/Papercut_icons';
const assetBase = `/landing-pages/${slug}/assets`;
const bookBase = `${assetBase}/books`;

export const familyTravelLandingPage: LandingPageContent = {
  slug,
  locale: 'pt-PT',
  title: 'Livros personalizados para guardar a história das suas férias',
  metaTitle: 'Livro Personalizado de Férias e Viagens | Mythoria',
  metaDescription:
    'Transforme fotografias, lugares e pequenas memórias das férias numa história personalizada para ler, ouvir, imprimir ou oferecer.',
  primaryIntent: 'family_travels',
  riskRating: 'yellow',
  updatedAt: '2026-07-30',
  indexable: true,
  showInLandingPageIndex: true,
  showFormatsNearHero: false,
  showFormatsNearProcess: true,
  showEditorialReview: false,
  breadcrumbLabel: 'Livro de Férias',
  ogImageSrc: `${assetBase}/hero/og-cover.jpeg`,
  primaryCta: 'Criar o meu livro de férias',
  secondaryCta: 'Ver exemplos de livros de viagem',
  secondaryCtaHref: '#exemplos',
  analytics: {
    pageViewEvent: 'landing_page_view',
    variant: 'family-travel-v1',
  },
  templateIcons: {
    heroEyebrow: { src: `${iconBase}/fa-plane-departure-travel-papercut.webp`, alt: '' },
    ctaArrow: { src: `${iconBase}/fa-chevron-right-papercut.webp`, alt: '' },
    quickAnswer: { src: `${iconBase}/fa-check-papercut.webp`, alt: '' },
    audioSample: { src: `${iconBase}/fa-microphone-papercut.webp`, alt: '' },
    professionalPanel: { src: `${iconBase}/fa-landmark-travel-papercut.webp`, alt: '' },
    sampleChapter: { src: `${iconBase}/openBook.webp`, alt: '' },
    formats: [
      { src: `${iconBase}/openBook.webp`, alt: '' },
      { src: `${iconBase}/fa-microphone-papercut.webp`, alt: '' },
      { src: `${iconBase}/fa-file-upload-papercut.webp`, alt: '' },
      { src: `${iconBase}/fa-book-open-papercut.webp`, alt: '' },
    ],
  },
  hero: {
    eyebrow: 'Memórias de viagem · livros personalizados',
    headline: 'Transforme as fotografias das suas férias numa história personalizada.',
    subheadline:
      'As imagens mostram onde esteve. A Mythoria ajuda a contar o que viveu — com pessoas, lugares, episódios e pequenos detalhes que tornam a viagem só vossa.',
    imageSrc: `${assetBase}/hero/hero.jpeg`,
    imageAlt:
      'Família a reler as memórias das férias num livro personalizado junto de um telemóvel com fotografias',
  },
  quickAnswer: {
    title: 'É um álbum narrativo, não um fotolivro automático',
    body: 'Um livro Mythoria parte das memórias, fotografias e detalhes que escolher para criar uma narrativa personalizada. Não organiza centenas de imagens num álbum tradicional: transforma os momentos essenciais numa história que pode rever, ler, ouvir, partilhar, imprimir ou oferecer, consoante as opções disponíveis.',
  },
  intro: {
    title: 'As melhores memórias não deviam ficar perdidas no rolo da câmara',
    body: [
      'Voltamos de férias com praias, ruas, gargalhadas e pequenas histórias espalhadas por muitas fotografias. Algumas chegam a uma pasta. Outras ficam esquecidas entre milhares.',
      'Escolher os momentos que realmente contam permite guardar mais do que a imagem: quem estava lá, o que correu ao lado do plano e aquela frase que continua a fazer a família rir.',
    ],
  },
  whyThisFits: {
    title: 'Um livro que conta a aventura por trás das fotografias',
    body: [
      'A Mythoria combina personagens, lugares, memórias e um estilo narrativo escolhido por si. A viagem pode tornar-se uma aventura infantil, uma crónica familiar, uma história de amor ou um diário de estrada.',
      'Pode começar com poucas fotografias e os detalhes essenciais. Depois, reveja texto e imagens com calma antes de decidir como guardar ou partilhar a história.',
    ],
  },
  comparison: {
    title: 'Mais narrativa do que um álbum tradicional',
    intro:
      'Um fotolivro e um livro Mythoria podem guardar a mesma viagem, mas fazem trabalhos diferentes.',
    leftLabel: 'Álbum tradicional',
    rightLabel: 'Livro Mythoria',
    rows: [
      {
        left: 'Organiza fotografias por páginas.',
        right: 'Constrói uma história com pessoas, lugares, episódios e emoções.',
      },
      {
        left: 'É sobretudo uma recordação visual.',
        right: 'É uma memória narrativa, feita para ler e voltar a contar.',
      },
      {
        left: 'Depende principalmente do layout.',
        right: 'Parte dos momentos e do significado que lhes quer dar.',
      },
      {
        left: 'É feito para ver.',
        right: 'Pode ser lido, ouvido, partilhado, impresso ou oferecido.',
      },
    ],
  },
  carefulBenefits: {
    title: 'Das fotos no telemóvel a uma história para guardar',
    items: [
      {
        title: 'Escolha os momentos certos',
        body: 'Comece pelas fotografias e episódios que melhor representam a viagem.',
        iconSrc: `${iconBase}/fa-camera-papercut.webp`,
        iconAlt: 'Ícone papercut de uma câmara',
      },
      {
        title: 'Dê um papel a cada pessoa',
        body: 'Família, casal, avós ou amigos podem entrar na história com o tom certo.',
        iconSrc: `${iconBase}/fa-users-papercut.webp`,
        iconAlt: 'Ícone papercut de um grupo',
      },
      {
        title: 'Guarde o inesperado',
        body: 'O gelado que caiu e o desvio não planeado também fazem parte da aventura.',
        iconSrc: `${iconBase}/fa-suitcase-rolling-travel-papercut.webp`,
        iconAlt: 'Ícone papercut de uma mala de viagem',
      },
      {
        title: 'Reveja antes de partilhar',
        body: 'Corrija nomes, retire detalhes privados e confirme as fotografias utilizadas.',
        iconSrc: `${iconBase}/fa-check-papercut.webp`,
        iconAlt: 'Ícone papercut de confirmação',
      },
      {
        title: 'Transforme a memória numa prenda',
        body: 'Crie algo para oferecer a quem viajou consigo ou ficou à espera das histórias.',
        iconSrc: `${iconBase}/fa-gift-papercut.webp`,
        iconAlt: 'Ícone papercut de uma prenda',
      },
    ],
  },
  useCases: {
    title: 'Para todos os que querem guardar uma experiência com mais significado',
    intro:
      'O comprador e responsável pela criação é um adulto; a história pode ser pensada para diferentes pessoas e ocasiões.',
    items: [
      {
        title: 'Famílias',
        body: 'Transforme férias, visitas e fins de semana numa história para reler com as crianças.',
        iconSrc: `${iconBase}/fa-umbrella-beach-travel-papercut.webp`,
        iconAlt: 'Ícone papercut de um chapéu de sol',
      },
      {
        title: 'Casais',
        body: 'Guarde ruas, cafés e pequenas promessas de uma viagem a dois.',
        iconSrc: `${iconBase}/fa-plane-departure-travel-papercut.webp`,
        iconAlt: 'Ícone papercut de um avião',
      },
      {
        title: 'Avós e familiares',
        body: 'Ofereça as memórias das férias numa prenda que a família pode ler em conjunto.',
        iconSrc: `${iconBase}/fa-gift-papercut.webp`,
        iconAlt: 'Ícone papercut de uma prenda',
      },
      {
        title: 'Grupos de amigos',
        body: 'Junte piadas internas, desvios e planos improváveis numa crónica de grupo.',
        iconSrc: `${iconBase}/fa-suitcase-rolling-travel-papercut.webp`,
        iconAlt: 'Ícone papercut de uma mala de viagem',
      },
      {
        title: 'Museus e atrações',
        body: 'Prolongue uma visita através de uma história inspirada no que a família descobriu.',
        iconSrc: `${iconBase}/fa-landmark-travel-papercut.webp`,
        iconAlt: 'Ícone papercut de um museu',
      },
      {
        title: 'Hotéis e turismo rural',
        body: 'Explore uma recordação personalizada para hóspedes e programas familiares.',
        iconSrc: `${iconBase}/fa-hotel-travel-papercut.webp`,
        iconAlt: 'Ícone papercut de um hotel',
      },
    ],
  },
  booksSection: {
    title: 'Uma viagem diferente em cada livro',
    intro:
      'Leia um capítulo, ouça um excerto e veja como a mesma ideia pode servir uma família, um casal, amigos ou uma experiência turística.',
  },
  books: [
    {
      id: 'travel-book-01',
      slug: 'a-leonor-e-o-segredo-do-oceanario',
      title: 'A Leonor e o Segredo do Oceanário',
      synopsis:
        'Uma visita a um oceanário fictício transforma-se numa caça às pistas para ajudar uma tartaruga a encontrar o caminho de volta ao mar.',
      excerpt: 'A primeira pista brilhava no vidro, mesmo ao lado da fotografia da tartaruga.',
      imageSrc: `${bookBase}/a-leonor-e-o-segredo-do-oceanario/feature.jpeg`,
      imageAlt: 'Livro físico A Leonor e o Segredo do Oceanário numa leitura em família',
      styleLabel: 'Aguarela',
      contextLabel: 'Aquário e ciência',
      ageLabel: '7–10 anos',
      audioSampleSrc: `${bookBase}/a-leonor-e-o-segredo-do-oceanario/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'A pista junto ao vidro azul',
        imageSrc: `${bookBase}/a-leonor-e-o-segredo-do-oceanario/cover.jpeg`,
        imageAlt: 'Capa ilustrada de A Leonor e o Segredo do Oceanário',
        paragraphs: [
          'Leonor tirou a primeira fotografia no túnel azul, quando uma tartaruga passou tão devagar que parecia estar a ler as expressões de toda a família.',
          'No ecrã apareceu um pequeno brilho junto ao vidro. Não estava na fotografia anterior. Parecia uma seta feita de bolhas.',
          'A mãe não encontrou a seta, mas ajudou Leonor a comparar as imagens sem tocar nos vidros nem sair do percurso assinalado.',
          'Cada sala trouxe uma pista: uma concha desenhada, três pontos dourados e um mapa que não pertencia a nenhum mar real.',
          'Leonor percebeu que o segredo não era libertar uma tartaruga verdadeira. Era aprender a seguir a história escondida na visita.',
          'Antes de saírem, guardou as fotografias numa pasta chamada “Pistas do Mar” e prometeu transformar o percurso num livro.',
        ],
      },
    },
    {
      id: 'travel-book-02',
      slug: 'o-verao-em-que-o-tomas-encontrou-uma-ilha',
      title: 'O Verão em que o Tomás Encontrou uma Ilha',
      synopsis:
        'Entre praias, gelados e fotografias ao pôr do sol, Tomás descobre uma ilha feita dos momentos que viveu com a família.',
      excerpt: 'A ilha aparecia todos os dias, mas nunca exatamente no mesmo lugar.',
      imageSrc: `${bookBase}/o-verao-em-que-o-tomas-encontrou-uma-ilha/feature.jpeg`,
      imageAlt: 'Livro físico O Verão em que o Tomás Encontrou uma Ilha junto a memórias de praia',
      styleLabel: 'Arte digital',
      contextLabel: 'Férias de verão',
      ageLabel: '7–10 anos',
      audioSampleSrc: `${bookBase}/o-verao-em-que-o-tomas-encontrou-uma-ilha/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'A ilha das cinco da tarde',
        imageSrc: `${bookBase}/o-verao-em-que-o-tomas-encontrou-uma-ilha/cover.jpeg`,
        imageAlt: 'Capa ilustrada de O Verão em que o Tomás Encontrou uma Ilha',
        paragraphs: [
          'Às cinco da tarde, o sol desenhava uma ilha no mar. Tomás fotografou-a antes que a maré mudasse a forma das pedras.',
          'O pai disse que a ilha já estava nos mapas. Tomás achou que os mapas não sabiam nada sobre o gelado que tinha caído na toalha.',
          'Durante uma semana, reuniu conchas, frases e fotografias, mas deixou cada coisa onde a encontrara depois de a observar.',
          'A mãe propôs um mapa diferente: em vez de coordenadas, teria momentos — o mergulho, a caminhada e o jantar que começou tarde.',
          'Na última tarde, a ilha pareceu desaparecer. Tomás percebeu que continuava inteira nas histórias escolhidas pela família.',
          'No regresso, o mapa foi para dentro de um livro. A ilha já não precisava de ficar no mesmo lugar para poder ser visitada.',
        ],
      },
    },
    {
      id: 'travel-book-03',
      slug: 'o-mapa-dos-dias-que-eram-so-nossos',
      title: 'O Mapa dos Dias que Eram Só Nossos',
      synopsis:
        'Uma viagem a dois torna-se um mapa íntimo de cidades, cafés, ruas e pequenas promessas guardadas entre páginas.',
      excerpt:
        'No mapa deles, os lugares importantes não tinham estrelas: tinham chávenas desenhadas.',
      imageSrc: `${bookBase}/o-mapa-dos-dias-que-eram-so-nossos/feature.jpeg`,
      imageAlt: 'Livro físico O Mapa dos Dias que Eram Só Nossos numa mesa de viagem',
      styleLabel: 'Minimalista',
      contextLabel: 'Viagem a dois',
      ageLabel: 'Adultos',
      audioSampleSrc: `${bookBase}/o-mapa-dos-dias-que-eram-so-nossos/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'Uma cidade sem lista',
        imageSrc: `${bookBase}/o-mapa-dos-dias-que-eram-so-nossos/cover.jpeg`,
        imageAlt: 'Capa ilustrada de O Mapa dos Dias que Eram Só Nossos',
        paragraphs: [
          'Marta chegou com uma lista de dez lugares. Tiago chegou com um mapa dobrado e a vontade de se perder sem dramatizar.',
          'Ao segundo dia já tinham falhado três reservas e encontrado um café que nenhum guia mencionava.',
          'Fotografaram duas chávenas diferentes, a janela embaciada e o bilhete de um elétrico que os levou ao bairro errado.',
          'Marta começou a marcar os lugares não pelo nome, mas pela conversa que ali tinha acontecido.',
          'Quando a chuva os obrigou a voltar cedo, perceberam que o melhor dia não precisava de um monumento para ficar completo.',
          'O mapa regressou cheio de pequenos círculos. Cada um guardava uma memória que só fazia sentido lida pelos dois.',
        ],
      },
    },
    {
      id: 'travel-book-04',
      slug: 'a-road-trip-dos-planos-impossiveis',
      title: 'A Road Trip dos Planos Impossíveis',
      synopsis:
        'Quatro amigos, uma carrinha e uma lista de lugares que não corre como planeado — mas fica perfeita para contar.',
      excerpt:
        'O plano tinha quarenta linhas. Ao almoço do primeiro dia já estavam na linha cinquenta e três.',
      imageSrc: `${bookBase}/a-road-trip-dos-planos-impossiveis/feature.jpeg`,
      imageAlt: 'Livro físico A Road Trip dos Planos Impossíveis numa carrinha estacionada',
      styleLabel: 'Banda desenhada europeia',
      contextLabel: 'Viagem de amigos',
      ageLabel: 'Adultos',
      audioSampleSrc: `${bookBase}/a-road-trip-dos-planos-impossiveis/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'A saída que ninguém viu',
        imageSrc: `${bookBase}/a-road-trip-dos-planos-impossiveis/cover.jpeg`,
        imageAlt: 'Capa ilustrada de A Road Trip dos Planos Impossíveis',
        paragraphs: [
          'A carrinha chamava-se Aurora porque nenhum dos quatro tinha conseguido concordar noutro nome.',
          'Joana conduzia, Luís lia o mapa, Clara distribuía snacks e Vasco documentava cada erro com entusiasmo profissional.',
          'A saída passou sem que ninguém a visse. O desvio levou-os a uma aldeia onde a praça tinha uma fonte e nenhum sinal de pressa.',
          'Almoçaram tarde, ouviram uma história do dono do café e fotografaram a carrinha junto a uma parede cor de laranja.',
          'O plano perdeu duas páginas ao vento. Em vez de as perseguirem, escreveram uma nova regra: guardar o que valesse a pena contar.',
          'Naquela noite, o primeiro capítulo ficou decidido. Chamava-se “A saída que ninguém viu e ainda bem”.',
        ],
      },
    },
    {
      id: 'travel-book-05',
      slug: 'o-quadro-que-piscou-o-olho',
      title: 'O Quadro que Piscou o Olho',
      synopsis:
        'Num museu fictício, uma criança segue pistas escondidas nas salas e nas fotografias para descobrir porque um retrato parece mexer-se.',
      excerpt: 'O quadro não voltou a piscar. Mas a figura tinha mudado a mão de lugar.',
      imageSrc: `${bookBase}/o-quadro-que-piscou-o-olho/feature.jpeg`,
      imageAlt: 'Livro físico O Quadro que Piscou o Olho numa mesa de museu sem logótipos',
      styleLabel: 'Lápis de cor',
      contextLabel: 'Museu e descoberta',
      ageLabel: '7–10 anos',
      audioSampleSrc: `${bookBase}/o-quadro-que-piscou-o-olho/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'A moldura da sala três',
        imageSrc: `${bookBase}/o-quadro-que-piscou-o-olho/cover.jpeg`,
        imageAlt: 'Capa ilustrada de O Quadro que Piscou o Olho',
        paragraphs: [
          'Na sala três, Duarte levantou a máquina fotográfica de brincar e viu o homem do retrato piscar o olho.',
          'A avó Rosa não se riu. Perguntou apenas o que tinha mudado e ajudou-o a observar a tela à distância indicada.',
          'Na fotografia, a mão da figura parecia apontar para uma pequena ponte pintada no fundo.',
          'A ponte levou-os a outra sala, depois a uma paisagem e finalmente a um banco onde podiam comparar todas as pistas.',
          'Descobriram que luz, posição e atenção transformavam aquilo que cada pessoa via.',
          'Duarte saiu sem provar que o quadro piscara. Saiu com uma pergunta melhor e material para uma história inteira.',
        ],
      },
    },
    {
      id: 'travel-book-06',
      slug: 'o-dia-em-que-a-quinta-falou',
      title: 'O Dia em que a Quinta Falou',
      synopsis:
        'Numa quinta fictícia, uma família descobre que animais, árvores e pequenos trilhos guardam histórias à espera de serem ouvidas.',
      excerpt: 'A primeira voz veio do velho sobreiro, mas só depois de todos ficarem em silêncio.',
      imageSrc: `${bookBase}/o-dia-em-que-a-quinta-falou/feature.jpeg`,
      imageAlt: 'Livro físico O Dia em que a Quinta Falou numa casa de turismo rural',
      styleLabel: 'Desenho à mão',
      contextLabel: 'Turismo rural',
      ageLabel: '3–6 anos',
      audioSampleSrc: `${bookBase}/o-dia-em-que-a-quinta-falou/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'A voz do sobreiro',
        imageSrc: `${bookBase}/o-dia-em-que-a-quinta-falou/cover.jpeg`,
        imageAlt: 'Capa ilustrada de O Dia em que a Quinta Falou',
        paragraphs: [
          'Inês chegou à quinta a fazer perguntas tão depressa que nem as galinhas conseguiam acompanhar.',
          'O avô Artur propôs um jogo: ficar um minuto em silêncio junto de cada lugar e depois contar o que tinham ouvido.',
          'No curral ouviram palha, passos e um balido impaciente. No pomar ouviram folhas e uma maçã a cair.',
          'Junto do sobreiro, Inês ouviu uma voz muito lenta dizer que as árvores medem as férias de outra maneira.',
          'O avô não disse que a árvore falara de verdade. Guardou a frase porque era boa demais para perder.',
          'Ao jantar, cada pessoa contou uma voz diferente. A quinta ganhou um capítulo feito de atenção e imaginação.',
        ],
      },
    },
    {
      id: 'travel-book-07',
      slug: 'a-viagem-que-os-avos-tambem-viveram',
      title: 'A Viagem que os Avós Também Viveram',
      synopsis:
        'As fotografias das férias dos netos tornam-se uma aventura que os avós podem ler, ouvir e continuar com memórias próprias.',
      excerpt: 'A avó reconheceu a praça, embora na fotografia dela ainda não existisse a fonte.',
      imageSrc: `${bookBase}/a-viagem-que-os-avos-tambem-viveram/feature.jpeg`,
      imageAlt: 'Livro físico A Viagem que os Avós Também Viveram numa leitura entre gerações',
      styleLabel: 'Aguarela',
      contextLabel: 'Avós e netos',
      ageLabel: '7–10 anos',
      audioSampleSrc: `${bookBase}/a-viagem-que-os-avos-tambem-viveram/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'Duas fotografias da mesma praça',
        imageSrc: `${bookBase}/a-viagem-que-os-avos-tambem-viveram/cover.jpeg`,
        imageAlt: 'Capa ilustrada de A Viagem que os Avós Também Viveram',
        paragraphs: [
          'Matilde mostrou aos avós uma fotografia da praça onde tinha comido o melhor pão das férias.',
          'A avó Teresa procurou numa caixa e encontrou outra fotografia do mesmo lugar, tirada muitos anos antes.',
          'Na imagem antiga não havia fonte. Havia uma bicicleta, três árvores pequenas e o avô Manuel com um casaco demasiado largo.',
          'As duas fotografias abriram caminhos diferentes para a mesma praça: a viagem de Matilde e a memória dos avós.',
          'Decidiram escrever um capítulo em duas vozes, sem escolher qual delas era a versão mais importante.',
          'Quando o livro ficou pronto, a praça já não pertencia a um único verão. Era um lugar onde a família se podia encontrar.',
        ],
      },
    },
    {
      id: 'travel-book-08',
      slug: 'antes-que-a-estrada-acabe',
      title: 'Antes que a Estrada Acabe',
      synopsis:
        'Uma viagem longa, feita de paisagens, escolhas e silêncios, muda a forma como uma viajante olha para o regresso.',
      excerpt:
        'A estrada acabava no mapa, mas continuava na pergunta que ela ainda não sabia responder.',
      imageSrc: `${bookBase}/antes-que-a-estrada-acabe/feature.jpeg`,
      imageAlt: 'Livro físico Antes que a Estrada Acabe numa paisagem de viagem',
      styleLabel: 'Realista',
      contextLabel: 'Viagem de vida',
      ageLabel: 'Adultos',
      audioSampleSrc: `${bookBase}/antes-que-a-estrada-acabe/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'O quilómetro sem nome',
        imageSrc: `${bookBase}/antes-que-a-estrada-acabe/cover.jpeg`,
        imageAlt: 'Capa ilustrada de Antes que a Estrada Acabe',
        paragraphs: [
          'Eva partiu com um caderno, uma mochila e a decisão de não transformar a viagem numa lista de provas.',
          'Fotografou menos do que esperava. Havia paisagens que pediam alguns minutos antes de caberem num enquadramento.',
          'Numa estrada sem nome, parou junto a uma árvore inclinada pelo vento e escreveu a primeira frase honesta da viagem.',
          'Não procurava uma versão nova de si mesma. Procurava tempo suficiente para ouvir a versão que já existia.',
          'No último dia, o caminho terminava junto ao mar. Eva deixou uma página vazia para o regresso.',
          'A estrada acabava no mapa, mas o livro continuava: não como resposta, mas como uma forma de guardar a mudança.',
        ],
      },
    },
  ],
  process: {
    title: 'Como transformar uma viagem num livro personalizado',
    steps: [
      'Escolha uma viagem, visita ou experiência que queira guardar.',
      'Reúna algumas fotografias e os detalhes essenciais: pessoas, lugares, frases e momentos.',
      'Defina o público, o tom narrativo e o estilo visual.',
      'Crie a história e reveja texto, nomes e imagens com calma.',
      'Leia em digital e escolha áudio, PDF ou impressão quando essas opções estiverem disponíveis.',
    ],
  },
  formats: {
    title: 'Escolha como quer guardar a viagem',
    items: [
      'Leitura digital privada para rever e partilhar intencionalmente.',
      'Audiolivro quando disponível para a história.',
      'PDF para autoimpressão quando disponível.',
      'Livro impresso conforme disponibilidade e destino.',
    ],
  },
  forProfessionals: {
    title: 'A experiência não precisa de acabar à saída',
    body: [
      'Museus, aquários, zoos, hotéis, parques e espaços de turismo rural podem explorar com a Mythoria uma recordação personalizada para visitantes. A implementação de páginas dedicadas, códigos QR ou modelos comerciais é definida apenas no contexto de uma parceria.',
      'A landing apresenta a possibilidade e encaminha o contacto; não pressupõe que exista hoje uma integração automática com o local.',
    ],
    items: [
      {
        title: 'Bilhete ou receção',
        body: 'Convide a família a continuar a história depois da visita.',
        iconSrc: `${iconBase}/fa-ticket-alt-travel-papercut.webp`,
        iconAlt: 'Ícone papercut de um bilhete',
      },
      {
        title: 'Museus e atrações',
        body: 'Explore uma recordação narrativa inspirada no percurso do visitante.',
        iconSrc: `${iconBase}/fa-landmark-travel-papercut.webp`,
        iconAlt: 'Ícone papercut de um museu',
      },
      {
        title: 'Hotel ou alojamento',
        body: 'Acrescente uma ideia memorável a um programa ou pacote familiar.',
        iconSrc: `${iconBase}/fa-hotel-travel-papercut.webp`,
        iconAlt: 'Ícone papercut de um hotel',
      },
      {
        title: 'Prenda ou oferta premium',
        body: 'Converse connosco sobre uma experiência adequada ao seu espaço e público.',
        iconSrc: `${iconBase}/fa-gift-papercut.webp`,
        iconAlt: 'Ícone papercut de uma prenda',
      },
    ],
    ctaLabel: 'Explorar uma parceria',
    ctaHref: '/pt-PT/partners',
  },
  trustAndPrivacy: {
    title: 'Memórias pessoais merecem escolhas cuidadas',
    intro:
      'Uma história de viagem pode incluir crianças, terceiros e lugares reconhecíveis. Use apenas o que tem o direito de utilizar e retire informação que não seja necessária.',
    items: [
      {
        title: 'Conta adulta',
        body: 'A criação e a revisão são responsabilidade de um adulto.',
        iconSrc: `${iconBase}/fa-user-papercut.webp`,
        iconAlt: 'Ícone papercut de utilizador',
      },
      {
        title: 'Privado por defeito',
        body: 'Uma história não se torna pública apenas por ser criada.',
        iconSrc: `${iconBase}/fa-lock-romance-papercut.webp`,
        iconAlt: 'Ícone papercut de cadeado',
      },
      {
        title: 'Fotografias autorizadas',
        body: 'Inclua imagens de outras pessoas apenas quando tem autorização adequada.',
        iconSrc: `${iconBase}/fa-camera-papercut.webp`,
        iconAlt: 'Ícone papercut de câmara',
      },
      {
        title: 'Revisão antes da partilha',
        body: 'Confirme nomes, locais e detalhes antes de enviar, publicar ou imprimir.',
        iconSrc: `${iconBase}/fa-check-papercut.webp`,
        iconAlt: 'Ícone papercut de confirmação',
      },
    ],
  },
  faq: [
    {
      question: 'Isto é um álbum de fotografias tradicional?',
      answer:
        'Não exatamente. A Mythoria cria uma história personalizada a partir dos momentos, fotografias e detalhes que escolher. O resultado é mais narrativo do que um fotolivro clássico: não organiza automaticamente centenas de imagens, mas ajuda a contar a experiência com personagens, lugares e episódios.',
    },
    {
      question: 'Posso usar fotografias reais da viagem?',
      answer:
        'Pode usar fotografias próprias e autorizadas para personalizar personagens ou imagens da história através das opções disponíveis no produto. Escolha apenas os momentos essenciais e confirme que tem autorização adequada das pessoas identificáveis, sobretudo quando aparecem crianças.',
    },
    {
      question: 'Posso criar um livro sobre uma visita a um museu, zoo ou atração?',
      answer:
        'Sim. Pode usar a visita como ponto de partida para uma aventura, mistério, diário ou memória familiar. Evite reproduzir logótipos, obras protegidas ou informação privada sem autorização e reveja os detalhes acrescentados à narrativa antes de partilhar.',
    },
    {
      question: 'Serve apenas para crianças?',
      answer:
        'Não. Pode criar uma aventura infantil, uma crónica familiar, uma história de viagem para um casal, um livro divertido para amigos ou uma memória pessoal. O público, o tom e o estilo são escolhidos no percurso de criação.',
    },
    {
      question: 'Posso ouvir, descarregar ou imprimir o livro?',
      answer:
        'A leitura digital faz parte da experiência. Audiolivro, PDF para autoimpressão e livro impresso dependem das opções disponíveis para a história, do preço aplicável e, no caso da impressão, do destino. A disponibilidade é apresentada antes de confirmar.',
    },
    {
      question: 'Posso oferecer o livro?',
      answer:
        'Sim. Uma história de férias pode ser uma prenda para quem viajou consigo, para avós que querem acompanhar as aventuras dos netos ou para alguém que partilha uma memória especial. Reveja sempre o conteúdo e as permissões antes de oferecer ou partilhar.',
    },
    {
      question: 'Como funciona para hotéis, museus e atrações?',
      answer:
        'A página apresenta uma possibilidade de parceria, não uma integração automática já ativa. Organizações interessadas podem contactar a Mythoria através da área de parceiros para explorar uma experiência adequada ao local, ao público, à privacidade e ao modelo comercial.',
    },
  ],
  finalCta: {
    title: 'As suas férias já aconteceram. Agora podem tornar-se uma história.',
    body: 'Escolha os momentos que continuam a fazê-lo sorrir. A Mythoria ajuda a transformá-los num livro para reler, ouvir, imprimir ou oferecer, conforme as opções disponíveis.',
  },
  structuredData: {
    about: [
      'Livro personalizado de férias',
      'História personalizada de viagem',
      'Livro de memórias de família',
      'Prenda personalizada com fotografias',
    ],
    serviceName: 'Livro personalizado Mythoria para férias e viagens',
    serviceType: 'História personalizada, leitura digital, áudio, PDF e livro impresso',
    includeProduct: false,
  },
};
