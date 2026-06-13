import type { LandingPageContent } from './types';

const slug = 'livro-personalizado-criancas-autistas';
const assetBase = `/landing-page-assets/${slug}`;

export const autismStoriesLandingPage: LandingPageContent = {
  slug,
  locale: 'pt-PT',
  title: 'Livros personalizados para crianças com PEA e PHDA',
  metaTitle: 'Livros personalizados para crianças com PEA e PHDA | Mythoria',
  metaDescription:
    'Histórias personalizadas para crianças com PEA ou PHDA: use interesses e rotinas para antecipar situações novas, como o dentista ou a escola. Ler, ouvir ou imprimir.',
  primaryIntent: 'personalised_autism_stories',
  riskRating: 'yellow',
  updatedAt: '2026-06-13',
  indexable: true,
  breadcrumbLabel: 'Livros para crianças com PEA e PHDA',
  ogImageSrc: `${assetBase}/hero/og-cover.jpg`,
  primaryCta: 'Começar a minha história',
  secondaryCta: 'Ver exemplos',
  hero: {
    eyebrow: 'Histórias personalizadas para PEA e PHDA',
    headline: 'Uma história feita com os detalhes que a criança já conhece e adora.',
    subheadline:
      'Transforme interesses, rotinas, pessoas e lugares familiares num livro personalizado para ler em conjunto, ouvir com calma, partilhar, imprimir ou guardar.',
    imageSrc: `${assetBase}/hero/neurodiversity-reading-moment.jpeg`,
    imageAlt:
      'Livro personalizado Mythoria “Beatriz e as Constelações” pousado num ambiente calmo, ao lado de um mapa de estrelas e de uma pequena lanterna',
  },
  quickAnswer: {
    title: 'Resposta rápida',
    body: 'Sim. Com a Mythoria pode criar um livro personalizado para uma criança com PEA (autismo) ou PHDA, a partir dos seus interesses, rotinas e memórias. Funciona como uma história de apoio — próxima das histórias sociais — para antecipar situações e tornar o dia mais previsível, com linguagem cuidadosa e sem promessas médicas. A história pode ser lida, ouvida, partilhada, impressa ou guardada.',
  },
  intro: {
    title: 'O que é a Mythoria?',
    body: [
      'A Mythoria cria livros personalizados a partir das suas ideias, memórias, fotografias ou detalhes importantes. Pode começar com algo simples: um fascínio por comboios, o caminho até à escola, uma avó que conta histórias, uma mochila azul, um cão que espera à porta.',
      'Depois, essa matéria-prima transforma-se numa história com personagens, tom, estilo visual, número de capítulos e formatos pensados para a sua família — e para a forma como a criança comunica, presta atenção e se sente segura.',
    ],
  },
  whyThisFits: {
    title: 'Porque faz sentido para crianças com PEA e PHDA',
    body: [
      'Muitas crianças neurodivergentes ligam-se melhor a histórias que reconhecem. Um detalhe familiar pode abrir a porta: uma rotina, uma frase repetida em casa, um interesse muito específico, um lugar onde a criança se sente bem. Ver uma situação antecipada numa história pode torná-la mais previsível e menos ansiosa.',
      'Esta página é para famílias, cuidadores e profissionais que querem criar uma leitura personalizada sem transformar a história numa promessa clínica. É um livro, não uma ferramenta médica: um objeto bonito para acompanhar um momento de leitura, escuta ou partilha.',
    ],
  },
  socialStoryExplainer: {
    title: 'O que é uma história social ou de apoio?',
    body: [
      'Uma história social (ou história de apoio) é uma narrativa curta e clara que descreve uma situação do dia a dia — o que vai acontecer, por que ordem e o que a criança pode esperar. Ajuda a antecipar, a explicar emoções e a tornar as transições mais previsíveis.',
      'Os livros personalizados da Mythoria inspiram-se nesta ideia: usam os interesses e a linguagem da criança para falar de rotinas, visitas ou mudanças. Não são histórias sociais clínicas nem substituem o trabalho de um profissional — são uma forma criativa e próxima de preparar o que vem a seguir.',
    ],
  },
  carefulBenefits: {
    title: 'Como uma história personalizada pode ajudar',
    items: [
      'Tornar a leitura mais próxima, familiar e relevante para a criança.',
      'Incluir interesses, rotinas, lugares e pessoas que a criança reconhece.',
      'Antecipar situações novas e tornar as transições mais previsíveis.',
      'Apoiar rotinas e momentos de atenção com passos simples e claros.',
      'Guardar memórias num formato bonito para partilhar ou imprimir.',
    ],
  },
  useCases: {
    title: 'Situações em que uma história pode ajudar',
    intro:
      'Os pais e os profissionais raramente procuram “um livro”; procuram ajuda para um momento concreto. Aqui ficam situações em que uma história personalizada pode preparar a criança — sempre como apoio, nunca como tratamento.',
    items: [
      {
        title: 'Preparar uma ida ao dentista',
        body: 'Uma história que mostra o caminho, a sala, a cadeira, os sons e os passos da consulta ajuda a criança com PEA a saber o que esperar e a chegar mais tranquila.',
      },
      {
        title: 'Explicar uma consulta médica ou análises',
        body: 'Antecipar quem vamos ver, o que vai acontecer e quanto tempo demora reduz a surpresa e a ansiedade em consultas e exames.',
      },
      {
        title: 'A entrada ou o regresso à escola',
        body: 'Conhecer a sala, a professora e a rotina do dia numa história torna o primeiro dia mais familiar e seguro.',
      },
      {
        title: 'Criar uma rotina da manhã',
        body: 'Uma sequência simples — acordar, vestir, pequeno-almoço, mochila — ajuda a organizar a manhã, algo especialmente útil para crianças com PHDA.',
      },
      {
        title: 'Lidar com barulho e sobrecarga sensorial',
        body: 'Uma história pode nomear os sons, sugerir estratégias calmas e mostrar um “canto seguro” para quando o ambiente fica intenso.',
      },
      {
        title: 'Preparar uma viagem de avião',
        body: 'Do check-in à descolagem, antecipar cada etapa torna uma viagem nova mais previsível e menos assustadora.',
      },
      {
        title: 'Antecipar uma festa de anos',
        body: 'Quem vai estar, o que vai acontecer e quando se cantam os parabéns — uma história ajuda a participar com mais conforto.',
      },
      {
        title: 'Falar sobre emoções',
        body: 'Personagens que reconhecem o que sentem ajudam a criança a dar nome às emoções e a encontrar formas de se acalmar.',
      },
      {
        title: 'Celebrar um interesse especial',
        body: 'Comboios, planetas, dinossauros ou números: partir do interesse da criança torna a leitura motivadora e profundamente sua.',
      },
    ],
  },
  books: [
    {
      id: 'book-01',
      title: 'Mateus e o Leão',
      synopsis:
        'O Mateus leva o seu leão para todo o lado. Quando precisa de coragem — numa consulta ou num lugar novo — o leão lembra-lhe que pode respirar fundo e dar um passo de cada vez.',
      excerpt:
        '“Vamos juntos”, sussurrou o Mateus ao leão. “Primeiro entramos, depois sentamo-nos. Eu seguro-te a ti, tu seguras-me a mim.”',
      imageSrc: `${assetBase}/books/book-01-watercolor-cover.jpg`,
      imageAlt:
        'Capa do livro personalizado “Mateus e o Leão”, com um menino a abraçar um leão, ao lado de um peluche num quarto acolhedor',
      styleLabel: 'Aguarela',
      contextLabel: 'Conforto e coragem',
    },
    {
      id: 'book-02',
      title: 'O Castelo de Estrelas da Maria',
      synopsis:
        'Ao deitar-se, a Maria transforma o quarto num castelo de estrelas. A história acompanha uma rotina de dormir calma, com luzes suaves e passos previsíveis até adormecer.',
      excerpt:
        '“Quando as estrelas se acendem”, disse a Maria, “é sinal de que o dia já pode descansar.”',
      imageSrc: `${assetBase}/books/book-02-calm-cover.jpeg`,
      imageAlt:
        'Capa do livro “O Castelo de Estrelas da Maria”, com uma menina na cama rodeada de estrelas brilhantes e um castelo ao fundo',
      styleLabel: 'Ilustração digital',
      contextLabel: 'Rotina de dormir',
    },
    {
      id: 'book-03',
      title: 'Turma 4.º A no Planetário do Porto',
      synopsis:
        'Antes da visita de estudo, a turma descobre numa história o que vai ver no planetário: as luzes baixas, o céu de estrelas e onde se sentar. Assim, o passeio novo já parece familiar.',
      excerpt:
        '“No planetário, as luzes apagam-se devagar”, explicou a professora. “E depois… aparece o céu inteiro.”',
      imageSrc: `${assetBase}/books/book-03-map-cover.jpeg`,
      imageAlt:
        'Capa do livro “Turma 4.º A no Planetário do Porto”, com um grupo de crianças a apontar para constelações',
      styleLabel: 'Arte digital',
      contextLabel: 'Visita a um lugar novo',
    },
    {
      id: 'book-04',
      title: 'A Nossa Horta de Descobertas',
      synopsis:
        'A Inês e o avô cuidam de uma horta passo a passo: cavar, semear, regar e esperar. Uma atividade prática e repetida que ajuda a manter a atenção e a celebrar cada pequena descoberta.',
      excerpt:
        '“Primeiro a semente, depois a água, depois a paciência”, riu o avô. “A horta gosta de uma ordem.”',
      imageSrc: `${assetBase}/books/book-04-family-cover.jpeg`,
      imageAlt:
        'Capa do livro “A Nossa Horta de Descobertas”, com uma menina com uma lupa e um avô a cuidarem de uma horta soalheira',
      styleLabel: 'Ilustração clássica',
      contextLabel: 'Atenção e atividade',
    },
    {
      id: 'book-05',
      title: 'Recordar o Avô Manuel',
      synopsis:
        'Uma família guarda memórias do avô Manuel: o banco junto ao rio, o cachecol cor de laranja, as histórias que contava. Uma forma serena de falar de saudade e de emoções.',
      excerpt:
        '“O avô gostava deste banco”, disse a mãe. “Podemos sentar-nos aqui e lembrar uma história de cada vez.”',
      imageSrc: `${assetBase}/books/book-05-keepsake-cover.jpeg`,
      imageAlt:
        'Capa do livro “Recordar o Avô Manuel”, em lápis de cor, com um banco e um cachecol com vista para uma vila junto ao rio',
      styleLabel: 'Lápis de cor',
      contextLabel: 'Memórias e emoções',
    },
  ],
  process: {
    title: 'Como funciona',
    steps: [
      'Traga uma memória, ideia, fotografia ou detalhe.',
      'Escolha personagens, estilo, tom e número de capítulos.',
      'Leia, oiça, partilhe, imprima ou guarde.',
    ],
  },
  formats: {
    title: 'Formatos disponíveis',
    items: [
      'Livro digital para ler no telemóvel, tablet ou computador.',
      'Audiolivro para ouvir com uma narração calma.',
      'PDF para imprimir em casa.',
      'Livro impresso, quando disponível para a sua morada.',
    ],
  },
  forProfessionals: {
    title: 'Para profissionais e terapeutas',
    body: [
      'Trabalha em terapia da fala, terapia ocupacional, psicologia infantil, educação especial ou numa associação ligada à PEA e à PHDA? A Mythoria pode ser uma ferramenta complementar para criar, com as famílias, histórias alinhadas com os objetivos de cada criança.',
      'Disponibilizamos histórias-demonstração, códigos de parceiro e packs profissionais para equipas que querem usar livros personalizados no seu trabalho. Fale connosco para explorar uma parceria.',
    ],
    ctaLabel: 'Falar sobre parcerias',
  },
  glossary: {
    title: 'Glossário',
    terms: [
      {
        term: 'PEA — Perturbação do Espectro do Autismo',
        definition:
          'Forma de neurodivergência que influencia a comunicação, a interação social e a maneira de processar estímulos. Cada criança é única; muitas beneficiam de rotina e previsibilidade.',
      },
      {
        term: 'PHDA — Perturbação de Hiperatividade e Défice de Atenção',
        definition:
          'Caracteriza-se por dificuldades de atenção, impulsividade e/ou agitação. Rotinas claras e passos simples ajudam a organizar o dia.',
      },
      {
        term: 'Neurodivergência',
        definition:
          'Termo que reconhece que os cérebros funcionam de formas diferentes. Inclui a PEA, a PHDA e outras formas de pensar, aprender e sentir.',
      },
      {
        term: 'História social',
        definition:
          'Narrativa curta que descreve uma situação e o que esperar dela, para ajudar a antecipar e a compreender. A Mythoria inspira-se nesta ideia, sem substituir materiais clínicos.',
      },
      {
        term: 'Previsibilidade e antecipação',
        definition:
          'Saber o que vai acontecer e por que ordem. Antecipar uma situação numa história pode reduzir a ansiedade e facilitar as transições.',
      },
    ],
  },
  faq: [
    {
      question: 'Posso criar uma história com interesses muito específicos?',
      answer:
        'Sim. Pode começar com comboios, mapas, planetas, animais, números, uma rotina, uma música, um objeto querido ou qualquer detalhe que faça sentido para a criança.',
    },
    {
      question: 'A Mythoria é uma ferramenta terapêutica?',
      answer:
        'Não. A Mythoria é uma forma criativa de transformar interesses, memórias e rotinas em histórias personalizadas. Não substitui acompanhamento médico, terapêutico, escolar ou familiar, mas pode complementá-lo.',
    },
    {
      question: 'Como preparar uma criança com PEA para uma ida ao dentista?',
      answer:
        'Crie uma história curta que mostre o caminho até ao dentista, a sala, a cadeira, os sons e os passos da consulta. Ver tudo antecipadamente ajuda a criança a saber o que esperar e a chegar mais tranquila.',
    },
    {
      question: 'O que é uma história social?',
      answer:
        'É uma narrativa curta que descreve uma situação e o que esperar dela, ajudando a antecipar e a compreender. Os livros da Mythoria inspiram-se nesta ideia, de forma personalizada e sem substituir materiais clínicos.',
    },
    {
      question: 'As histórias ajudam com rotinas e atenção (PHDA)?',
      answer:
        'Sim. Pode criar histórias com passos simples e claros para a rotina da manhã, os trabalhos de casa ou a hora de dormir, ajudando a organizar o dia e a manter a atenção.',
    },
    {
      question: 'Posso incluir fotografias?',
      answer:
        'Sim. Pode usar fotografias como inspiração para personagens, lugares, objetos ou memórias, sempre com cuidado e consentimento adequado.',
    },
    {
      question: 'Posso usar isto com a equipa de terapia ou na escola?',
      answer:
        'Sim. Muitas famílias criam as histórias em conjunto com terapeutas, psicólogos ou educadores. Temos também packs e códigos de parceiro para profissionais — fale connosco.',
    },
    {
      question: 'As histórias podem ser mais calmas?',
      answer:
        'Sim. Pode escolher um tom mais suave, com frases simples, ritmo tranquilo e menos intensidade emocional.',
    },
    {
      question: 'Os exemplos desta página são histórias reais?',
      answer:
        'Não. São conceitos ficcionais para mostrar caminhos possíveis. Qualquer história pública deve ser criada e revista separadamente.',
    },
  ],
  safetyNote: {
    title: 'Nota de confiança e segurança',
    body: 'A Mythoria não é uma ferramenta médica, terapêutica ou de diagnóstico. É uma forma criativa de transformar interesses, memórias e rotinas em histórias personalizadas para ler, ouvir, partilhar ou guardar. Pode ser usada como apoio complementar por pais, educadores, terapeutas ocupacionais, terapeutas da fala e psicólogos, mas não substitui o acompanhamento profissional. Para crianças, recomendamos sempre a criação e a leitura com o envolvimento de um adulto.',
  },
  finalCta: {
    title: 'Comece com um detalhe pequeno.',
    body: 'Um interesse, uma rotina, uma memória ou uma fotografia podem ser o primeiro fio. A magia da Mythoria ajuda a transformar esse fio numa história que pode viver nas mãos, nos ouvidos e na estante.',
  },
};
