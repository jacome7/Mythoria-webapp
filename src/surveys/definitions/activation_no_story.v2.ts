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

const OTHER = t('Other', 'Outra', 'Otra', 'Autre', 'Sonstiges');

/**
 * Survey C1 v2: registered users with no completed story (Mythoria_C1_Survey_Revised.md).
 * Replaces v1; v1 stays published for its existing responses.
 *
 * Q2 has three mutually exclusive variants chosen from recorded creation activity (the snapshot
 * fact `startedStory`, never asked of the respondent): started-but-unfinished (A02A), never
 * started (A02B), and a fallback when the fact is missing from the snapshot (A02C).
 *
 * Address forms: pt-PT formal (third person), es-ES informal (tu), fr-FR formal (vous),
 * de-DE informal (du), matching the app's existing UI copy.
 */
export const activationNoStoryV2 = {
  schemaVersion: 1,
  id: 'activation_no_story',
  version: 2,
  purpose:
    'Separate curiosity and non-intent from workflow abandonment, uncertainty and lack of a starting idea among registered users who have not completed a story, and identify what would enable first-story activation: motivation, activation barrier by recorded creation stage, perceived clarity, least clear part, enablers, desired outcome and activation trigger.',
  title: t(
    'Help us make your first Mythoria story easier to create',
    'Ajude-nos a tornar a criação da sua primeira história no Mythoria mais fácil',
    'Ayúdanos a que crear tu primera historia en Mythoria sea más fácil',
    'Aidez-nous à faciliter la création de votre première histoire Mythoria',
    'Hilf uns, deine erste Mythoria-Geschichte einfacher erstellbar zu machen',
  ),
  description: t(
    "We noticed that you haven't completed your first story yet. We'd love to understand what got in the way and how we can improve the experience.",
    'Reparámos que ainda não concluiu a sua primeira história. Gostaríamos de perceber o que se meteu no caminho e como podemos melhorar a experiência.',
    'Hemos notado que todavía no has terminado tu primera historia. Nos encantaría saber qué se interpuso y cómo podemos mejorar la experiencia.',
    'Nous avons remarqué que vous n’avez pas encore terminé votre première histoire. Nous aimerions comprendre ce qui vous a freiné et comment améliorer l’expérience.',
    'Uns ist aufgefallen, dass du deine erste Geschichte noch nicht abgeschlossen hast. Wir möchten gern verstehen, was dazwischengekommen ist und wie wir das Erlebnis verbessern können.',
  ),
  intro: t(
    "We'll use your feedback, together with how you use Mythoria, to understand and improve our experience. Your responses will not be published.",
    'Vamos usar a sua opinião, em conjunto com a forma como utiliza o Mythoria, para compreender e melhorar a nossa experiência. As suas respostas não serão publicadas.',
    'Usaremos tus comentarios, junto con cómo usas Mythoria, para entender y mejorar nuestra experiencia. Tus respuestas no se publicarán.',
    'Nous utiliserons vos retours, ainsi que la façon dont vous utilisez Mythoria, pour comprendre et améliorer notre expérience. Vos réponses ne seront pas publiées.',
    'Wir nutzen dein Feedback zusammen mit deiner Nutzung von Mythoria, um unser Erlebnis zu verstehen und zu verbessern. Deine Antworten werden nicht veröffentlicht.',
  ),
  completionMessage: t(
    'Thank you for helping us improve Mythoria! After creating your first eligible story, you can choose one complimentary format: a print-ready PDF or an audiobook.',
    'Obrigado por nos ajudar a melhorar o Mythoria! Depois de criar a sua primeira história elegível, pode escolher um formato gratuito: um PDF pronto a imprimir ou um audiolivro.',
    '¡Gracias por ayudarnos a mejorar Mythoria! Cuando crees tu primera historia elegible, podrás elegir un formato gratuito: un PDF listo para imprimir o un audiolibro.',
    'Merci de nous aider à améliorer Mythoria ! Après avoir créé votre première histoire éligible, vous pourrez choisir un format offert : un PDF prêt à imprimer ou un livre audio.',
    'Danke, dass du uns hilfst, Mythoria zu verbessern! Nachdem du deine erste passende Geschichte erstellt hast, kannst du ein kostenloses Format wählen: ein druckfertiges PDF oder ein Hörbuch.',
  ),
  estimatedMinutes: 3,
  responsePolicy: { identity: 'invitation', maxCompletedPerInvitation: 1 },
  rewardEligible: true,
  internalOnly: false,
  questions: [
    // Section 1: Motivation and activation barriers
    {
      id: 'A01',
      type: 'single_choice',
      dimension: 'primary_intent',
      required: true,
      label: t(
        'What originally brought you to Mythoria?',
        'Qual foi o seu motivo inicial para vir ao Mythoria?',
        '¿Qué fue lo que te trajo en un principio a Mythoria?',
        'Qu’est-ce qui vous a initialement amené sur Mythoria ?',
        'Was hat dich ursprünglich zu Mythoria gebracht?',
      ),
      options: [
        {
          id: 'child',
          label: t(
            'Create a story for a child.',
            'Criar uma história para uma criança.',
            'Crear una historia para un niño o una niña.',
            'Créer une histoire pour un enfant.',
            'Eine Geschichte für ein Kind erstellen.',
          ),
        },
        {
          id: 'memories',
          label: t(
            'Turn personal or family memories into a book.',
            'Transformar memórias pessoais ou familiares num livro.',
            'Convertir recuerdos personales o familiares en un libro.',
            'Transformer des souvenirs personnels ou familiaux en livre.',
            'Persönliche oder familiäre Erinnerungen in ein Buch verwandeln.',
          ),
        },
        {
          id: 'gift',
          label: t(
            'Make a special gift.',
            'Fazer uma prenda especial.',
            'Hacer un regalo especial.',
            'Faire un cadeau spécial.',
            'Ein besonderes Geschenk machen.',
          ),
        },
        {
          id: 'explore',
          label: t(
            'Explore what Mythoria can do.',
            'Explorar o que o Mythoria consegue fazer.',
            'Explorar lo que Mythoria puede hacer.',
            'Explorer ce que Mythoria peut faire.',
            'Erkunden, was Mythoria kann.',
          ),
        },
        { id: 'other', label: OTHER, allowOtherText: true },
      ],
    },
    {
      id: 'A02A',
      type: 'single_choice',
      dimension: 'activation_barrier',
      required: true,
      // Creation started but not finished, from recorded activity.
      audience: [{ fact: 'startedStory', operator: 'equals', value: true }],
      label: t(
        'What has kept you from completing your first story?',
        'O que o tem impedido de concluir a sua primeira história?',
        '¿Qué te ha impedido terminar tu primera historia?',
        'Qu’est-ce qui vous a empêché de terminer votre première histoire ?',
        'Was hat dich davon abgehalten, deine erste Geschichte abzuschließen?',
      ),
      options: [
        {
          id: 'no_idea',
          label: t(
            "I wasn't sure what story to tell.",
            'Não tinha a certeza de que história contar.',
            'No tenía claro qué historia contar.',
            'Je ne savais pas quelle histoire raconter.',
            'Ich war mir nicht sicher, welche Geschichte ich erzählen sollte.',
          ),
        },
        {
          id: 'too_much_effort',
          label: t(
            'The process took too much time or effort.',
            'O processo exigiu demasiado tempo ou esforço.',
            'El proceso llevó demasiado tiempo o esfuerzo.',
            'Le processus a demandé trop de temps ou d’efforts.',
            'Der Vorgang hat zu viel Zeit oder Mühe gekostet.',
          ),
        },
        {
          id: 'interrupted',
          label: t(
            "I was interrupted and didn't come back.",
            'Fui interrompido e não voltei.',
            'Me interrumpieron y no volví.',
            'J’ai été interrompu(e) et je ne suis pas revenu(e).',
            'Ich wurde unterbrochen und bin nicht zurückgekehrt.',
          ),
        },
        {
          id: 'technical_issue',
          label: t(
            'I ran into a technical problem.',
            'Tive um problema técnico.',
            'Tuve un problema técnico.',
            'J’ai rencontré un problème technique.',
            'Ich bin auf ein technisches Problem gestoßen.',
          ),
        },
        { id: 'other', label: OTHER, allowOtherText: true },
      ],
    },
    {
      id: 'A02B',
      type: 'single_choice',
      dimension: 'activation_barrier',
      required: true,
      // Creation never started, from recorded activity.
      audience: [{ fact: 'startedStory', operator: 'equals', value: false }],
      label: t(
        'What has kept you from completing your first story?',
        'O que o tem impedido de concluir a sua primeira história?',
        '¿Qué te ha impedido terminar tu primera historia?',
        'Qu’est-ce qui vous a empêché de terminer votre première histoire ?',
        'Was hat dich davon abgehalten, deine erste Geschichte abzuschließen?',
      ),
      options: [
        {
          id: 'only_exploring',
          label: t(
            'I signed up mainly to explore.',
            'Registei-me sobretudo para explorar.',
            'Me registré sobre todo para explorar.',
            'Je me suis surtout inscrit(e) pour explorer.',
            'Ich habe mich hauptsächlich angemeldet, um zu erkunden.',
          ),
        },
        {
          id: 'no_idea_or_reason',
          label: t(
            "I didn't have a story idea or a reason to create one.",
            'Não tinha uma ideia para uma história nem um motivo para criar uma.',
            'No tenía una idea para una historia ni un motivo para crearla.',
            'Je n’avais ni idée d’histoire ni raison d’en créer une.',
            'Ich hatte weder eine Idee für eine Geschichte noch einen Grund, eine zu erstellen.',
          ),
        },
        {
          id: 'no_time',
          label: t(
            "I haven't had the time.",
            'Não tive tempo.',
            'No he tenido tiempo.',
            'Je n’ai pas eu le temps.',
            'Ich hatte keine Zeit.',
          ),
        },
        {
          id: 'unclear_start',
          label: t(
            "I wasn't sure how to get started.",
            'Não tinha a certeza de como começar.',
            'No tenía claro cómo empezar.',
            'Je ne savais pas trop comment me lancer.',
            'Ich wusste nicht genau, wie ich anfangen sollte.',
          ),
        },
        { id: 'other', label: OTHER, allowOtherText: true },
      ],
    },
    {
      id: 'A02C',
      type: 'single_choice',
      dimension: 'activation_barrier',
      required: true,
      // Fallback: creation-stage data missing or unreliable in the snapshot.
      audience: [{ fact: 'startedStory', operator: 'missing' }],
      label: t(
        'What has kept you from completing your first story?',
        'O que o tem impedido de concluir a sua primeira história?',
        '¿Qué te ha impedido terminar tu primera historia?',
        'Qu’est-ce qui vous a empêché de terminer votre première histoire ?',
        'Was hat dich davon abgehalten, deine erste Geschichte abzuschließen?',
      ),
      options: [
        {
          id: 'no_idea_or_reason',
          label: t(
            "I don't have a story idea or a reason to create one.",
            'Não tenho uma ideia para uma história nem um motivo para criar uma.',
            'No tengo una idea para una historia ni un motivo para crearla.',
            'Je n’ai ni idée d’histoire ni raison d’en créer une.',
            'Ich habe weder eine Idee für eine Geschichte noch einen Grund, eine zu erstellen.',
          ),
        },
        {
          id: 'no_time',
          label: t(
            "I haven't had the time.",
            'Não tive tempo.',
            'No he tenido tiempo.',
            'Je n’ai pas eu le temps.',
            'Ich hatte keine Zeit.',
          ),
        },
        {
          id: 'seems_complicated',
          label: t(
            'Creating a story seems too complicated.',
            'Criar uma história parece demasiado complicado.',
            'Crear una historia parece demasiado complicado.',
            'Créer une histoire semble trop compliqué.',
            'Eine Geschichte zu erstellen kommt mir zu kompliziert vor.',
          ),
        },
        {
          id: 'unclear_result_cost',
          label: t(
            "I wasn't sure what the result or cost would be.",
            'Não tinha a certeza de qual seria o resultado ou o custo.',
            'No tenía claro cuál sería el resultado o el coste.',
            'Je ne savais pas quel serait le résultat ou le coût.',
            'Ich war mir nicht sicher, wie das Ergebnis oder die Kosten aussehen würden.',
          ),
        },
        { id: 'other', label: OTHER, allowOtherText: true },
      ],
    },

    // Section 2: Clarity and product improvements
    {
      id: 'A03',
      type: 'smileys',
      dimension: 'perceived_clarity_score',
      required: false,
      label: t(
        'How clear was Mythoria when you first explored it?',
        'Quão clara foi a plataforma Mythoria quando a explorou pela primeira vez?',
        '¿Cómo de clara fue Mythoria cuando la exploraste por primera vez?',
        'Dans quelle mesure Mythoria était-elle claire lors de votre première découverte ?',
        'Wie klar war Mythoria, als du es zum ersten Mal erkundet hast?',
      ),
      help: t(
        "You can skip this if you don't remember or didn't explore enough.",
        'Pode saltar esta pergunta se não se lembrar ou se não tiver explorado o suficiente.',
        'Puedes saltarte esta pregunta si no lo recuerdas o no exploraste lo suficiente.',
        'Vous pouvez passer cette question si vous ne vous en souvenez pas ou si vous n’avez pas assez exploré.',
        'Du kannst diese Frage überspringen, wenn du dich nicht erinnerst oder nicht genug erkundet hast.',
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
          label: t(
            'Neither clear nor confusing',
            'Nem clara nem confusa',
            'Ni clara ni confusa',
            'Ni claire ni confuse',
            'Weder klar noch verwirrend',
          ),
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
      ],
    },
    {
      id: 'A04',
      type: 'single_choice',
      dimension: 'product_clarity',
      required: true,
      // Only when the clarity rating is 1, 2 or 3 (a skipped rating hides this question).
      visibleWhen: { question: 'A03', operator: 'lte', value: 3 },
      label: t(
        'What was the least clear part of the experience?',
        'Qual foi a parte menos clara da experiência?',
        '¿Cuál fue la parte menos clara de la experiencia?',
        'Quelle a été la partie la moins claire de l’expérience ?',
        'Welcher Teil des Erlebnisses war am unklarsten?',
      ),
      options: [
        {
          id: 'how_to_start',
          label: t(
            'How to begin creating a story.',
            'Como começar a criar uma história.',
            'Cómo empezar a crear una historia.',
            'Comment commencer à créer une histoire.',
            'Wie man mit dem Erstellen einer Geschichte beginnt.',
          ),
        },
        {
          id: 'finished_result',
          label: t(
            'What the finished story would look like.',
            'Como ficaria a história final.',
            'Qué aspecto tendría la historia terminada.',
            'À quoi ressemblerait l’histoire terminée.',
            'Wie die fertige Geschichte aussehen würde.',
          ),
        },
        {
          id: 'free_vs_paid',
          label: t(
            'What is free and what is paid.',
            'O que é gratuito e o que é pago.',
            'Qué es gratis y qué es de pago.',
            'Ce qui est gratuit et ce qui est payant.',
            'Was kostenlos und was kostenpflichtig ist.',
          ),
        },
        {
          id: 'credit_pricing',
          label: t(
            'How prices and credits work.',
            'Como funcionam os preços e os créditos.',
            'Cómo funcionan los precios y los créditos.',
            'Comment fonctionnent les prix et les crédits.',
            'Wie Preise und Credits funktionieren.',
          ),
        },
        { id: 'other', label: OTHER, allowOtherText: true },
      ],
    },
    {
      id: 'A05',
      type: 'single_choice',
      dimension: 'activation_enabler',
      required: true,
      label: t(
        'What would make creating your first story easier?',
        'O que tornaria mais fácil criar a sua primeira história?',
        '¿Qué haría más fácil crear tu primera historia?',
        'Qu’est-ce qui faciliterait la création de votre première histoire ?',
        'Was würde das Erstellen deiner ersten Geschichte einfacher machen?',
      ),
      options: [
        {
          id: 'template',
          label: t(
            'Starting from a story template I can personalize.',
            'Partir de um modelo de história que possa personalizar.',
            'Empezar desde una plantilla de historia que pueda personalizar.',
            'Partir d’un modèle d’histoire que je peux personnaliser.',
            'Mit einer Geschichtenvorlage beginnen, die ich anpassen kann.',
          ),
        },
        {
          id: 'idea_prompts',
          label: t(
            'Getting suggestions and ideas for stories.',
            'Receber sugestões e ideias para histórias.',
            'Recibir sugerencias e ideas para historias.',
            'Recevoir des suggestions et des idées d’histoires.',
            'Vorschläge und Ideen für Geschichten bekommen.',
          ),
        },
        {
          id: 'fewer_steps',
          label: t(
            'Completing the creation process in fewer steps.',
            'Concluir o processo de criação em menos passos.',
            'Completar el proceso de creación en menos pasos.',
            'Terminer le processus de création en moins d’étapes.',
            'Den Erstellungsprozess mit weniger Schritten abschließen.',
          ),
        },
        {
          id: 'preview_price',
          label: t(
            'Seeing examples, previews, and pricing before I begin.',
            'Ver exemplos, pré-visualizações e preços antes de começar.',
            'Ver ejemplos, vistas previas y precios antes de empezar.',
            'Voir des exemples, des aperçus et les prix avant de commencer.',
            'Beispiele, Vorschauen und Preise sehen, bevor ich anfange.',
          ),
        },
        { id: 'other', label: OTHER, allowOtherText: true },
      ],
    },

    // Section 3: Desired outcomes and reasons to return
    {
      id: 'A06',
      type: 'single_choice',
      dimension: 'preferred_output',
      required: true,
      label: t(
        'Which outcome would interest you most?',
        'Que resultado lhe interessaria mais?',
        '¿Qué resultado te interesaría más?',
        'Quel résultat vous intéresserait le plus ?',
        'Welches Ergebnis würde dich am meisten interessieren?',
      ),
      options: [
        {
          id: 'printed',
          label: t(
            'A printed book delivered to me.',
            'Um livro impresso entregue na minha morada.',
            'Un libro impreso enviado a mi dirección.',
            'Un livre imprimé livré chez moi.',
            'Ein gedrucktes Buch, das mir geliefert wird.',
          ),
        },
        {
          id: 'pdf',
          label: t(
            'A PDF to save or print.',
            'Um PDF para guardar ou imprimir.',
            'Un PDF para guardar o imprimir.',
            'Un PDF à conserver ou à imprimer.',
            'Eine PDF-Datei zum Speichern oder Drucken.',
          ),
        },
        {
          id: 'audio',
          label: t(
            'An audiobook to listen to.',
            'Um audiolivro para ouvir.',
            'Un audiolibro para escuchar.',
            'Un livre audio à écouter.',
            'Ein Hörbuch zum Anhören.',
          ),
        },
        {
          id: 'online_share',
          label: t(
            'A story to read online or share.',
            'Uma história para ler online ou partilhar.',
            'Una historia para leer en línea o compartir.',
            'Une histoire à lire en ligne ou à partager.',
            'Eine Geschichte zum Online-Lesen oder Teilen.',
          ),
        },
        {
          id: 'unsure',
          label: t(
            "I'm not sure yet.",
            'Ainda não tenho a certeza.',
            'Todavía no lo tengo claro.',
            'Je ne sais pas encore.',
            'Ich bin mir noch nicht sicher.',
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
        'What would most likely motivate you to create your first story soon?',
        'O que o motivaria mais para criar a sua primeira história em breve?',
        '¿Qué te motivaría más a crear tu primera historia pronto?',
        'Qu’est-ce qui vous motiverait le plus à créer prochainement votre première histoire ?',
        'Was würde dich am ehesten motivieren, bald deine erste Geschichte zu erstellen?',
      ),
      options: [
        {
          id: 'occasion',
          label: t(
            'A birthday, holiday, or other special occasion.',
            'Um aniversário, uma festividade ou outra ocasião especial.',
            'Un cumpleaños, una festividad u otra ocasión especial.',
            'Un anniversaire, une fête ou une autre occasion spéciale.',
            'Ein Geburtstag, ein Feiertag oder ein anderer besonderer Anlass.',
          ),
        },
        {
          id: 'child_enjoy',
          label: t(
            'Creating something a child would enjoy.',
            'Criar algo de que uma criança gostasse.',
            'Crear algo que disfrutaría un niño o una niña.',
            'Créer quelque chose qu’un enfant apprécierait.',
            'Etwas zu erschaffen, das einem Kind Freude machen würde.',
          ),
        },
        {
          id: 'memory',
          label: t(
            'Preserving an important personal or family memory.',
            'Preservar uma memória pessoal ou familiar importante.',
            'Conservar un recuerdo personal o familiar importante.',
            'Préserver un souvenir personnel ou familial important.',
            'Eine wichtige persönliche oder familiäre Erinnerung zu bewahren.',
          ),
        },
        {
          id: 'time_idea',
          label: t(
            'Having more time and a good idea.',
            'Ter mais tempo e uma boa ideia.',
            'Tener más tiempo y una buena idea.',
            'Avoir plus de temps et une bonne idée.',
            'Mehr Zeit und eine gute Idee zu haben.',
          ),
        },
        {
          id: 'no_plans',
          label: t(
            "I don't expect to create a story soon.",
            'Não espero criar uma história em breve.',
            'No espero crear una historia pronto.',
            'Je ne pense pas créer d’histoire prochainement.',
            'Ich rechne nicht damit, bald eine Geschichte zu erstellen.',
          ),
        },
      ],
    },

    // Section 4: Open feedback
    {
      id: 'A08',
      type: 'long_text',
      dimension: 'open_improvement',
      required: false,
      label: t(
        'If you could change one thing to make creating your first story easier, what would it be?',
        'Se pudesse mudar uma coisa para facilitar a criação da sua primeira história, o que seria?',
        'Si pudieras cambiar una cosa para que crear tu primera historia fuera más fácil, ¿cuál sería?',
        'Si vous pouviez changer une chose pour faciliter la création de votre première histoire, laquelle serait-ce ?',
        'Wenn du eine Sache ändern könntest, um das Erstellen deiner ersten Geschichte zu erleichtern, welche wäre es?',
      ),
      help: t(
        "Optional. Please don't include children's names or private story content.",
        'Opcional. Não inclua nomes de crianças nem conteúdo privado de histórias.',
        'Opcional. Por favor, no incluyas nombres de menores ni contenido privado de historias.',
        "Facultatif. Merci de ne pas indiquer de prénoms d'enfants ni de contenu privé d'histoires.",
        'Optional. Bitte gib keine Namen von Kindern oder privaten Inhalten von Geschichten an.',
      ),
      validation: { maxLength: 1000 },
    },
  ],
} satisfies SurveyDefinitionInput;
