import type { LocalizedText, SurveyDefinitionInput } from '@/lib/surveys/definition-schema';

/** Compact localized-text builder. Argument order: en-US, pt-PT, es-ES, fr-FR, de-DE. */
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

const other = t('Something else', 'Outra coisa', 'Otra cosa', 'Autre chose', 'Etwas anderes');
const dontRemember = t(
  "I don't remember",
  'Não me lembro',
  'No me acuerdo',
  'Je ne m’en souviens pas',
  'Ich erinnere mich nicht',
);
const nothingInParticular = t(
  'Nothing in particular',
  'Nada em particular',
  'Nada en particular',
  'Rien de particulier',
  'Nichts Bestimmtes',
);
const noPreference = t(
  'No preference',
  'Sem preferência',
  'Sin preferencia',
  'Pas de préférence',
  'Keine Präferenz',
);

/**
 * Survey C3: paying creators.
 * Address forms: pt-PT formal (voce, third person), es-ES informal (tu), fr-FR formal (vous),
 * de-DE informal (du), matching the app's existing UI copy.
 */
export const payingCreatorV1 = {
  schemaVersion: 1,
  id: 'paying_creator',
  version: 1,
  purpose:
    'Understand first-purchase motivation, paid-customer experience, and drivers of additional purchases: true purchase trigger, success or failure to use purchased credits, checkout and credit clarity, value delivered by paid services, return-product preferences and likely repeat occasions.',
  title: t(
    'Help us improve your Mythoria experience',
    'Ajude-nos a melhorar a sua experiência no Mythoria',
    'Ayúdanos a mejorar tu experiencia en Mythoria',
    'Aidez-nous à améliorer votre expérience Mythoria',
    'Hilf uns, dein Mythoria-Erlebnis zu verbessern',
  ),
  description: t(
    'Thank you for creating stories with Mythoria. Tell us what made the experience worthwhile and what we should improve.',
    'Obrigado por criar histórias com o Mythoria. Diga-nos o que valeu a pena na experiência e o que devemos melhorar.',
    'Gracias por crear historias con Mythoria. Cuéntanos qué hizo que la experiencia mereciera la pena y qué deberíamos mejorar.',
    "Merci de créer des histoires avec Mythoria. Dites-nous ce qui a rendu l'expérience satisfaisante et ce que nous devrions améliorer.",
    'Danke, dass du mit Mythoria Geschichten erstellst. Sag uns, was das Erlebnis für dich lohnenswert gemacht hat und was wir verbessern sollten.',
  ),
  intro: t(
    "Thanks for taking a moment to share your experience. This survey takes about 3 minutes. We'll use your feedback, together with how you use Mythoria, to understand and improve our experience. Your responses will not be published.",
    'Obrigado por partilhar a sua experiência. Este questionário demora cerca de 3 minutos. Vamos usar a sua opinião, em conjunto com a forma como utiliza o Mythoria, para compreender e melhorar a nossa experiência. As suas respostas não serão publicadas.',
    'Gracias por dedicar un momento a compartir tu experiencia. Esta encuesta dura unos 3 minutos. Usaremos tus comentarios, junto con cómo usas Mythoria, para entender y mejorar nuestra experiencia. Tus respuestas no se publicarán.',
    'Merci de prendre un moment pour partager votre expérience. Ce questionnaire dure environ 3 minutes. Nous utiliserons vos commentaires, ainsi que votre usage de Mythoria, pour comprendre et améliorer notre expérience. Vos réponses ne seront pas publiées.',
    'Danke, dass du dir einen Moment Zeit nimmst, deine Erfahrungen zu teilen. Die Umfrage dauert etwa 3 Minuten. Wir nutzen dein Feedback zusammen mit deiner Nutzung von Mythoria, um unser Erlebnis zu verstehen und zu verbessern. Deine Antworten werden nicht veröffentlicht.',
  ),
  completionMessage: t(
    'Thank you for your feedback. It helps us improve Mythoria.',
    'Obrigado pela sua opinião. Ajuda-nos a melhorar o Mythoria.',
    'Gracias por tus comentarios. Nos ayudan a mejorar Mythoria.',
    'Merci pour vos commentaires. Ils nous aident à améliorer Mythoria.',
    'Danke für dein Feedback. Es hilft uns, Mythoria zu verbessern.',
  ),
  estimatedMinutes: 3,
  responsePolicy: { identity: 'invitation', maxCompletedPerInvitation: 1 },
  rewardEligible: true,
  internalOnly: false,
  questions: [
    {
      id: 'C01',
      type: 'single_choice',
      dimension: 'first_purchase_driver',
      required: true,
      label: t(
        'What was the main reason you first bought credits?',
        'Qual foi o principal motivo da sua primeira compra de créditos?',
        '¿Cuál fue el motivo principal por el que compraste créditos por primera vez?',
        'Quelle est la principale raison pour laquelle vous avez acheté des crédits pour la première fois ?',
        'Was war der Hauptgrund, warum du zum ersten Mal Credits gekauft hast?',
      ),
      options: [
        {
          id: 'new_story',
          label: t(
            'Create another story',
            'Criar outra história',
            'Crear otra historia',
            'Créer une autre histoire',
            'Eine weitere Geschichte erstellen',
          ),
        },
        {
          id: 'edit_story',
          label: t(
            'Improve or personalize an existing story',
            'Melhorar ou personalizar uma história existente',
            'Mejorar o personalizar una historia existente',
            'Améliorer ou personnaliser une histoire existante',
            'Eine bestehende Geschichte verbessern oder personalisieren',
          ),
        },
        {
          id: 'pdf',
          label: t(
            'Get a PDF',
            'Obter um PDF',
            'Obtener un PDF',
            'Obtenir un PDF',
            'Eine PDF-Datei erhalten',
          ),
        },
        {
          id: 'audio',
          label: t(
            'Create an audiobook',
            'Criar um audiolivro',
            'Crear un audiolibro',
            'Créer un livre audio',
            'Ein Hörbuch erstellen',
          ),
        },
        {
          id: 'printed',
          label: t(
            'Order a printed book',
            'Encomendar um livro impresso',
            'Pedir un libro impreso',
            'Commander un livre imprimé',
            'Ein gedrucktes Buch bestellen',
          ),
        },
        {
          id: 'explore',
          label: t(
            'Explore more features',
            'Explorar mais funcionalidades',
            'Explorar más funciones',
            'Explorer davantage de fonctionnalités',
            'Weitere Funktionen entdecken',
          ),
        },
        { id: 'other', label: other, allowOtherText: true },
      ],
    },
    {
      id: 'C02',
      type: 'buttons',
      selection: 'single',
      dimension: 'paid_goal_completion',
      required: true,
      label: t(
        'Were you able to use the credits for what you wanted?',
        'Conseguiu usar os créditos para o que pretendia?',
        '¿Pudiste usar los créditos para lo que querías?',
        'Avez-vous pu utiliser les crédits comme vous le souhaitiez ?',
        'Konntest du die Credits für das nutzen, was du wolltest?',
      ),
      options: [
        {
          id: 'yes',
          label: t(
            'Yes, completely',
            'Sim, totalmente',
            'Sí, por completo',
            'Oui, tout à fait',
            'Ja, vollständig',
          ),
        },
        {
          id: 'some_difficulty',
          label: t(
            'Yes, but with some difficulty',
            'Sim, mas com alguma dificuldade',
            'Sí, pero con cierta dificultad',
            'Oui, mais avec quelques difficultés',
            'Ja, aber mit einigen Schwierigkeiten',
          ),
        },
        {
          id: 'partial',
          label: t(
            'Only partly',
            'Apenas em parte',
            'Solo en parte',
            'Seulement en partie',
            'Nur teilweise',
          ),
        },
        { id: 'no', label: t('No', 'Não', 'No', 'Non', 'Nein') },
        {
          id: 'not_used',
          label: t(
            "I haven't used them yet",
            'Ainda não os usei',
            'Todavía no los he usado',
            'Je ne les ai pas encore utilisés',
            'Ich habe sie noch nicht verwendet',
          ),
        },
      ],
    },
    {
      id: 'C02F',
      type: 'single_choice',
      dimension: 'paid_use_barrier',
      required: true,
      visibleWhen: {
        question: 'C02',
        operator: 'in',
        value: ['some_difficulty', 'partial', 'no'],
      },
      label: t(
        'What made using your credits difficult?',
        'O que dificultou a utilização dos seus créditos?',
        '¿Qué hizo difícil usar tus créditos?',
        'Qu’est-ce qui a rendu l’utilisation de vos crédits difficile ?',
        'Was hat die Nutzung deiner Credits schwierig gemacht?',
      ),
      options: [
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
          id: 'insufficient_credits',
          label: t(
            'I needed more credits',
            'Precisava de mais créditos',
            'Necesitaba más créditos',
            "J'avais besoin de plus de crédits",
            'Ich brauchte mehr Credits',
          ),
        },
        {
          id: 'unclear_usage',
          label: t(
            "It wasn't clear how to use them",
            'Não era claro como os usar',
            'No estaba claro cómo usarlos',
            'Je ne savais pas clairement comment les utiliser',
            'Es war nicht klar, wie man sie verwendet',
          ),
        },
        {
          id: 'technical',
          label: t(
            'I had a technical problem',
            'Tive um problema técnico',
            'Tuve un problema técnico',
            "J'ai rencontré un problème technique",
            'Ich hatte ein technisches Problem',
          ),
        },
        {
          id: 'unexpected_result',
          label: t(
            "The result wasn't what I expected",
            'O resultado não foi o que esperava',
            'El resultado no fue el que esperaba',
            "Le résultat n'était pas celui que j'attendais",
            'Das Ergebnis entsprach nicht meinen Erwartungen',
          ),
        },
        { id: 'other', label: other, allowOtherText: true },
      ],
    },
    {
      id: 'C03',
      type: 'single_choice',
      dimension: 'checkout_ease',
      required: true,
      label: t(
        'How easy was it to buy credits?',
        'Quão fácil foi comprar créditos?',
        '¿Cómo de fácil fue comprar créditos?',
        "Dans quelle mesure l'achat de crédits a-t-il été facile ?",
        'Wie einfach war es, Credits zu kaufen?',
      ),
      options: [
        {
          id: 'very_easy',
          label: t('Very easy', 'Muito fácil', 'Muy fácil', 'Très facile', 'Sehr einfach'),
        },
        { id: 'easy', label: t('Easy', 'Fácil', 'Fácil', 'Facile', 'Einfach') },
        {
          id: 'neutral',
          label: t(
            'Neither easy nor difficult',
            'Nem fácil nem difícil',
            'Ni fácil ni difícil',
            'Ni facile ni difficile',
            'Weder einfach noch schwierig',
          ),
        },
        { id: 'difficult', label: t('Difficult', 'Difícil', 'Difícil', 'Difficile', 'Schwierig') },
        {
          id: 'very_difficult',
          label: t(
            'Very difficult',
            'Muito difícil',
            'Muy difícil',
            'Très difficile',
            'Sehr schwierig',
          ),
        },
        { id: 'dont_remember', label: dontRemember },
      ],
    },
    {
      id: 'C04',
      type: 'single_choice',
      dimension: 'checkout_clarity',
      required: true,
      label: t(
        'What, if anything, was unclear when you purchased credits?',
        'O que, se alguma coisa, não estava claro quando comprou créditos?',
        '¿Qué, si es que algo, no estaba claro cuando compraste créditos?',
        "Qu'est-ce qui, le cas échéant, n'était pas clair lors de l'achat de crédits ?",
        'Was war, falls überhaupt etwas, beim Kauf von Credits unklar?',
      ),
      options: [
        {
          id: 'pack_price',
          label: t(
            'The price of credit packs',
            'O preço dos pacotes de créditos',
            'El precio de los paquetes de créditos',
            'Le prix des packages de crédits',
            'Der Preis der Credit-Pakete',
          ),
        },
        {
          id: 'credits_needed',
          label: t(
            'Credits needed for the product I wanted',
            'Os créditos necessários para o produto que queria',
            'Los créditos necesarios para el producto que quería',
            'Les crédits nécessaires pour le produit que je voulais',
            'Die Credits, die ich für das gewünschte Produkt brauchte',
          ),
        },
        {
          id: 'total_cost',
          label: t(
            'The final amount to pay',
            'O valor final a pagar',
            'El importe final a pagar',
            'Le montant final à payer',
            'Der zu zahlende Endbetrag',
          ),
        },
        {
          id: 'payment_options',
          label: t(
            'Payment options',
            'As opções de pagamento',
            'Las opciones de pago',
            'Les modes de paiement',
            'Die Zahlungsoptionen',
          ),
        },
        {
          id: 'how_to_use',
          label: t(
            'How to use credits afterward',
            'Como usar os créditos depois',
            'Cómo usar los créditos después',
            'Comment utiliser les crédits ensuite',
            'Wie man die Credits danach verwendet',
          ),
        },
        {
          id: 'nothing',
          label: t(
            'Everything was clear',
            'Estava tudo claro',
            'Todo estaba claro',
            'Tout était clair',
            'Alles war klar',
          ),
        },
        { id: 'dont_remember', label: dontRemember },
      ],
    },
    {
      id: 'C05',
      type: 'stars',
      dimension: 'paid_quality_score',
      required: true,
      visibleWhen: { question: 'C02', operator: 'not_equals', value: 'not_used' },
      label: t(
        "How well have the paid features you've used met your expectations?",
        'Em que medida as funcionalidades pagas que utilizou corresponderam às suas expectativas?',
        '¿Hasta qué punto las funciones de pago que has usado han cumplido tus expectativas?',
        'Dans quelle mesure les fonctionnalités payantes que vous avez utilisées ont-elles répondu à vos attentes ?',
        'Inwieweit haben die kostenpflichtigen Funktionen, die du genutzt hast, deine Erwartungen erfüllt?',
      ),
      options: [
        {
          id: '1',
          value: 1,
          label: t(
            'Far below expectations',
            'Muito abaixo das expectativas',
            'Muy por debajo de lo esperado',
            'Très en dessous de mes attentes',
            'Weit unter meinen Erwartungen',
          ),
        },
        {
          id: '2',
          value: 2,
          label: t(
            'Below expectations',
            'Abaixo das expectativas',
            'Por debajo de lo esperado',
            'En dessous de mes attentes',
            'Unter meinen Erwartungen',
          ),
        },
        {
          id: '3',
          value: 3,
          label: t(
            'Partly met expectations',
            'Em parte conforme as expectativas',
            'En parte como esperaba',
            'Partiellement à la hauteur de mes attentes',
            'Teilweise wie erwartet',
          ),
        },
        {
          id: '4',
          value: 4,
          label: t(
            'Met expectations',
            'Conforme as expectativas',
            'Como esperaba',
            'À la hauteur de mes attentes',
            'Wie erwartet',
          ),
        },
        {
          id: '5',
          value: 5,
          label: t(
            'Exceeded expectations',
            'Acima das expectativas',
            'Por encima de lo esperado',
            'Au-delà de mes attentes',
            'Über meinen Erwartungen',
          ),
        },
        {
          id: 'not_applicable',
          notApplicable: true,
          label: t(
            "I haven't used a paid feature yet",
            'Ainda não utilizei nenhuma funcionalidade paga',
            'Todavía no he usado ninguna función de pago',
            "Je n'ai pas encore utilisé de fonctionnalité payante",
            'Ich habe noch keine kostenpflichtige Funktion genutzt',
          ),
        },
      ],
    },
    {
      id: 'C06',
      type: 'single_choice',
      dimension: 'future_product_interest',
      required: true,
      label: t(
        'Which Mythoria product or service would interest you most in the future?',
        'Que produto ou serviço do Mythoria lhe interessaria mais no futuro?',
        '¿Qué producto o servicio de Mythoria te interesaría más en el futuro?',
        "Quel produit ou service Mythoria vous intéresserait le plus à l'avenir ?",
        'Welches Mythoria-Produkt oder welche Mythoria-Leistung würde dich in Zukunft am meisten interessieren?',
      ),
      options: [
        {
          id: 'new_stories',
          label: t(
            'More personalized stories',
            'Mais histórias personalizadas',
            'Más historias personalizadas',
            "Plus d'histoires personnalisées",
            'Mehr personalisierte Geschichten',
          ),
        },
        {
          id: 'printed',
          label: t(
            'Printed books',
            'Livros impressos',
            'Libros impresos',
            'Livres imprimés',
            'Gedruckte Bücher',
          ),
        },
        {
          id: 'audio',
          label: t('Audiobooks', 'Audiolivros', 'Audiolibros', 'Livres audio', 'Hörbücher'),
        },
        {
          id: 'pdf',
          label: t(
            'PDFs to keep or print',
            'PDFs para guardar ou imprimir',
            'PDF para guardar o imprimir',
            'PDF à conserver ou à imprimer',
            'PDF-Dateien zum Aufbewahren oder Drucken',
          ),
        },
        {
          id: 'editing',
          label: t(
            'Editing and personalization tools',
            'Ferramentas de edição e personalização',
            'Herramientas de edición y personalización',
            'Outils de modification et de personnalisation',
            'Bearbeitungs- und Personalisierungswerkzeuge',
          ),
        },
        {
          id: 'none',
          label: t(
            'None in particular',
            'Nenhum em particular',
            'Ninguno en particular',
            'Aucun en particulier',
            'Keine bestimmten',
          ),
        },
      ],
    },
    {
      id: 'C07',
      type: 'buttons',
      selection: 'single',
      dimension: 'payment_model_preference',
      required: true,
      label: t(
        'For future purchases, which option would you prefer?',
        'Para compras futuras, que opção preferiria?',
        'Para futuras compras, ¿qué opción preferirías?',
        'Pour vos futurs achats, quelle option préféreriez-vous ?',
        'Welche Option würdest du für künftige Käufe bevorzugen?',
      ),
      options: [
        {
          id: 'direct',
          label: t(
            'Pay directly for the product I want',
            'Pagar diretamente o produto que quero',
            'Pagar directamente el producto que quiero',
            'Payer directement le produit que je veux',
            'Das gewünschte Produkt direkt bezahlen',
          ),
        },
        {
          id: 'credits',
          label: t(
            'Keep buying flexible credits',
            'Continuar a comprar créditos flexíveis',
            'Seguir comprando créditos flexibles',
            'Continuer à acheter des crédits flexibles',
            'Weiterhin flexible Credits kaufen',
          ),
        },
        {
          id: 'bundle',
          label: t(
            'Buy a package with several formats',
            'Comprar um pacote com vários formatos',
            'Comprar un pack con varios formatos',
            'Acheter un pack avec plusieurs formats',
            'Ein Paket mit mehreren Formaten kaufen',
          ),
        },
        { id: 'no_preference', label: noPreference },
      ],
    },
    {
      id: 'C08',
      type: 'single_choice',
      dimension: 'repeat_trigger',
      required: true,
      label: t(
        'What would most motivate you to use Mythoria again?',
        'O que seria mais motivador para voltar a usar o Mythoria?',
        '¿Qué te motivaría más a volver a usar Mythoria?',
        "Qu'est-ce qui vous motiverait le plus à utiliser Mythoria de nouveau ?",
        'Was würde dich am meisten motivieren, Mythoria wieder zu nutzen?',
      ),
      options: [
        {
          id: 'gifts',
          label: t(
            'Personalized gifts for special occasions',
            'Prendas personalizadas para ocasiões especiais',
            'Regalos personalizados para ocasiones especiales',
            'Des cadeaux personnalisés pour les occasions spéciales',
            'Personalisierte Geschenke für besondere Anlässe',
          ),
        },
        {
          id: 'continuations',
          label: t(
            'Continue stories with existing characters',
            'Continuar histórias com personagens existentes',
            'Continuar historias con personajes existentes',
            'Poursuivre des histoires avec des personnages existants',
            'Geschichten mit bestehenden Figuren fortsetzen',
          ),
        },
        {
          id: 'regular_stories',
          label: t(
            'Regular stories for children',
            'Histórias regulares para crianças',
            'Historias habituales para niños',
            'Des histoires régulières pour les enfants',
            'Regelmäßig Geschichten für Kinder',
          ),
        },
        {
          id: 'memories',
          label: t(
            'Turn more memories into books',
            'Transformar mais memórias em livros',
            'Convertir más recuerdos en libros',
            'Transformer davantage de souvenirs en livres',
            'Weitere Erinnerungen in Bücher verwandeln',
          ),
        },
        {
          id: 'features',
          label: t(
            'New features and customization options',
            'Novas funcionalidades e opções de personalização',
            'Nuevas funciones y opciones de personalización',
            'De nouvelles fonctionnalités et options de personnalisation',
            'Neue Funktionen und Anpassungsoptionen',
          ),
        },
        {
          id: 'offers',
          label: t(
            'Offers for returning customers',
            'Ofertas para clientes que regressam',
            'Ofertas para clientes que vuelven',
            'Des offres pour les clients fidèles',
            'Angebote für wiederkehrende Kundinnen und Kunden',
          ),
        },
        { id: 'nothing', label: nothingInParticular },
      ],
    },
    {
      id: 'C09',
      type: 'slider',
      dimension: 'stated_repeat_likelihood',
      required: true,
      label: t(
        'How likely are you to create another story with Mythoria in the next three months?',
        'Qual a probabilidade de criar outra história com o Mythoria nos próximos três meses?',
        '¿Cómo de probable es que crees otra historia con Mythoria en los próximos tres meses?',
        'Quelle est la probabilité que vous créiez une autre histoire avec Mythoria dans les trois prochains mois ?',
        'Wie wahrscheinlich ist es, dass du in den nächsten drei Monaten eine weitere Geschichte mit Mythoria erstellst?',
      ),
      validation: { min: 0, max: 10, step: 1 },
      minLabel: t(
        'Not at all likely',
        'Nada provável',
        'Nada probable',
        'Pas du tout probable',
        'Überhaupt nicht wahrscheinlich',
      ),
      maxLabel: t(
        'Extremely likely',
        'Extremamente provável',
        'Extremadamente probable',
        'Extrêmement probable',
        'Äußerst wahrscheinlich',
      ),
      naOptions: [
        {
          id: 'unsure',
          notApplicable: true,
          label: t(
            'Not sure',
            'Não tenho a certeza',
            'No lo sé',
            'Je ne sais pas',
            'Ich bin mir nicht sicher',
          ),
        },
      ],
    },
    {
      id: 'C10',
      type: 'long_text',
      dimension: 'open_improvement',
      required: false,
      label: t(
        'If you could improve one thing about Mythoria, what would it be?',
        'Se pudesse melhorar uma coisa no Mythoria, o que seria?',
        'Si pudieras mejorar una cosa de Mythoria, ¿cuál sería?',
        'Si vous pouviez améliorer une chose chez Mythoria, laquelle serait-ce ?',
        'Wenn du eine Sache an Mythoria verbessern könntest, welche wäre es?',
      ),
      help: t(
        "Optional. Please don't include children's names or private story content.",
        'Opcional. Não inclua nomes de crianças nem conteúdo privado das histórias.',
        'Opcional. No incluyas nombres de menores ni contenido privado de las historias.',
        "Facultatif. Merci de ne pas indiquer de prénoms d'enfants ni de contenu privé d'histoires.",
        'Optional. Bitte nenne keine Namen von Kindern und keine privaten Inhalte aus Geschichten.',
      ),
      validation: { maxLength: 1000 },
    },
  ],
} satisfies SurveyDefinitionInput;
