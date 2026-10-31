import type { LocalizedText, SurveyDefinitionInput } from '@/lib/surveys/definition-schema';

/** Builds a fully localized string (argument order: en-US, pt-PT, es-ES, fr-FR, de-DE). */
const t = (
  enUS: string,
  ptPT: string,
  esES: string,
  frFR: string,
  deDE: string,
): LocalizedText => ({
  'en-US': enUS,
  'pt-PT': ptPT,
  'es-ES': esES,
  'fr-FR': frFR,
  'de-DE': deDE,
});

const OTHER = t('Something else', 'Outra coisa', 'Otra cosa', 'Autre chose', 'Etwas anderes');

/**
 * Survey C1 — registered users with no completed story.
 * Source of truth: Mythoria_Customer_Conversion_Research_Requirements.md, section 9.2.
 * Question ids, option ids and analysis dimensions are stable once published.
 */
export const activationNoStoryV1 = {
  schemaVersion: 1,
  id: 'activation_no_story',
  version: 1,
  purpose:
    'Separate curiosity and non-intent from workflow abandonment, uncertainty and lack of a starting idea among registered users who have not completed a story.',
  title: t(
    'Help us make your first story easier to create',
    'Ajude-nos a tornar a criação da sua primeira história mais fácil',
    'Ayúdanos a que crear tu primer cuento sea más fácil',
    'Aidez-nous à faciliter la création de votre première histoire',
    'Hilf uns, das Erstellen deiner ersten Geschichte einfacher zu machen',
  ),
  description: t(
    "You joined Mythoria but haven't completed a story yet. We'd love to understand what would help you get started.",
    'Registou-se no Mythoria, mas ainda não concluiu nenhuma história. Gostaríamos de perceber o que poderia ajudar a começar.',
    'Te registraste en Mythoria, pero todavía no has terminado ningún cuento. Nos gustaría entender qué te ayudaría a empezar.',
    "Vous avez rejoint Mythoria, mais vous n'avez pas encore terminé d'histoire. Nous aimerions comprendre ce qui vous aiderait à vous lancer.",
    'Du hast dich bei Mythoria angemeldet, aber noch keine Geschichte abgeschlossen. Wir möchten gern verstehen, was dir den Einstieg erleichtern würde.',
  ),
  intro: t(
    "Thanks for taking a moment to share your thoughts. This survey takes about 2–3 minutes. We'll use your feedback, together with how you use Mythoria, to understand and improve our experience. Your responses will not be published.",
    'Obrigado por dedicar um momento a partilhar a sua opinião. Este questionário demora cerca de 2–3 minutos. Vamos usar a sua opinião, em conjunto com a forma como utiliza o Mythoria, para compreender e melhorar a nossa experiência. As suas respostas não serão publicadas.',
    'Gracias por dedicar un momento a compartir tu opinión. Este cuestionario lleva unos 2–3 minutos. Usaremos tus comentarios, junto con cómo usas Mythoria, para entender y mejorar nuestra experiencia. Tus respuestas no se publicarán.',
    'Merci de prendre un instant pour partager votre avis. Ce questionnaire dure environ 2 à 3 minutes. Nous utiliserons vos retours, ainsi que la façon dont vous utilisez Mythoria, pour comprendre et améliorer notre expérience. Vos réponses ne seront pas publiées.',
    'Danke, dass du dir einen Moment Zeit nimmst, um uns deine Meinung mitzuteilen. Die Umfrage dauert etwa 2–3 Minuten. Wir nutzen dein Feedback zusammen mit deiner Nutzung von Mythoria, um unser Erlebnis zu verstehen und zu verbessern. Deine Antworten werden nicht veröffentlicht.',
  ),
  completionMessage: t(
    'Thank you! Your feedback helps us make Mythoria easier to use.',
    'Obrigado! A sua opinião ajuda-nos a tornar o Mythoria mais fácil de usar.',
    '¡Gracias! Tus comentarios nos ayudan a que Mythoria sea más fácil de usar.',
    'Merci ! Vos retours nous aident à rendre Mythoria plus simple à utiliser.',
    'Danke! Dein Feedback hilft uns, Mythoria einfacher zu machen.',
  ),
  estimatedMinutes: 3,
  responsePolicy: { identity: 'invitation', maxCompletedPerInvitation: 1 },
  rewardEligible: true,
  internalOnly: false,
  questions: [
    {
      id: 'A01',
      type: 'single_choice',
      dimension: 'primary_intent',
      required: true,
      label: t(
        'What originally brought you to Mythoria?',
        'Qual foi o seu motivo inicial para vir ao Mythoria?',
        '¿Qué fue lo que te trajo en un principio a Mythoria?',
        "Qu'est-ce qui vous a initialement amené sur Mythoria ?",
        'Was hat dich ursprünglich zu Mythoria gebracht?',
      ),
      options: [
        {
          id: 'child',
          label: t(
            'Create a story for a child',
            'Criar uma história para uma criança',
            'Crear un cuento para un niño o una niña',
            'Créer une histoire pour un enfant',
            'Eine Geschichte für ein Kind erstellen',
          ),
        },
        {
          id: 'memories',
          label: t(
            'Turn personal or family memories into a book',
            'Transformar memórias pessoais ou familiares num livro',
            'Convertir recuerdos personales o familiares en un libro',
            'Transformer des souvenirs personnels ou familiaux en livre',
            'Persönliche oder familiäre Erinnerungen in ein Buch verwandeln',
          ),
        },
        {
          id: 'gift',
          label: t(
            'Create a special gift',
            'Criar uma prenda especial',
            'Crear un regalo especial',
            'Créer un cadeau spécial',
            'Ein besonderes Geschenk erstellen',
          ),
        },
        {
          id: 'technology',
          label: t(
            'Try an AI storytelling tool',
            'Experimentar uma ferramenta de narração com IA',
            'Probar una herramienta de narración con IA',
            'Essayer un outil de narration par IA',
            'Ein KI-Tool zum Geschichtenerzählen ausprobieren',
          ),
        },
        {
          id: 'explore',
          label: t(
            'Just explore the platform',
            'Apenas explorar a plataforma',
            'Simplemente explorar la plataforma',
            'Simplement explorer la plateforme',
            'Die Plattform einfach mal erkunden',
          ),
        },
        { id: 'other', label: OTHER, allowOtherText: true },
      ],
    },
    {
      id: 'A02',
      type: 'buttons',
      selection: 'single',
      dimension: 'creation_attempt',
      required: true,
      label: t(
        'After signing up, did you try to create a story?',
        'Depois de se registar, tentou criar uma história?',
        'Después de registrarte, ¿intentaste crear un cuento?',
        'Après votre inscription, avez-vous essayé de créer une histoire ?',
        'Hast du nach der Registrierung versucht, eine Geschichte zu erstellen?',
      ),
      options: [
        {
          id: 'started',
          label: t(
            "Yes, but I didn't finish",
            'Sim, mas não terminei',
            'Sí, pero no la terminé',
            "Oui, mais je ne l'ai pas terminée",
            'Ja, aber ich habe sie nicht abgeschlossen',
          ),
        },
        {
          id: 'not_started',
          label: t(
            "No, I haven't started",
            'Não, ainda não comecei',
            'No, todavía no he empezado',
            "Non, je n'ai pas encore commencé",
            'Nein, ich habe noch nicht angefangen',
          ),
        },
        {
          id: 'dont_remember',
          label: t(
            "I don't remember",
            'Não me lembro',
            'No lo recuerdo',
            'Je ne m’en souviens pas',
            'Ich erinnere mich nicht',
          ),
        },
      ],
    },
    {
      id: 'A03A',
      type: 'single_choice',
      dimension: 'activation_barrier',
      required: true,
      visibleWhen: { question: 'A02', operator: 'equals', value: 'started' },
      label: t(
        'What made you stop?',
        'O que fez com que parasse?',
        '¿Qué te hizo parar?',
        "Qu'est-ce qui vous a fait arrêter ?",
        'Was hat dich zum Aufhören gebracht?',
      ),
      options: [
        {
          id: 'no_idea',
          label: t(
            "I wasn't sure what story to tell",
            'Não tinha a certeza de que história contar',
            'No tenía claro qué historia contar',
            'Je ne savais pas quelle histoire raconter',
            'Ich war mir nicht sicher, welche Geschichte ich erzählen sollte',
          ),
        },
        {
          id: 'too_many_steps',
          label: t(
            'There were too many steps',
            'Havia demasiados passos',
            'Había demasiados pasos',
            "Il y avait trop d'étapes",
            'Es gab zu viele Schritte',
          ),
        },
        {
          id: 'unclear_options',
          label: t(
            'Some options were confusing',
            'Algumas opções eram confusas',
            'Algunas opciones eran confusas',
            "Certaines options n'étaient pas claires",
            'Einige Optionen waren verwirrend',
          ),
        },
        {
          id: 'too_much_time',
          label: t(
            'It took more time than I expected',
            'Demorou mais tempo do que esperava',
            'Llevó más tiempo del que esperaba',
            'Cela a pris plus de temps que prévu',
            'Es hat länger gedauert, als ich erwartet hatte',
          ),
        },
        {
          id: 'technical_issue',
          label: t(
            'I had a technical problem',
            'Tive um problema técnico',
            'Tuve un problema técnico',
            "J'ai rencontré un problème technique",
            'Ich hatte ein technisches Problem',
          ),
        },
        {
          id: 'pricing_uncertainty',
          label: t(
            "I wasn't sure what would cost money",
            'Não tinha a certeza do que seria pago',
            'No tenía claro qué tendría coste',
            'Je ne savais pas ce qui était payant',
            'Ich war mir nicht sicher, was etwas kosten würde',
          ),
        },
        {
          id: 'interrupted',
          label: t(
            "I was interrupted and didn't return",
            'Houve uma interrupção e não voltei',
            'Me interrumpieron y no volví',
            "Une interruption est survenue et je n'ai pas repris",
            'Ich wurde unterbrochen und bin nicht zurückgekehrt',
          ),
        },
        { id: 'other', label: OTHER, allowOtherText: true },
      ],
    },
    {
      id: 'A03B',
      type: 'single_choice',
      dimension: 'activation_barrier',
      required: true,
      visibleWhen: { question: 'A02', operator: 'equals', value: 'not_started' },
      label: t(
        "What was the main reason you didn't start?",
        'Qual foi o principal motivo para não ter começado?',
        '¿Cuál fue el motivo principal por el que no empezaste?',
        "Quelle est la principale raison pour laquelle vous n'avez pas commencé ?",
        'Was war der Hauptgrund, warum du nicht angefangen hast?',
      ),
      options: [
        {
          id: 'only_exploring',
          label: t(
            'I was just exploring',
            'Estava apenas a explorar',
            'Solo estaba explorando',
            "Je ne faisais qu'explorer",
            'Ich habe mich nur umgesehen',
          ),
        },
        {
          id: 'no_time',
          label: t(
            "I haven't had time",
            'Não tive tempo',
            'No he tenido tiempo',
            "Je n'ai pas eu le temps",
            'Ich hatte keine Zeit',
          ),
        },
        {
          id: 'no_idea',
          label: t(
            "I didn't have a story idea",
            'Não tinha uma ideia para uma história',
            'No tenía ninguna idea para un cuento',
            "Je n'avais pas d'idée d'histoire",
            'Ich hatte keine Idee für eine Geschichte',
          ),
        },
        {
          id: 'unclear_start',
          label: t(
            "I didn't know where to begin",
            'Não sabia por onde começar',
            'No sabía por dónde empezar',
            'Je ne savais pas par où commencer',
            'Ich wusste nicht, wo ich anfangen sollte',
          ),
        },
        {
          id: 'unclear_output',
          label: t(
            "I wasn't sure what I'd get",
            'Não tinha a certeza do que iria receber',
            'No tenía claro qué iba a obtener',
            "Je ne savais pas ce que j'allais obtenir",
            'Ich war mir nicht sicher, was ich bekommen würde',
          ),
        },
        {
          id: 'no_occasion',
          label: t(
            "I didn't have a specific need or occasion",
            'Não tinha uma necessidade ou ocasião específica',
            'No tenía una necesidad u ocasión concreta',
            "Je n'avais pas de besoin ni d'occasion particulière",
            'Ich hatte keinen konkreten Bedarf oder Anlass',
          ),
        },
        { id: 'other', label: OTHER, allowOtherText: true },
      ],
    },
    {
      id: 'A03C',
      type: 'single_choice',
      dimension: 'activation_barrier',
      required: true,
      visibleWhen: { question: 'A02', operator: 'equals', value: 'dont_remember' },
      label: t(
        'Which statement sounds closest to your experience?',
        'Qual das afirmações se aproxima mais da sua experiência?',
        '¿Qué afirmación se parece más a tu experiencia?',
        'Quelle affirmation se rapproche le plus de votre expérience ?',
        'Welche Aussage kommt deiner Erfahrung am nächsten?',
      ),
      options: [
        {
          id: 'mostly_exploring',
          label: t(
            'I mostly wanted to explore',
            'Queria sobretudo explorar',
            'Quería sobre todo explorar',
            'Je voulais surtout explorer',
            'Ich wollte vor allem erkunden',
          ),
        },
        {
          id: 'seemed_complicated',
          label: t(
            'Creating a story seemed complicated',
            'Criar uma história pareceu-me complicado',
            'Crear un cuento me pareció complicado',
            'Créer une histoire me semblait compliqué',
            'Eine Geschichte zu erstellen kam mir kompliziert vor',
          ),
        },
        {
          id: 'not_ready',
          label: t(
            "I wasn't ready to create one",
            'Não era o momento de criar uma',
            'No era el momento de crear uno',
            "Ce n'était pas le moment d'en créer une",
            'Ich war noch nicht so weit, eine zu erstellen',
          ),
        },
        {
          id: 'dont_remember',
          label: t(
            "I'm not sure",
            'Não tenho a certeza',
            'No lo tengo claro',
            'Je ne sais pas trop',
            'Ich bin mir nicht sicher',
          ),
        },
      ],
    },
    {
      id: 'A04',
      type: 'single_choice',
      dimension: 'product_clarity',
      required: true,
      label: t(
        'What, if anything, was unclear about Mythoria?',
        'O que, se alguma coisa, não foi claro no Mythoria?',
        '¿Qué, si es que algo, no te quedó claro de Mythoria?',
        "Qu'est-ce qui, le cas échéant, n'était pas clair dans Mythoria ?",
        'Was war, falls überhaupt, bei Mythoria unklar?',
      ),
      options: [
        {
          id: 'how_to_start',
          label: t(
            'How to start a story',
            'Como começar uma história',
            'Cómo empezar un cuento',
            'Comment commencer une histoire',
            'Wie man eine Geschichte beginnt',
          ),
        },
        {
          id: 'finished_result',
          label: t(
            'What the finished book would look like',
            'Como ficaria o livro final',
            'Qué aspecto tendría el libro terminado',
            'À quoi ressemblerait le livre terminé',
            'Wie das fertige Buch aussehen würde',
          ),
        },
        {
          id: 'free_vs_paid',
          label: t(
            'What is free versus paid',
            'O que é gratuito e o que é pago',
            'Qué es gratis y qué es de pago',
            'Ce qui est gratuit et ce qui est payant',
            'Was kostenlos und was kostenpflichtig ist',
          ),
        },
        {
          id: 'credit_pricing',
          label: t(
            'How credits and prices work',
            'Como funcionam os créditos e os preços',
            'Cómo funcionan los créditos y los precios',
            'Comment fonctionnent les crédits et les prix',
            'Wie Credits und Preise funktionieren',
          ),
        },
        {
          id: 'media_inputs',
          label: t(
            'How to use photos, drawings, or voice',
            'Como usar fotografias, desenhos ou voz',
            'Cómo usar fotos, dibujos o voz',
            'Comment utiliser des photos, des dessins ou la voix',
            'Wie man Fotos, Zeichnungen oder Sprache verwendet',
          ),
        },
        {
          id: 'nothing',
          label: t(
            'Everything was clear',
            'Tudo estava claro',
            'Todo estaba claro',
            'Tout était clair',
            'Alles war klar',
          ),
        },
        {
          id: 'not_explored',
          label: t(
            "I haven't explored enough to say",
            'Ainda não explorei o suficiente para dizer',
            'No he explorado lo suficiente como para decirlo',
            'Je n’ai pas assez exploré pour me prononcer',
            'Ich habe nicht genug erkundet, um das zu beurteilen',
          ),
        },
      ],
    },
    {
      id: 'A05',
      type: 'single_choice',
      dimension: 'activation_enabler',
      required: true,
      label: t(
        'What would help you create your first story the most?',
        'O que mais ajudaria a criar a sua primeira história?',
        '¿Qué te ayudaría más a crear tu primer cuento?',
        "Qu'est-ce qui vous aiderait le plus à créer votre première histoire ?",
        'Was würde dir am meisten helfen, deine erste Geschichte zu erstellen?',
      ),
      options: [
        {
          id: 'template',
          label: t(
            'Choose a story template and personalize it',
            'Escolher um modelo de história e personalizá-lo',
            'Elegir una plantilla de cuento y personalizarla',
            "Choisir un modèle d'histoire et le personnaliser",
            'Eine Geschichtenvorlage auswählen und anpassen',
          ),
        },
        {
          id: 'examples',
          label: t(
            'See examples of finished books',
            'Ver exemplos de livros concluídos',
            'Ver ejemplos de libros terminados',
            'Voir des exemples de livres terminés',
            'Beispiele fertiger Bücher ansehen',
          ),
        },
        {
          id: 'fewer_steps',
          label: t(
            'Create a story in fewer steps',
            'Criar uma história em menos passos',
            'Crear un cuento en menos pasos',
            "Créer une histoire en moins d'étapes",
            'Eine Geschichte mit weniger Schritten erstellen',
          ),
        },
        {
          id: 'idea_prompts',
          label: t(
            'Get ideas for what to write',
            'Receber ideias sobre o que escrever',
            'Recibir ideas sobre qué escribir',
            'Recevoir des idées sur quoi écrire',
            'Ideen dafür bekommen, was ich schreiben könnte',
          ),
        },
        {
          id: 'preview_price',
          label: t(
            'See the expected result and price upfront',
            'Ver o resultado esperado e o preço logo à partida',
            'Ver el resultado esperado y el precio desde el principio',
            'Voir le résultat attendu et le prix dès le départ',
            'Das erwartete Ergebnis und den Preis vorab sehen',
          ),
        },
        {
          id: 'guidance',
          label: t(
            'Get more guidance as I go',
            'Receber mais orientação pelo caminho',
            'Recibir más orientación a medida que avanzo',
            'Être davantage guidé au fil de la création',
            'Unterwegs mehr Anleitung bekommen',
          ),
        },
        {
          id: 'nothing',
          label: t(
            'Nothing in particular',
            'Nada em particular',
            'Nada en particular',
            'Rien de particulier',
            'Nichts Bestimmtes',
          ),
        },
      ],
    },
    {
      id: 'A06',
      type: 'single_choice',
      dimension: 'preferred_output',
      required: true,
      label: t(
        'Which result would be most interesting to you?',
        'Que resultado lhe interessaria mais?',
        '¿Qué resultado te interesaría más?',
        'Quel résultat vous intéresserait le plus ?',
        'Welches Ergebnis würde dich am meisten interessieren?',
      ),
      options: [
        {
          id: 'printed',
          label: t(
            'A printed book delivered to me',
            'Um livro impresso entregue na minha morada',
            'Un libro impreso enviado a mi dirección',
            'Un livre imprimé livré chez moi',
            'Ein gedrucktes Buch, das mir geliefert wird',
          ),
        },
        {
          id: 'pdf',
          label: t(
            'A PDF to save or print',
            'Um PDF para guardar ou imprimir',
            'Un PDF para guardar o imprimir',
            'Un PDF à conserver ou à imprimer',
            'Eine PDF-Datei zum Speichern oder Drucken',
          ),
        },
        {
          id: 'audio',
          label: t(
            'An audiobook to listen to',
            'Um audiolivro para ouvir',
            'Un audiolibro para escuchar',
            'Un livre audio à écouter',
            'Ein Hörbuch zum Anhören',
          ),
        },
        {
          id: 'online',
          label: t(
            'A story to read online',
            'Uma história para ler online',
            'Un cuento para leer en línea',
            'Une histoire à lire en ligne',
            'Eine Geschichte zum Online-Lesen',
          ),
        },
        {
          id: 'share',
          label: t(
            'A story to share with family or friends',
            'Uma história para partilhar com a família ou amigos',
            'Un cuento para compartir con familiares o amigos',
            'Une histoire à partager avec la famille ou des amis',
            'Eine Geschichte zum Teilen mit Familie oder Freunden',
          ),
        },
        {
          id: 'unsure',
          label: t(
            "I'm not sure yet",
            'Ainda não tenho a certeza',
            'Todavía no lo tengo claro',
            'Je ne sais pas encore',
            'Ich bin mir noch nicht sicher',
          ),
        },
      ],
    },
    {
      id: 'A07',
      type: 'single_choice',
      dimension: 'activation_trigger',
      required: true,
      label: t(
        'What might encourage you to try Mythoria soon?',
        'O que poderia fazer com que experimentasse o Mythoria em breve?',
        '¿Qué podría animarte a probar Mythoria pronto?',
        "Qu'est-ce qui pourrait vous encourager à essayer Mythoria prochainement ?",
        'Was könnte dich dazu bringen, Mythoria bald auszuprobieren?',
      ),
      options: [
        {
          id: 'occasion',
          label: t(
            'A special occasion, like a birthday',
            'Uma ocasião especial, como um aniversário',
            'Una ocasión especial, como un cumpleaños',
            'Une occasion spéciale, comme un anniversaire',
            'Ein besonderer Anlass, zum Beispiel ein Geburtstag',
          ),
        },
        {
          id: 'idea',
          label: t(
            'Having a good story idea',
            'Ter uma boa ideia para uma história',
            'Tener una buena idea para un cuento',
            "Avoir une bonne idée d'histoire",
            'Eine gute Geschichtenidee zu haben',
          ),
        },
        {
          id: 'simpler',
          label: t(
            'A simpler creation process',
            'Um processo de criação mais simples',
            'Un proceso de creación más sencillo',
            'Un processus de création plus simple',
            'Ein einfacherer Erstellungsprozess',
          ),
        },
        {
          id: 'example',
          label: t(
            'Seeing a book I really like',
            'Ver um livro de que goste mesmo',
            'Ver un libro que me guste de verdad',
            'Voir un livre qui me plaît vraiment',
            'Ein Buch zu sehen, das mir wirklich gefällt',
          ),
        },
        {
          id: 'offer',
          label: t(
            'A special offer',
            'Uma oferta especial',
            'Una oferta especial',
            'Une offre spéciale',
            'Ein Sonderangebot',
          ),
        },
        {
          id: 'no_plans',
          label: t(
            "I don't plan to use Mythoria for now",
            'Para já, não pretendo usar o Mythoria',
            'Por ahora no tengo previsto usar Mythoria',
            "Pour le moment, je ne prévois pas d'utiliser Mythoria",
            'Ich plane vorerst nicht, Mythoria zu nutzen',
          ),
        },
      ],
    },
    {
      id: 'A08',
      type: 'smileys',
      dimension: 'perceived_clarity_score',
      required: true,
      label: t(
        'How clear did Mythoria feel when you first explored it?',
        'Quão clara lhe pareceu a plataforma Mythoria quando a explorou pela primeira vez?',
        '¿Cómo de clara te pareció Mythoria cuando la exploraste por primera vez?',
        'Dans quelle mesure Mythoria vous a-t-elle semblé claire lors de votre première découverte ?',
        'Wie klar wirkte Mythoria, als du es zum ersten Mal erkundet hast?',
      ),
      options: [
        {
          id: '1',
          value: 1,
          label: t(
            'Very confusing',
            'Muito confusa',
            'Muy confusa',
            'Très confuse',
            'Sehr verwirrend',
          ),
        },
        {
          id: '2',
          value: 2,
          label: t(
            'Somewhat confusing',
            'Um pouco confusa',
            'Algo confusa',
            'Plutôt confuse',
            'Eher verwirrend',
          ),
        },
        {
          id: '3',
          value: 3,
          label: t('Neutral', 'Neutra', 'Neutral', 'Neutre', 'Neutral'),
        },
        {
          id: '4',
          value: 4,
          label: t(
            'Mostly clear',
            'Bastante clara',
            'Bastante clara',
            'Plutôt claire',
            'Eher klar',
          ),
        },
        {
          id: '5',
          value: 5,
          label: t('Very clear', 'Muito clara', 'Muy clara', 'Très claire', 'Sehr klar'),
        },
        {
          id: 'not_explored',
          notApplicable: true,
          label: t(
            "I didn't explore enough to rate it",
            'Não explorei o suficiente para avaliar',
            'No he explorado lo suficiente como para valorarla',
            "Je n'ai pas assez exploré pour l'évaluer",
            'Ich habe nicht genug erkundet, um es zu bewerten',
          ),
        },
      ],
    },
    {
      id: 'A09',
      type: 'long_text',
      dimension: 'open_improvement',
      required: false,
      label: t(
        'If you could change one thing to make creating your first story easier, what would it be?',
        'Se pudesse mudar uma coisa para facilitar a criação da sua primeira história, o que seria?',
        'Si pudieras cambiar una cosa para que crear tu primer cuento fuera más fácil, ¿cuál sería?',
        'Si vous pouviez changer une chose pour faciliter la création de votre première histoire, laquelle serait-ce ?',
        'Wenn du eine Sache ändern könntest, um das Erstellen deiner ersten Geschichte zu erleichtern, welche wäre es?',
      ),
      help: t(
        "Optional. Please don't include children's names or private story content.",
        'Opcional. Não inclua nomes de crianças nem conteúdo privado de histórias.',
        'Opcional. Por favor, no incluyas nombres de menores ni contenido privado de cuentos.',
        "Facultatif. Merci de ne pas indiquer de prénoms d'enfants ni de contenu privé d'histoires.",
        'Optional. Bitte gib keine Namen von Kindern oder privaten Inhalten von Geschichten an.',
      ),
      validation: { maxLength: 1000 },
    },
  ],
} satisfies SurveyDefinitionInput;
