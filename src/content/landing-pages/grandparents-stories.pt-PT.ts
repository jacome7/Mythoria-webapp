import type { LandingPageContent } from './types';

const slug = 'livro-personalizado-avos-netos';
const iconBase = '/Papercut_icons';
const assetBase = `/landing-pages/${slug}/assets`;
const sampleBookBase = `${assetBase}/books`;

export const grandparentsStoriesLandingPage: LandingPageContent = {
  slug,
  locale: 'pt-PT',
  title: 'Livro personalizado para avós e netos',
  metaTitle: 'Livro Personalizado Dia dos Avós | O Presente Mais Emocional | Mythoria',
  metaDescription:
    'Crie um livro personalizado único para o Dia dos Avós com memórias da família, fotografias e audiolivro. Entrega rápida e versão digital imediata.',
  primaryIntent: 'grandparents',
  riskRating: 'yellow',
  updatedAt: '2026-06-28',
  indexable: true,
  breadcrumbLabel: 'Livro para avós e netos',
  ogImageSrc: `${sampleBookBase}/a-receita-das-estrelas-da-avo/feature.jpeg`,
  primaryCta: 'Criar o Nosso Livro dos Avós',
  primaryCtaHref: `/pt-PT/tell-your-story/step-1?landingSlug=${slug}&primaryIntent=grandparents`,
  secondaryCta: 'Ver exemplos por dentro',
  secondaryCtaHref: '#exemplos',
  testimonials: {
    title: 'O que dizem as famílias que já ofereceram Mythoria',
    intro: 'Histórias reais de avós, pais e netos que se emocionaram juntos.',
    items: [
      {
        quote:
          'O meu pai chorou quando leu o livro com a neta no Dia dos Avós. Incluímos a receita de broas da avó e a casa da aldeia. É o presente mais bonito que alguma vez lhe demos.',
        author: 'Maria Sofia Ribeiro',
        role: 'Mãe e filha',
        location: 'Lisboa',
        stars: 5,
      },
      {
        quote:
          'Moramos em Paris e queria muito que o meu filho de 6 anos praticasse o português com os avós. O livro bilingue foi um sucesso enorme nas chamadas de domingo!',
        author: 'Carlos & Sophie Mendonça',
        role: 'Pais na diáspora',
        location: 'Paris, França',
        stars: 5,
      },
      {
        quote:
          'Criei o livro em 5 minutos no telemóvel enquanto ia no comboio. A qualidade do livro impresso em capa dura surpreendeu-me muito. Recomendo a todos os pais.',
        author: 'Teresa Goulart',
        role: 'Mãe de 2 netos',
        location: 'Porto',
        stars: 5,
      },
    ],
  },
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
      src: `${iconBase}/fa-globe-americas-papercut.webp`,
      alt: '',
    },
    safetyNote: {
      src: `${iconBase}/fa-exclamation-triangle-papercut.webp`,
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
        src: `${iconBase}/fa-whatsapp-papercut.webp`,
        alt: '',
      },
      {
        src: `${iconBase}/fa-book-open-papercut.png`,
        alt: '',
      },
    ],
  },
  booksSection: {
    eyebrow: 'Exemplos ficcionais de demonstração',
    title: 'Ideias de livros para avós, netos e famílias longe',
    intro:
      'Cada exemplo mostra um ponto de partida diferente: memória, receita, aldeia, chamadas de domingo ou primeira viagem a Portugal.',
  },
  hero: {
    eyebrow: 'Especial Dia dos Avós & Famílias Portuguesas',
    headline: 'O presente do Dia dos Avós que vai fazer a família chorar de alegria.',
    subheadline:
      'Transforme nomes, memórias reais, receitas e fotografias num livro personalizado impresso e num audiolivro mágico. Criado em 3 minutos no seu telemóvel.',
    imageSrc: `${sampleBookBase}/a-receita-das-estrelas-da-avo/feature.jpeg`,
    imageAlt:
      'Livro físico “A Receita das Estrelas da Avó” sobre uma mesa de cozinha portuguesa com receita e canela',
  },
  quickAnswer: {
    title: 'O que é um livro personalizado para avós e netos?',
    body: 'É uma história criada a partir de nomes, memórias e detalhes reais da família, onde avós e netos aparecem como personagens. Pode ser oferecida em formato digital, áudio, link privado, PDF para imprimir ou livro físico, e é especialmente útil para o Dia dos Avós, aniversários, Natal, visitas a Portugal e famílias que vivem entre línguas.',
  },
  intro: {
    title: 'Nem todos os presentes contam uma história. Este conta a vossa.',
    body: [
      'O Mythoria ajuda a transformar uma receita da avó, uma frase do avô, uma casa de férias, uma aldeia, uma fotografia antiga ou uma videochamada num livro que a criança reconhece como seu.',
      'Pode criar uma aventura terna, uma memória de família, uma história para dormir ou um livro bilingue. O importante é que os avós deixam de aparecer só numa fotografia: entram na história, falam, guiam, ensinam e brincam com os netos.',
    ],
  },
  whyThisFits: {
    title: 'Para avós perto, avós longe e netos que vivem noutro país',
    body: [
      'Quando a família está espalhada por Lisboa, Paris, Luxemburgo, Londres, Genebra ou Toronto, a língua passa a precisar de momentos bons. Uma história personalizada pode dar ao português um lugar natural: a hora de dormir, a chamada de domingo, a viagem a Portugal ou a receita que só a avó sabe explicar.',
      'Também pode incluir outras línguas e falares da família. Português com francês, inglês, alemão ou espanhol. Expressões de Trás-os-Montes, Madeira, Açores, Alentejo ou Mirandês. Sempre com leitura acompanhada por adultos e sem transformar a língua numa obrigação pesada.',
    ],
  },
  useCases: {
    title: 'Três formas de começar',
    intro:
      'A mesma página serve intenções diferentes, porque quem compra nem sempre é quem vai ler a história.',
    items: [
      {
        title: 'Do neto para a avó, o avô ou ambos',
        body: 'Uma história onde os netos dizem, através de uma aventura, porque os avós são importantes.',
      },
      {
        title: 'Dos avós para os netos',
        body: 'Uma memória de infância, uma receita, uma viagem ou uma frase de família transformada num livro para ler em conjunto.',
      },
      {
        title: 'Para famílias emigrantes',
        body: 'Uma história em português, bilingue ou com palavras explicadas para manter viva a língua da família.',
      },
    ],
  },
  personalization: {
    title: 'Comece com 5 detalhes simples',
    intro:
      'Não precisa de saber escrever. Basta escolher alguns detalhes; a história nasce a partir daí e pode ser ajustada antes de oferecer.',
    ctaLabel: 'Criar a minha história dos avós',
    groups: [
      {
        title: 'Quem entra',
        body: 'Escolha as pessoas que aparecem como personagens.',
        choices: ['Avó', 'Avô', 'Avó e avô', 'Irmãos', 'Primos'],
        iconSrc: `${iconBase}/fa-users-papercut.webp`,
        iconAlt: 'Ícone papercut de família',
      },
      {
        title: 'Para quem',
        body: 'Adapte a história ao leitor e ao momento de leitura.',
        choices: ['Um neto', 'Vários netos', 'Família inteira', 'Leitura ao colo'],
        iconSrc: `${iconBase}/fa-child-careful-ages-papercut.webp`,
        iconAlt: 'Ícone papercut de criança',
      },
      {
        title: 'Tipo de história',
        body: 'Escolha a semente narrativa que faz sentido para a vossa família.',
        choices: ['Receita secreta', 'Mapa da aldeia', 'Viagem às raízes', 'Carta dos avós'],
        iconSrc: `${iconBase}/fa-route-papercut.webp`,
        iconAlt: 'Ícone papercut de percurso',
      },
      {
        title: 'Tom',
        body: 'Dê à história o ritmo certo para a idade e para o momento.',
        choices: ['Terno', 'Divertido', 'Mágico', 'Aventureiro', 'Para dormir'],
        iconSrc: `${iconBase}/fa-magic-papercut.webp`,
        iconAlt: 'Ícone papercut de magia',
      },
      {
        title: 'Língua e detalhes',
        body: 'Inclua palavras de casa, expressões locais e idiomas da família.',
        choices: ['Português', 'Bilingue', 'Mirandês', 'Receita', 'Fotografia'],
        iconSrc: `${iconBase}/fa-globe-americas-papercut.webp`,
        iconAlt: 'Ícone papercut de globo',
      },
    ],
  },
  agePaths: {
    title: 'Como fomentar a imaginação em várias idades',
    intro:
      'O Mythoria pode começar por uma conversa curta ou por uma memória. Depois, a criança participa conforme a idade: apontando, escolhendo, desenhando, ditando ou revendo.',
    items: [
      {
        ageRange: '3-5 anos',
        title: 'Escolher e repetir palavras de casa',
        body: 'Histórias curtas, visuais e sonoras, com nomes, animais, objetos queridos e frases que a criança já reconhece.',
        steps: [
          'O adulto escolhe avós, neto e lugar familiar.',
          'A criança escolhe um objeto, uma cor ou um animal.',
          'A história repete palavras-chave em português.',
        ],
        exampleTitle: 'A Avó que Guardava Estrelas',
        exampleBody:
          'Uma história para dormir em que cada estrela ensina uma palavra de casa: colo, pão, rua, beijo, saudade.',
        imageSrc: `${sampleBookBase}/a-receita-das-estrelas-da-avo/cover.jpeg`,
        imageAlt: 'Capa do livro “A Receita das Estrelas da Avó” com avó, neto e cozinha iluminada',
      },
      {
        ageRange: '6-9 anos',
        title: 'Construir uma aventura com memórias reais',
        body: 'A criança escolhe pistas, lugares e personagens; os avós entram como guias, inventores ou guardiões de segredos.',
        steps: [
          'Comece com uma receita, uma aldeia ou uma fotografia.',
          'Peça à criança para escolher o problema da aventura.',
          'Revejam juntos o título, a capa e uma frase preferida.',
        ],
        exampleTitle: 'A Receita Secreta da Avó Rosa',
        exampleBody:
          'A farinha desaparece da cozinha e só uma pista escrita num azulejo ajuda a descobrir o ingrediente secreto.',
        imageSrc: `${sampleBookBase}/o-comboio-dos-domingos-do-avo/cover.jpeg`,
        imageAlt:
          'Capa do livro “O Comboio dos Domingos do Avô” com avô, neto e estação portuguesa',
      },
      {
        ageRange: '10-12 anos',
        title: 'Investigar raízes, língua e identidade',
        body: 'Os mais velhos podem comparar palavras, entrevistar os avós e transformar uma história familiar numa aventura com capítulos.',
        steps: [
          'Gravem uma memória curta dos avós ou escrevam três perguntas.',
          'Escolham português, bilingue ou palavras de uma região.',
          'Transformem a memória num mapa, missão ou diário de viagem.',
        ],
        exampleTitle: 'A Mala das Palavras Portuguesas',
        exampleBody:
          'Uma neta em França descobre que cada palavra portuguesa guardada na mala abre uma porta para uma memória da família.',
        imageSrc: `${sampleBookBase}/o-jardim-das-fotografias-antigas/cover.jpeg`,
        imageAlt:
          'Capa do livro “O Jardim das Fotografias Antigas” com avó, netos e fotografias no jardim',
      },
    ],
  },
  diaspora: {
    title: 'Para famílias portuguesas que vivem entre duas línguas',
    body: [
      'Muitos netos crescem longe de Portugal. Às vezes percebem português, mas respondem noutra língua. Às vezes conhecem a avó por videochamada, mas ainda não conhecem a aldeia, a praia, a receita ou as palavras que fazem parte da família.',
      'Uma história personalizada ajuda a criar contexto: a criança não está a decorar vocabulário, está a seguir uma aventura onde cada palavra tem uma pessoa, um cheiro, uma rua e uma memória por trás.',
    ],
    options: [
      {
        title: 'Português com palavras explicadas',
        body: 'Ideal quando a criança percebe português, mas precisa de pequenas ajudas dentro da própria história.',
        iconSrc: `${iconBase}/fa-info-circle-papercut.webp`,
        iconAlt: 'Ícone papercut de informação',
      },
      {
        title: 'História bilingue',
        body: 'Português com francês, inglês, alemão ou espanhol para famílias que leem em duas línguas.',
        iconSrc: `${iconBase}/fa-globe-americas-papercut.webp`,
        iconAlt: 'Ícone papercut de globo',
      },
      {
        title: 'Falares e expressões locais',
        body: 'Inclua expressões de casa, palavras regionais ou Mirandês quando fizer sentido para a família.',
        iconSrc: `${iconBase}/fa-music-papercut.webp`,
        iconAlt: 'Ícone papercut de música',
      },
      {
        title: 'Primeira viagem a Portugal',
        body: 'Transforme a próxima visita numa história com aeroporto, abraço, casa, praia, aldeia e mesa cheia.',
        iconSrc: `${iconBase}/fa-route-papercut.webp`,
        iconAlt: 'Ícone papercut de rota',
      },
    ],
    languageExamples: [
      {
        label: 'Português de Portugal',
        phrase: '“Vamos pôr a mesa, que a sopa já cheira a casa.”',
        note: 'Para famílias que querem leitura natural em pt-PT, como se fala em Lisboa.',
      },
      {
        label: 'Português + francês',
        phrase: '“A avó disse saudade. Mamie explicou: é quando o coração se lembra.”',
        note: 'Para netos em França, Luxemburgo, Suíça ou Bélgica.',
      },
      {
        label: 'Português + inglês',
        phrase: '“O Grandpa sabia uma palavra difícil: desenrascar. It means finding a way.”',
        note: 'Para famílias no Reino Unido, Irlanda, Canadá ou EUA.',
      },
      {
        label: 'Mirandês ou palavras locais',
        phrase: '“Lhéngua de casa também conta histórias, mesmo quando aparece só numa frase.”',
        note: 'Para preservar expressões familiares com revisão adulta antes de publicar.',
      },
    ],
  },
  carefulBenefits: {
    title: 'O que pode entrar na história',
    items: [
      {
        title: 'Nomes dos avós, netos, irmãos, primos ou animais de estimação.',
        body: '',
        iconSrc: `${iconBase}/characters.webp`,
        iconAlt: 'Ícone papercut de personagens',
      },
      {
        title: 'Aldeia, bairro, praia, jardim, casa de férias ou país onde vivem.',
        body: '',
        iconSrc: `${iconBase}/fa-route-papercut.webp`,
        iconAlt: 'Ícone papercut de percurso',
      },
      {
        title: 'Receitas, canções, alcunhas, expressões e pequenos rituais.',
        body: '',
        iconSrc: `${iconBase}/fa-heart-papercut.webp`,
        iconAlt: 'Ícone papercut de coração',
      },
      {
        title: 'Fotografias ou memórias para inspirar personagens e cenários.',
        body: '',
        iconSrc: `${iconBase}/fa-camera-papercut.webp`,
        iconAlt: 'Ícone papercut de câmara',
      },
      {
        title: 'Português, história bilingue ou palavras de um falar da família.',
        body: '',
        iconSrc: `${iconBase}/fa-globe-americas-papercut.webp`,
        iconAlt: 'Ícone papercut de globo',
      },
    ],
  },
  books: [
    {
      id: 'book-01',
      title: 'A Receita das Estrelas da Avó',
      synopsis:
        'Numa cozinha com azulejos azuis, a avó Celeste ensina o neto Nuno a fazer bolinhos de canela. Quando a farinha começa a brilhar, cada estrela que sai da tigela guarda uma palavra de casa.',
      excerpt:
        'A avó dizia que as receitas não começavam nos ingredientes. Começavam nas mãos de quem chamava a família para a mesa.',
      imageSrc: `${sampleBookBase}/a-receita-das-estrelas-da-avo/feature.jpeg`,
      imageAlt:
        'Livro físico “A Receita das Estrelas da Avó” numa cozinha portuguesa com receita e canela',
      styleLabel: 'Lápis de cor',
      contextLabel: 'Português',
      ageLabel: '4-7 anos',
      chapterCountLabel: '4 capítulos',
      durationLabel: 'Áudio 34 s',
      audioSampleSrc: `${sampleBookBase}/a-receita-das-estrelas-da-avo/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'A primeira estrela de canela',
        imageSrc: `${sampleBookBase}/a-receita-das-estrelas-da-avo/cover.jpeg`,
        imageAlt: 'Capa ilustrada do livro “A Receita das Estrelas da Avó”',
        paragraphs: [
          'O Nuno chegou à cozinha da avó Celeste com as mangas arregaçadas e uma pergunta muito séria. “Hoje posso mexer a massa sozinho?” A avó olhou por cima dos óculos. Tinha farinha no avental, uma colher de pau na mão e aquele sorriso que aparecia sempre antes de uma surpresa.',
          '“Sozinho, sozinho, não. Uma receita gosta de companhia.” Em cima da mesa havia ovos, açúcar, farinha, canela e uma folha antiga escrita com letra redonda. O papel tinha uma dobra no canto e uma mancha pequenina que a avó dizia ser de chá. Nuno achava que talvez fosse de aventura.',
          'Quando a avó lhe entregou a colher de pau, Nuno segurou-a com as duas mãos. “Que palavra digo?” A avó pensou um bocadinho. “Diz uma palavra que te faça lembrar casa.” Nuno mexeu a massa devagar. Primeiro para a direita. Depois para a esquerda.',
          '“Colo”, disse Nuno. No fundo da tigela, uma luz acendeu-se. Pequena. Dourada. Quase tímida. A luz subiu no ar e tomou forma de estrela. Não era maior do que uma noz, mas iluminou a cozinha inteira como se soubesse um segredo.',
          'A estrela deu uma volta por cima da mesa e pousou no papel da receita. Onde tocou, apareceu uma nova linha: “Mexer com paciência até a cozinha cheirar a abraço.” Nuno leu a frase devagar. Ainda tropeçava em algumas palavras, mas a avó esperava sempre. Esperava como quem deixa o pão crescer.',
          'Quando a massa ficou pronta, a avó ensinou-o a fazer pequenas bolinhas. Algumas saíram redondas, outras ficaram tortas, e uma parecia um sapato. A avó não se importou. “Nas famílias, nem todos os bolinhos precisam de ser iguais.”',
          'O forno fez plim. Um cheiro quente espalhou-se pela cozinha: canela, açúcar e uma coisa que Nuno não sabia dizer. Talvez fosse colo. Talvez fosse domingo. Talvez fosse a palavra casa a aprender a voar.',
          'Quando mordeu o primeiro bolinho, uma estrela brilhou dentro dele por um instante. “Avó”, disse Nuno, de boca quase cheia, “acho que a receita funcionou.” A avó Celeste limpou-lhe uma migalha do queixo. “Então guarda bem a primeira estrela. As melhores receitas são as que uma família consegue contar outra vez.”',
        ],
      },
    },
    {
      id: 'book-02',
      title: 'O Comboio dos Domingos do Avô',
      synopsis:
        'Todos os domingos, o avô Artur guarda um bilhete antigo no bolso. Quando o neto Tiago o abre, o comboio da estação passa a parar em lugares feitos de memórias da família.',
      excerpt:
        'O bilhete não dizia destino. Dizia apenas: domingo, banco da janela, levar perguntas para o avô.',
      imageSrc: `${sampleBookBase}/o-comboio-dos-domingos-do-avo/feature.jpeg`,
      imageAlt:
        'Livro físico “O Comboio dos Domingos do Avô” num banco de estação portuguesa com bilhetes antigos',
      styleLabel: 'Aguarela',
      contextLabel: 'Memórias de domingo',
      ageLabel: '7-10 anos',
      chapterCountLabel: '5 capítulos',
      durationLabel: 'Áudio 33 s',
      audioSampleSrc: `${sampleBookBase}/o-comboio-dos-domingos-do-avo/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'O bilhete que perguntava',
        imageSrc: `${sampleBookBase}/o-comboio-dos-domingos-do-avo/cover.jpeg`,
        imageAlt: 'Capa ilustrada do livro “O Comboio dos Domingos do Avô”',
        paragraphs: [
          'O Tiago sabia três coisas sobre os domingos. A primeira: o avô Artur chegava sempre cinco minutos antes da hora marcada. A segunda: trazia rebuçados de limão no bolso esquerdo. A terceira: nunca se sentava no comboio sem cumprimentar primeiro o revisor.',
          'Naquele domingo, porém, o avô trouxe uma quarta coisa. “Isto era do meu pai”, disse ele, tirando um bilhete antigo da carteira. O papel era grosso, amarelado e tinha as pontas gastas. Em vez de destino, lia-se apenas: “Domingo. Banco da janela. Levar perguntas.”',
          'Entraram na carruagem amarela. Tiago sentou-se junto à janela, como sempre, e encostou o bilhete ao vidro. Quando o comboio arrancou, o bilhete aqueceu na mão dele. As letras começaram a mudar: “Qual foi a primeira coisa que o avô aprendeu sozinho?”',
          '“Aprendi a andar de bicicleta numa rua inclinada demais.” O comboio apitou. A paisagem lá fora ondulou como aguarela molhada. A estação seguinte não tinha o nome de nenhuma vila. A placa dizia: “Rua da Bicicleta Teimosa.”',
          'Desceram para a plataforma. Não havia mais passageiros. Havia uma rua estreita, uma bicicleta vermelha encostada a um muro e um rapaz de joelhos esfolados a tentar levantar-se sem chorar. Tiago percebeu que o rapaz tinha os olhos do avô.',
          'O bilhete brilhou outra vez. Uma nova pergunta apareceu: “Quem esperou por ti quando demoraste?” O avô passou o polegar pelo papel. “A minha mãe. Sempre à janela.”',
          'A estação seguinte chamava-se “Janela da Luz Acesa”. Depois veio “Ponte das Histórias Pequenas”. Depois “Praia Onde Aprendi a Esperar”. Em cada lugar, o bilhete fazia uma pergunta. Em cada resposta, Tiago via um bocadinho do avô antes de ser avô.',
          'Quando regressaram à estação verdadeira, o relógio marcava quase a mesma hora de antes. Tiago guardou o bilhete com cuidado entre as páginas do seu caderno. “No próximo domingo posso trazer uma pergunta minha?” O avô pousou-lhe a mão no ombro. “Podes trazer quantas quiseres. Os comboios gostam de netos curiosos.”',
        ],
      },
    },
    {
      id: 'book-03',
      title: 'A Mala que Falava Português',
      synopsis:
        'Lia vive longe de Portugal e entende muitas palavras, mas responde noutra língua. Quando recebe uma mala pequena dos avós, cada objeto lá dentro só acorda quando ela tenta uma palavra portuguesa.',
      excerpt:
        'A palavra saudade não saiu perfeita. Mesmo assim, a mala abriu-se como se tivesse esperado por aquela tentativa.',
      imageSrc: `${sampleBookBase}/a-mala-que-falava-portugues/feature.jpeg`,
      imageAlt:
        'Livro físico “A Mala que Falava Português” numa mesa de cabeceira com mala pequena e postais portugueses',
      styleLabel: 'Desenho à mão',
      contextLabel: 'Português de herança',
      ageLabel: '6-10 anos',
      chapterCountLabel: '5 capítulos',
      durationLabel: 'Áudio 36 s',
      audioSampleSrc: `${sampleBookBase}/a-mala-que-falava-portugues/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'A palavra que destrancou a mala',
        imageSrc: `${sampleBookBase}/a-mala-que-falava-portugues/cover.jpeg`,
        imageAlt: 'Capa ilustrada do livro “A Mala que Falava Português”',
        paragraphs: [
          'A Lia percebia português melhor do que dizia. Percebia quando a avó perguntava, no ecrã do tablet, se ela já tinha jantado. Percebia quando o avô dizia “estás tão crescida” com aquela voz de quem se admirava todas as semanas.',
          'Numa quarta-feira de chuva, chegou uma encomenda de Portugal. Dentro estava uma mala pequena. Não era mala de férias. Era mais antiga, de couro castanho, com uma pega gasta e dois fechos dourados. Ao lado vinha um bilhete: “Para a Lia abrir com uma palavra de casa.”',
          'Lia tentou “hello”. Nada. Tentou “bonjour”, porque era a palavra que usava na escola. Nada. Tentou “olá”, muito baixinho. O fecho fez tic. “Funcionou!” disse o pai. “Só um bocadinho”, respondeu Lia.',
          'O segundo fecho continuava fechado. No bilhete, havia uma pista: “A primeira palavra está dentro do coração quando temos saudades.” Lia conhecia aquela palavra. A avó dizia-a muitas vezes. O difícil era pôr a palavra inteira na boca.',
          '“Sau...” começou. Parou. A mala esperou. “Saudade.” Não saiu perfeito. Saiu com uma ponta estrangeira e outra portuguesa, como muitas coisas na vida dela. Mas o fecho abriu-se.',
          'De dentro da mala saiu uma luz quente, da cor do pão acabado de cortar. Havia postais de Lisboa, uma fotografia de uma praia com vento, uma fita verde e vermelha, um azulejo pequenino, um caderno e um elétrico de brincar.',
          'No fundo da mala havia envelopes com palavras. Lia abriu o primeiro: “colo”. A palavra estava escrita em azul e tinha uma seta para a fotografia da avó sentada no sofá. “Colo é lap?” perguntou Lia. O pai sentou-se ao lado dela. “É parecido. Mas colo também é quando uma pessoa vira lugar.”',
          'Nessa noite, antes de dormir, escolheu três envelopes para a semana: “pão”, “obrigada” e “amanhã”. Não prometeu falar português perfeito. A mala também não pediu isso. Só parecia pedir que ela tentasse.',
        ],
      },
    },
    {
      id: 'book-04',
      title: 'O Jardim das Fotografias Antigas',
      synopsis:
        'Marta e Simão ajudam a avó Irene a pendurar fotografias no jardim. Ao pôr cada fotografia contra a luz, descobrem caminhos para lugares de que a família fala, mas que eles ainda não conhecem.',
      excerpt:
        'A fotografia era pequena, mas quando a avó a segurou contra o sol, abriu uma rua inteira dentro da tarde.',
      imageSrc: `${sampleBookBase}/o-jardim-das-fotografias-antigas/feature.jpeg`,
      imageAlt:
        'Livro físico “O Jardim das Fotografias Antigas” numa mesa de jardim com fotografias antigas',
      styleLabel: 'Aguarela',
      contextLabel: 'Fotografias de família',
      ageLabel: '10-12 anos',
      chapterCountLabel: '6 capítulos',
      durationLabel: 'Áudio 31 s',
      audioSampleSrc: `${sampleBookBase}/o-jardim-das-fotografias-antigas/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'A fotografia que tinha vento',
        imageSrc: `${sampleBookBase}/o-jardim-das-fotografias-antigas/cover.jpeg`,
        imageAlt: 'Capa ilustrada do livro “O Jardim das Fotografias Antigas”',
        paragraphs: [
          'A avó Irene guardava fotografias em caixas de sapatos. Não era por falta de álbuns. Tinha três álbuns grandes, com capas grossas, mas dizia que algumas fotografias gostavam de respirar antes de ficarem presas entre páginas.',
          'Naquela tarde, chamou Marta e Simão para o jardim. Em cima da mesa havia molas de madeira, fio de algodão e uma caixa cheia de fotografias antigas. Algumas estavam a preto e branco. Outras tinham cores desmaiadas, como se o tempo lhes tivesse bebido um pouco da tinta.',
          'Marta pegou numa fotografia pequena. Mostrava uma rua de pedra, uma bicicleta encostada a uma parede e uma rapariga com tranças a rir-se de alguma coisa fora da imagem. “És tu?” A avó aproximou-se. “Sou eu antes de saber que um dia teria netos curiosos.”',
          'Marta prendeu a fotografia no fio. A luz atravessou o papel e, por um segundo, a imagem mexeu-se. A bicicleta abanou. A saia da rapariga levantou-se com uma rajada de vento. Do interior da fotografia veio um cheiro a terra quente.',
          'Foram pendurando fotografias. Uma praia com vento. Um quintal com galinhas. Um casal junto a uma camioneta. Uma criança em cima de um muro. Em cada imagem, a avó fazia uma pergunta antes de contar qualquer coisa.',
          'No fundo da caixa, havia uma fotografia dobrada. Estava mais gasta do que as outras. Mostrava uma casa amarela com uma janela azul. A avó Irene ficou muito quieta. “Esta era a casa da minha avó.”',
          'Quando penduraram a fotografia, a janela azul abriu-se. Não apareceu uma pessoa. Apareceu vento. Um vento morno, com cheiro a limão, sabão e sopa ao lume. Passou pelo jardim verdadeiro, mexeu nas folhas da figueira e levantou uma ponta do cabelo da avó.',
          'No verso da fotografia, Marta escreveu: “Casa amarela da bisavó. Cheiro a limão. Janela azul. Vento que ainda sabe voltar.” Simão acrescentou: “Perguntar à avó pela sopa.” E, naquela tarde, Marta decidiu que as fotografias antigas não eram coisas paradas. Eram perguntas à espera de uma família.',
        ],
      },
    },
    {
      id: 'book-05',
      title: 'As Férias na Casa Amarela',
      synopsis:
        'Dois irmãos chegam à casa amarela dos avós para as férias. Entre primos, praia, mercado e palavras novas, descobrem que falar português pode ser uma brincadeira de equipa.',
      excerpt:
        'No primeiro dia disseram hello ao mar. No segundo, já corriam pela areia a gritar olá como quem descobria uma porta secreta.',
      imageSrc: `${sampleBookBase}/as-ferias-na-casa-amarela/feature.jpeg`,
      imageAlt:
        'Livro físico “As Férias na Casa Amarela” numa mesa de verão junto a casa portuguesa amarela',
      styleLabel: 'Banda desenhada europeia',
      contextLabel: 'Português + inglês',
      ageLabel: '7-11 anos',
      chapterCountLabel: '6 capítulos',
      durationLabel: 'Áudio 30 s',
      audioSampleSrc: `${sampleBookBase}/as-ferias-na-casa-amarela/audio-teaser.mp3`,
      audioSampleTitle: 'Ouvir excerto narrado',
      sampleChapter: {
        title: 'O primeiro olá ao mar',
        imageSrc: `${sampleBookBase}/as-ferias-na-casa-amarela/cover.jpeg`,
        imageAlt: 'Capa ilustrada do livro “As Férias na Casa Amarela”',
        paragraphs: [
          'A casa dos avós era amarela mesmo a sério. Não era amarelo discreto, nem amarelo de lápis gasto. Era amarelo de sol inteiro, com janelas verdes, vasos de manjericos e uma porta que parecia estar sempre quase a rir.',
          'Tomás saiu do carro com a mochila às costas e uma palavra presa na língua. “Hello”, disse ele, antes de se lembrar. A avó Lurdes abriu os braços. “Olá também serve melhor aqui.” Tomás tentou repetir. “O-lá.”',
          'Do outro lado do muro, apareceram os primos. Eram três, falavam depressa e pareciam conhecer atalhos para todos os sítios importantes. O mais velho, Rui, apontou para a rua. “Vamos ao mar?” Tomás percebeu “mar”. Essa palavra era fácil. Parecia o som que fazia.',
          'Quando chegaram à praia, o mar estava enorme. Clara tirou as sandálias. “Hello, sea!” Os primos riram-se, mas não de uma forma má. “Aqui dizemos olá ao mar”, explicou Rui. Clara pôs as mãos à volta da boca. “Olá, mar!”',
          'Uma onda veio mais longe do que as outras e molhou-lhe os pés. Clara gritou e fugiu, a rir. “Respondeu!” O avô Joaquim abriu o mapa, embora o vento tentasse fechá-lo. “Hoje a palavra é chegar.”',
          '“Como arrive?” perguntou Tomás. “Parecido”, disse o avô. “Mas chegar também é quando o coração percebe que já pode pousar a mala.” Tomás olhou para a casa amarela lá em cima, pequena entre telhados.',
          '“Chegar”, repetiu ele. A palavra saiu melhor do que esperava. Então aconteceu uma coisa estranha. O mapa do avô mexeu-se. A linha azul que marcava o caminho até à praia começou a brilhar. Depois desenhou sozinha mais três caminhos: mercado, fonte, casa amarela.',
          'Ao fim da tarde, voltaram à casa amarela. A avó Lurdes estava à porta. “Então? Já sabem chegar?” Tomás olhou para Clara. Clara olhou para os primos. Todos olharam para o mar ao fundo da rua. “Sabemos”, disse Tomás. “Chegar é quando a casa nos reconhece.”',
        ],
      },
    },
  ],
  process: {
    title: 'Como transformar uma memória num livro',
    steps: [
      'Escolha quem entra na história: avó, avô, neto, neta, irmãos, primos ou família inteira.',
      'Adicione memórias ou detalhes: receita, frase, fotografia, viagem, tradição ou lugar especial.',
      'Escolha o estilo: terno, divertido, mágico, aventureiro, para dormir ou bilingue.',
      'Leia, ajuste e ofereça por link privado, áudio, PDF, livro digital ou livro físico quando disponível.',
    ],
  },
  formats: {
    title: 'Não é só uma história. É um presente completo.',
    items: [
      'Livro digital para enviar no próprio dia.',
      'Audiobook para ouvir antes de dormir ou em videochamada.',
      'Link privado para partilhar por WhatsApp ou email.',
      'PDF/self-print e livro físico quando disponível para a morada.',
    ],
  },
  forProfessionals: {
    title: 'Garantia e Prazos do Dia dos Avós',
    body: [
      'O Dia dos Avós celebra-se a 26 de julho. A versão digital, o audiolivro e o link privado ficam disponíveis imediatamente após a criação no seu telemóvel.',
      'Para receber o livro físico impresso em capa dura a tempo da festa, encomende com 3 a 5 dias úteis de antecedência.',
    ],
    ctaLabel: 'Criar o Nosso Livro dos Avós',
    ctaHref: `/pt-PT/tell-your-story/step-1?landingSlug=${slug}&primaryIntent=grandparents`,
  },
  faq: [
    {
      question: 'Quanto custa e como recebo o livro?',
      answer:
        'Pode começar e pré-visualizar a sua história gratuitamente. A versão digital e audiolivro estão disponíveis imediatamente. O livro impresso em capa dura tem entrega rápida na sua morada em 3 a 5 dias úteis com embalagem de presente.',
    },
    {
      question: 'O livro físico chega a tempo do Dia dos Avós?',
      answer:
        'Sim! Para garantir a entrega a tempo de 26 de julho, encomende com pelo menos 3 a 5 dias úteis de antecedência. Se encomendar em cima da hora, a versão digital e o audiolivro ficam disponíveis na hora para oferecer.',
    },
    {
      question: 'Fazem entregas para netos e avós no estrangeiro (França, Suíça, UK, etc.)?',
      answer:
        'Sim! Enviamos livros impressos em capa dura para toda a Europa, Reino Unido, EUA e Canadá. É uma excelente forma de encurtar distâncias e surpreender a família.',
    },
    {
      question: 'O que oferecer no Dia dos Avós?',
      answer:
        'Um livro personalizado é uma opção com significado: inclui nomes, memórias e detalhes da família, e pode ser lido, ouvido, partilhado ou guardado.',
    },
    {
      question: 'Como criar um livro personalizado para os avós?',
      answer:
        'Comece por escolher avó, avô e netos, junte uma memória ou tradição, escolha o tom da história e reveja o resultado antes de oferecer.',
    },
    {
      question: 'Posso incluir a avó, o avô e vários netos na mesma história?',
      answer:
        'Sim. Pode incluir um ou vários netos, irmãos, primos, pais e outros familiares, desde que a história continue clara para a criança.',
    },
    {
      question: 'Dá para criar uma história para netos que vivem no estrangeiro?',
      answer:
        'Sim. Pode criar a história em português, bilingue ou com palavras explicadas, para netos que vivem fora de Portugal.',
    },
    {
      question: 'A história pode ser em português e noutra língua?',
      answer:
        'Sim. Pode combinar português com francês, inglês, alemão, espanhol ou outra língua usada pela família.',
    },
    {
      question: 'Posso incluir Mirandês ou expressões regionais?',
      answer:
        'Sim, desde que a família reveja as palavras e a grafia antes de publicar ou imprimir. O objetivo é preservar o falar de casa com cuidado.',
    },
    {
      question: 'Posso incluir fotografias, receitas ou memórias reais?',
      answer:
        'Sim. Fotografias, receitas, frases e lugares podem inspirar personagens, cenários e cenas, sempre com consentimento e revisão adulta.',
    },
    {
      question: 'Posso enviar a história por WhatsApp?',
      answer:
        'Sim. Pode partilhar um link privado por WhatsApp ou email, além de usar PDF, áudio ou livro físico quando disponível.',
    },
    {
      question: 'Quanto tempo demora a criar uma história?',
      answer:
        'Pode começar em poucos minutos com detalhes simples. Depois deve reservar algum tempo para rever nomes, tom, imagens e detalhes familiares.',
    },
    {
      question: 'A história é privada?',
      answer:
        'As histórias podem ser partilhadas por link privado. Antes de tornar qualquer exemplo público, confirme que não inclui dados pessoais sensíveis.',
    },
    {
      question: 'Posso editar antes de oferecer?',
      answer:
        'Sim. Recomendamos rever texto, nomes, idioma, imagens e dedicatória antes de enviar, imprimir ou transformar em livro físico.',
    },
    {
      question: 'O Mythoria é indicado para crianças pequenas?',
      answer:
        'Sim, com acompanhamento adulto. Para crianças pequenas, use histórias curtas, repetição, imagens claras e momentos de leitura partilhada.',
    },
    {
      question: 'Posso criar uma história sobre avós que já faleceram?',
      answer:
        'Sim, com cuidado. Pode criar uma história de memória e homenagem, evitando prometer conforto ou substituir conversas familiares importantes.',
    },
    {
      question: 'Qual é a diferença face a um livro personalizado tradicional?',
      answer:
        'O Mythoria permite partir de memórias, fotografias, receitas, idiomas e detalhes familiares específicos, com formatos digitais, áudio, PDF e livro físico quando disponível.',
    },
  ],
  finalCta: {
    title: 'Comece com uma memória pequena.',
    body: 'Uma receita, uma palavra, uma fotografia ou uma chamada de domingo podem ser suficientes. A magia da Mythoria ajuda a transformar esse ponto de partida num livro para ler, ouvir, partilhar e guardar.',
  },
  structuredData: {
    about: [
      'Livro personalizado para avós',
      'Livro personalizado para netos',
      'Dia dos Avós',
      'Português como língua de herança',
      'Histórias bilingues para crianças',
      'Famílias portuguesas emigrantes',
    ],
    serviceName: 'Livro personalizado Mythoria para avós e netos',
    serviceType: 'Livro personalizado, audiolivro, PDF e história digital',
  },
};
