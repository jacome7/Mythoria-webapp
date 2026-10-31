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

/**
 * Survey C2: one completed free story, no credit purchase.
 * Address forms: pt-PT formal (voce, third person), es-ES informal (tu), fr-FR formal (vous),
 * de-DE informal (du), matching the app's existing UI copy.
 */
export const freeCreatorNoPurchaseV1 = {
  schemaVersion: 1,
  id: 'free_creator_no_purchase',
  version: 1,
  purpose:
    'Explain the gap between free-story activation and a first purchase: who actually read the story, quality versus perceived value, main reason for not buying, price versus credit-pack confusion, awareness of additional products, preferred purchase model and potential for repeat use.',
  title: t(
    'Tell us about your first Mythoria story',
    'Conte-nos como foi a sua primeira história no Mythoria',
    'Cuéntanos qué tal fue tu primera historia en Mythoria',
    'Parlez-nous de votre première histoire Mythoria',
    'Erzähl uns von deiner ersten Mythoria-Geschichte',
  ),
  description: t(
    "You've already created a story. We'd like to know what worked and what could make the experience better.",
    'Já criou uma história. Gostaríamos de saber o que funcionou e o que poderia tornar a experiência melhor.',
    'Ya has creado una historia. Nos gustaría saber qué funcionó y qué podría mejorar la experiencia.',
    "Vous avez déjà créé une histoire. Nous aimerions savoir ce qui a bien fonctionné et ce qui pourrait améliorer l'expérience.",
    'Du hast bereits eine Geschichte erstellt. Wir möchten wissen, was gut funktioniert hat und was das Erlebnis verbessern könnte.',
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
      id: 'B01',
      type: 'single_choice',
      dimension: 'primary_intent',
      required: true,
      label: t(
        'What was your main reason for creating your story?',
        'Qual foi o principal motivo para criar a sua história?',
        '¿Cuál fue tu motivo principal para crear tu historia?',
        'Quelle était votre principale raison de créer votre histoire ?',
        'Was war dein Hauptgrund, deine Geschichte zu erstellen?',
      ),
      options: [
        {
          id: 'child',
          label: t(
            'Create something special for a child',
            'Criar algo especial para uma criança',
            'Crear algo especial para un niño o una niña',
            'Créer quelque chose de spécial pour un enfant',
            'Etwas Besonderes für ein Kind schaffen',
          ),
        },
        {
          id: 'memories',
          label: t(
            'Preserve a memory',
            'Guardar uma memória',
            'Conservar un recuerdo',
            'Préserver un souvenir',
            'Eine Erinnerung bewahren',
          ),
        },
        {
          id: 'gift',
          label: t(
            'Make a gift',
            'Fazer uma prenda',
            'Hacer un regalo',
            'Faire un cadeau',
            'Ein Geschenk machen',
          ),
        },
        {
          id: 'family_reading',
          label: t(
            'Read a story with family',
            'Ler uma história em família',
            'Leer una historia en familia',
            'Lire une histoire en famille',
            'Eine Geschichte gemeinsam mit der Familie lesen',
          ),
        },
        {
          id: 'technology',
          label: t(
            'Try the technology',
            'Experimentar a tecnologia',
            'Probar la tecnología',
            'Essayer la technologie',
            'Die Technologie ausprobieren',
          ),
        },
        { id: 'other', label: other, allowOtherText: true },
      ],
    },
    {
      id: 'B02',
      type: 'buttons',
      selection: 'single',
      dimension: 'reading_completion_self_report',
      required: true,
      label: t(
        'Did you read the story after creating it?',
        'Leu a história depois de a criar?',
        '¿Leíste la historia después de crearla?',
        "Avez-vous lu l'histoire après l'avoir créée ?",
        'Hast du die Geschichte nach dem Erstellen gelesen?',
      ),
      options: [
        {
          id: 'complete',
          label: t(
            'Yes, all of it',
            'Sim, toda',
            'Sí, entera',
            'Oui, en entier',
            'Ja, vollständig',
          ),
        },
        {
          id: 'partial',
          label: t(
            'Yes, part of it',
            'Sim, uma parte',
            'Sí, una parte',
            'Oui, en partie',
            'Ja, teilweise',
          ),
        },
        {
          id: 'not_yet',
          label: t('Not yet', 'Ainda não', 'Todavía no', 'Pas encore', 'Noch nicht'),
        },
        {
          id: 'access_problem',
          label: t(
            'I had trouble opening or reading it',
            'Tive problemas a abrir ou a ler',
            'Tuve problemas para abrirla o leerla',
            "J'ai eu du mal à l'ouvrir ou à la lire",
            'Ich hatte Probleme, sie zu öffnen oder zu lesen',
          ),
        },
      ],
    },
    {
      id: 'B03',
      type: 'stars',
      dimension: 'story_quality_score',
      required: true,
      visibleWhen: { question: 'B02', operator: 'in', value: ['complete', 'partial'] },
      label: t(
        'How well did the story meet your expectations?',
        'Em que medida a história correspondeu às suas expectativas?',
        '¿Hasta qué punto la historia cumplió tus expectativas?',
        "Dans quelle mesure l'histoire a-t-elle répondu à vos attentes ?",
        'Inwieweit hat die Geschichte deine Erwartungen erfüllt?',
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
      ],
    },
    {
      id: 'B04',
      type: 'single_choice',
      dimension: 'quality_improvement',
      required: true,
      label: t(
        'What would you most like to improve about your story?',
        'O que gostaria mais de melhorar na sua história?',
        '¿Qué te gustaría mejorar más de tu historia?',
        "Qu'aimeriez-vous le plus améliorer dans votre histoire ?",
        'Was würdest du an deiner Geschichte am liebsten verbessern?',
      ),
      options: [
        {
          id: 'writing',
          label: t(
            'The writing and storyline',
            'O texto e o enredo',
            'La redacción y la trama',
            "L'écriture et l'intrigue",
            'Der Schreibstil und die Handlung',
          ),
        },
        {
          id: 'illustrations',
          label: t(
            'The illustrations',
            'As ilustrações',
            'Las ilustraciones',
            'Les illustrations',
            'Die Illustrationen',
          ),
        },
        {
          id: 'characters',
          label: t(
            'Character consistency',
            'A coerência das personagens',
            'La coherencia de los personajes',
            'La cohérence des personnages',
            'Die Konsistenz der Figuren',
          ),
        },
        {
          id: 'personalization',
          label: t(
            'Personal details and customization',
            'Os detalhes pessoais e a personalização',
            'Los detalles personales y la personalización',
            'Les détails personnels et la personnalisation',
            'Persönliche Details und Anpassungsmöglichkeiten',
          ),
        },
        {
          id: 'length',
          label: t(
            'Story length or structure',
            'A extensão ou a estrutura da história',
            'La extensión o la estructura de la historia',
            "La longueur ou la structure de l'histoire",
            'Länge oder Aufbau der Geschichte',
          ),
        },
        {
          id: 'nothing',
          label: t(
            'Nothing, I liked the result',
            'Nada, gostei do resultado',
            'Nada, me gustó el resultado',
            "Rien, j'ai aimé le résultat",
            'Nichts, mir hat das Ergebnis gefallen',
          ),
        },
        {
          id: 'not_read',
          label: t(
            "I haven't read it enough to say",
            'Ainda não a li o suficiente para opinar',
            'No la he leído lo suficiente como para opinar',
            'Je ne l’ai pas assez lue pour me prononcer',
            'Ich habe sie nicht genug gelesen, um das zu beurteilen',
          ),
        },
        { id: 'other', label: other, allowOtherText: true },
      ],
    },
    {
      id: 'B05',
      type: 'single_choice',
      dimension: 'primary_nonpurchase_barrier',
      required: true,
      label: t(
        'Which statement best describes what happened after you created your story?',
        'Qual das afirmações descreve melhor o que aconteceu depois de criar a sua história?',
        '¿Qué afirmación describe mejor lo que pasó después de crear tu historia?',
        "Quelle affirmation décrit le mieux ce qui s'est passé après la création de votre histoire ?",
        'Welche Aussage beschreibt am besten, was nach dem Erstellen deiner Geschichte passiert ist?',
      ),
      options: [
        {
          id: 'online_enough',
          label: t(
            'Reading it online was enough for me',
            'Ler online foi suficiente para mim',
            'Me bastó con leerla en línea',
            "Il m'a suffi de la lire en ligne",
            'Sie online zu lesen hat mir gereicht',
          ),
        },
        {
          id: 'price',
          label: t(
            'I was interested in more, but the price felt high',
            'Tinha interesse em mais, mas o preço pareceu-me elevado',
            'Me interesaba más, pero el precio me pareció alto',
            "Je voulais aller plus loin, mais le prix m'a semblé élevé",
            'Ich hätte mehr gewollt, aber der Preis kam mir hoch vor',
          ),
        },
        {
          id: 'credits_confusing',
          label: t(
            "I didn't understand how credits worked",
            'Não percebi como funcionam os créditos',
            'No entendí cómo funcionan los créditos',
            "Je n'ai pas compris comment fonctionnent les crédits",
            'Ich habe nicht verstanden, wie Credits funktionieren',
          ),
        },
        {
          id: 'formats_unknown',
          label: t(
            "I didn't know about print, PDF, or audiobook options",
            'Não sabia que existiam as opções de impressão, PDF ou audiolivro',
            'No sabía que existían las opciones de impresión, PDF o audiolibro',
            "Je ne connaissais pas les options d'impression, de PDF ou de livre audio",
            'Ich kannte die Optionen Druck, PDF oder Hörbuch nicht',
          ),
        },
        {
          id: 'quality_first',
          label: t(
            'I wanted to improve the story first',
            'Queria primeiro melhorar a história',
            'Quería mejorar primero la historia',
            "Je voulais d'abord améliorer l'histoire",
            'Ich wollte die Geschichte zuerst verbessern',
          ),
        },
        {
          id: 'no_time',
          label: t(
            "I didn't have time to continue",
            'Não tive tempo para continuar',
            'No tuve tiempo para continuar',
            "Je n'ai pas eu le temps de continuer",
            'Ich hatte keine Zeit weiterzumachen',
          ),
        },
        {
          id: 'no_need',
          label: t(
            "I didn't need another story or format",
            'Não precisei de outra história ou formato',
            'No necesité otra historia ni otro formato',
            "Je n'ai pas eu besoin d'une autre histoire ni d'un autre format",
            'Ich brauchte keine weitere Geschichte und kein weiteres Format',
          ),
        },
        {
          id: 'checkout_problem',
          label: t(
            'I had trouble completing a purchase',
            'Tive problemas a concluir uma compra',
            'Tuve problemas para completar una compra',
            "J'ai eu du mal à finaliser un achat",
            'Ich hatte Probleme, einen Kauf abzuschließen',
          ),
        },
        { id: 'other', label: other, allowOtherText: true },
      ],
    },
    {
      id: 'B05P',
      type: 'single_choice',
      dimension: 'price_barrier_detail',
      required: true,
      visibleWhen: { question: 'B05', operator: 'equals', value: 'price' },
      label: t(
        'What made the price feel too high?',
        'O que fez com que o preço parecesse elevado?',
        '¿Qué hizo que el precio te pareciera alto?',
        'Qu’est-ce qui vous a fait trouver le prix trop élevé ?',
        'Warum kam dir der Preis zu hoch vor?',
      ),
      options: [
        {
          id: 'total_price',
          label: t(
            'The final price of the product',
            'O preço final do produto',
            'El precio final del producto',
            'Le prix final du produit',
            'Der Endpreis des Produkts',
          ),
        },
        {
          id: 'minimum_pack',
          label: t(
            'Having to buy a credit pack',
            'Ter de comprar um pacote de créditos',
            'Tener que comprar un paquete de créditos',
            'Devoir acheter un package de crédits',
            'Ein Credit-Paket kaufen zu müssen',
          ),
        },
        {
          id: 'value',
          label: t(
            "I wasn't sure the result was worth it",
            'Não tinha a certeza de que o resultado valesse a pena',
            'No tenía claro que el resultado valiera la pena',
            'Je ne savais pas si le résultat en valait la peine',
            'Ich war nicht sicher, ob sich das Ergebnis lohnt',
          ),
        },
        {
          id: 'alternatives',
          label: t(
            'Other options seemed less expensive',
            'Outras opções pareciam mais baratas',
            'Otras opciones parecían más baratas',
            'D’autres options semblaient moins chères',
            'Andere Optionen schienen günstiger',
          ),
        },
        {
          id: 'not_now',
          label: t(
            "I wasn't ready to spend on it yet",
            'Ainda não queria gastar dinheiro com isto',
            'Todavía no quería gastar dinero en esto',
            'Je ne voulais pas encore dépenser pour cela',
            'Ich wollte dafür noch kein Geld ausgeben',
          ),
        },
      ],
    },
    {
      id: 'B05C',
      type: 'single_choice',
      dimension: 'credit_barrier_detail',
      required: true,
      visibleWhen: { question: 'B05', operator: 'equals', value: 'credits_confusing' },
      label: t(
        'What was hardest to understand?',
        'O que foi mais difícil de perceber?',
        '¿Qué fue lo más difícil de entender?',
        'Qu’est-ce qui a été le plus difficile à comprendre ?',
        'Was war am schwersten zu verstehen?',
      ),
      options: [
        {
          id: 'credits_needed',
          label: t(
            'How many credits I needed',
            'De quantos créditos precisava',
            'Cuántos créditos necesitaba',
            'Combien de crédits il me fallait',
            'Wie viele Credits ich brauchte',
          ),
        },
        {
          id: 'credit_cost',
          label: t(
            'How much credits cost',
            'Quanto custam os créditos',
            'Cuánto cuestan los créditos',
            'Combien coûtent les crédits',
            'Wie viel Credits kosten',
          ),
        },
        {
          id: 'buy_pack',
          label: t(
            'Why I needed to buy a pack',
            'Porque é que precisava de comprar um pacote',
            'Por qué necesitaba comprar un paquete',
            'Pourquoi je devais acheter un package',
            'Warum ich ein Paket kaufen musste',
          ),
        },
        {
          id: 'credit_uses',
          label: t(
            'What I could use credits for',
            'Para que podia usar os créditos',
            'Para qué podía usar los créditos',
            'À quoi je pouvais utiliser les crédits',
            'Wofür ich Credits verwenden konnte',
          ),
        },
        { id: 'other', label: other, allowOtherText: true },
      ],
    },
    {
      id: 'B05Q',
      type: 'single_choice',
      dimension: 'quality_barrier_detail',
      required: true,
      visibleWhen: { question: 'B05', operator: 'equals', value: 'quality_first' },
      label: t(
        "What would need to improve before you'd feel ready to finalize your story?",
        'O que teria de melhorar antes de sentir que a sua história está pronta a finalizar?',
        '¿Qué tendría que mejorar para que sintieras que puedes dar tu historia por terminada?',
        'Que faudrait-il améliorer avant que vous ne souhaitiez finaliser votre histoire ?',
        'Was müsste sich verbessern, bevor du bereit wärst, deine Geschichte fertigzustellen?',
      ),
      options: [
        {
          id: 'writing',
          label: t(
            'Text and storyline',
            'O texto e o enredo',
            'El texto y la trama',
            "Le texte et l'intrigue",
            'Text und Handlung',
          ),
        },
        {
          id: 'illustrations',
          label: t(
            'Illustrations',
            'As ilustrações',
            'Las ilustraciones',
            'Les illustrations',
            'Illustrationen',
          ),
        },
        {
          id: 'characters',
          label: t(
            'Characters or consistency',
            'As personagens ou a sua coerência',
            'Los personajes o su coherencia',
            'Les personnages ou leur cohérence',
            'Die Figuren oder ihre Konsistenz',
          ),
        },
        {
          id: 'personalization',
          label: t(
            'More personal details',
            'Mais detalhes pessoais',
            'Más detalles personales',
            'Plus de détails personnels',
            'Mehr persönliche Details',
          ),
        },
        {
          id: 'presentation',
          label: t(
            'Final book presentation',
            'A apresentação final do livro',
            'La presentación final del libro',
            'La présentation finale du livre',
            'Die endgültige Gestaltung des Buches',
          ),
        },
        { id: 'other', label: other, allowOtherText: true },
      ],
    },
    {
      id: 'B05D',
      type: 'single_choice',
      dimension: 'discovery_barrier_detail',
      required: true,
      visibleWhen: { question: 'B05', operator: 'equals', value: 'formats_unknown' },
      label: t(
        'Which option were you least aware of?',
        'De que opção tinha menos conhecimento?',
        '¿Cuál de las opciones conocías menos?',
        'Quelle option connaissiez-vous le moins ?',
        'Welche Option war dir am wenigsten bekannt?',
      ),
      options: [
        {
          id: 'printed',
          label: t(
            'Printed book',
            'Livro impresso',
            'Libro impreso',
            'Livre imprimé',
            'Gedrucktes Buch',
          ),
        },
        {
          id: 'pdf',
          label: t(
            'Downloadable/print-ready PDF',
            'PDF para descarregar/pronto a imprimir',
            'PDF descargable/listo para imprimir',
            'PDF téléchargeable/prêt à imprimer',
            'Herunterladbare/druckfertige PDF-Datei',
          ),
        },
        {
          id: 'audio',
          label: t('Audiobook', 'Audiolivro', 'Audiolibro', 'Livre audio', 'Hörbuch'),
        },
        {
          id: 'all',
          label: t(
            'All of these options',
            'Todas estas opções',
            'Todas estas opciones',
            'Toutes ces options',
            'Alle diese Optionen',
          ),
        },
      ],
    },
    {
      id: 'B05X',
      type: 'single_choice',
      dimension: 'checkout_barrier_detail',
      required: true,
      visibleWhen: { question: 'B05', operator: 'equals', value: 'checkout_problem' },
      label: t(
        'Where did the purchase become difficult?',
        'Em que ponto a compra se tornou difícil?',
        '¿En qué momento se complicó la compra?',
        'À quel moment l’achat est-il devenu difficile ?',
        'Wo wurde der Kauf schwierig?',
      ),
      options: [
        {
          id: 'pack_selection',
          label: t(
            'Choosing a credit pack',
            'Escolher um pacote de créditos',
            'Elegir un paquete de créditos',
            'Choisir un package de crédits',
            'Ein Credit-Paket auswählen',
          ),
        },
        {
          id: 'billing',
          label: t(
            'Entering billing details',
            'Introduzir os dados de faturação',
            'Introducir los datos de facturación',
            'Saisir les informations de facturation',
            'Rechnungsdaten eingeben',
          ),
        },
        {
          id: 'payment_method',
          label: t(
            'Choosing a payment method',
            'Escolher um método de pagamento',
            'Elegir un método de pago',
            'Choisir un mode de paiement',
            'Eine Zahlungsmethode auswählen',
          ),
        },
        {
          id: 'payment_error',
          label: t(
            'Completing the payment',
            'Concluir o pagamento',
            'Completar el pago',
            'Finaliser le paiement',
            'Die Zahlung abschließen',
          ),
        },
        {
          id: 'unsure',
          label: t(
            "I'm not sure",
            'Não tenho a certeza',
            'No lo tengo claro',
            'Je ne sais pas',
            'Ich bin mir nicht sicher',
          ),
        },
      ],
    },
    {
      id: 'B06',
      type: 'single_choice',
      dimension: 'preferred_output',
      required: true,
      label: t(
        'If you could get one additional version of your story, which would interest you most?',
        'Se pudesse obter uma versão adicional da sua história, qual lhe interessaria mais?',
        'Si pudieras obtener una versión adicional de tu historia, ¿cuál te interesaría más?',
        'Si vous pouviez obtenir une version supplémentaire de votre histoire, laquelle vous intéresserait le plus ?',
        'Wenn du eine zusätzliche Version deiner Geschichte bekommen könntest, welche würde dich am meisten interessieren?',
      ),
      options: [
        {
          id: 'printed',
          label: t(
            'A printed book delivered to me',
            'Um livro impresso que me seja entregue',
            'Un libro impreso que me entreguen',
            'Un livre imprimé qui me soit livré',
            'Ein gedrucktes Buch, das mir geliefert wird',
          ),
        },
        {
          id: 'pdf',
          label: t(
            'A PDF to keep or print',
            'Um PDF para guardar ou imprimir',
            'Un PDF para guardar o imprimir',
            'Un PDF à conserver ou à imprimer',
            'Eine PDF-Datei zum Aufbewahren oder Drucken',
          ),
        },
        {
          id: 'audio',
          label: t(
            'A narrated audiobook',
            'Um audiolivro narrado',
            'Un audiolibro narrado',
            'Un livre audio narré',
            'Ein gesprochenes Hörbuch',
          ),
        },
        {
          id: 'bundle',
          label: t(
            'A printed book and audiobook package',
            'Um pacote com livro impresso e audiolivro',
            'Un pack con libro impreso y audiolibro',
            'Un pack livre imprimé et livre audio',
            'Ein Paket aus gedrucktem Buch und Hörbuch',
          ),
        },
        {
          id: 'none',
          label: t(
            'No additional version for now',
            'Nenhuma versão adicional por agora',
            'Ninguna versión adicional por ahora',
            'Aucune version supplémentaire pour le moment',
            'Vorerst keine zusätzliche Version',
          ),
        },
      ],
    },
    {
      id: 'B07',
      type: 'single_choice',
      dimension: 'purchase_enabler',
      required: true,
      label: t(
        'What would make it easiest to get that version?',
        'O que tornaria mais fácil obter essa versão?',
        '¿Qué te facilitaría más conseguir esa versión?',
        "Qu'est-ce qui vous faciliterait le plus l'obtention de cette version ?",
        'Was würde es dir am leichtesten machen, diese Version zu bekommen?',
      ),
      options: [
        {
          id: 'euro_price',
          label: t(
            'See the full price in my currency immediately',
            'Ver logo o preço total na minha moeda',
            'Ver enseguida el precio total en mi moneda',
            'Voir tout de suite le prix total dans ma devise',
            'Den vollen Preis sofort in meiner Währung sehen',
          ),
        },
        {
          id: 'preview',
          label: t(
            'Preview the final version first',
            'Pré-visualizar primeiro a versão final',
            'Previsualizar antes la versión final',
            "Prévisualiser d'abord la version finale",
            'Die endgültige Version vorab ansehen',
          ),
        },
        {
          id: 'examples',
          label: t(
            "See other customers' books or audiobooks",
            'Ver livros ou audiolivros de outros clientes',
            'Ver libros o audiolibros de otros clientes',
            "Voir des livres ou livres audio d'autres clients",
            'Bücher oder Hörbücher anderer Kundinnen und Kunden sehen',
          ),
        },
        {
          id: 'simple_checkout',
          label: t(
            'A simpler purchase process',
            'Um processo de compra mais simples',
            'Un proceso de compra más sencillo',
            "Un processus d'achat plus simple",
            'Ein einfacherer Kaufprozess',
          ),
        },
        {
          id: 'credit_explanation',
          label: t(
            'A clearer explanation of credits',
            'Uma explicação mais clara dos créditos',
            'Una explicación más clara de los créditos',
            'Une explication plus claire des crédits',
            'Eine klarere Erklärung der Credits',
          ),
        },
        {
          id: 'delivery_info',
          label: t(
            'Know the delivery time',
            'Saber o prazo de entrega',
            'Saber el plazo de entrega',
            'Connaître le délai de livraison',
            'Die Lieferzeit kennen',
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
      id: 'B08',
      type: 'buttons',
      selection: 'single',
      dimension: 'payment_model_preference',
      required: true,
      label: t(
        'How would you prefer to pay for a book, PDF, or audiobook?',
        'Como preferiria pagar um livro, um PDF ou um audiolivro?',
        '¿Cómo preferirías pagar un libro, un PDF o un audiolibro?',
        'Comment préféreriez-vous payer un livre, un PDF ou un livre audio ?',
        'Wie würdest du ein Buch, eine PDF-Datei oder ein Hörbuch am liebsten bezahlen?',
      ),
      options: [
        {
          id: 'direct',
          label: t(
            'Pay directly for each product',
            'Pagar diretamente cada produto',
            'Pagar directamente cada producto',
            'Payer directement chaque produit',
            'Jedes Produkt direkt bezahlen',
          ),
        },
        {
          id: 'credits',
          label: t(
            'Buy credits to use across services',
            'Comprar créditos para usar em vários serviços',
            'Comprar créditos para usar en varios servicios',
            'Acheter des crédits à utiliser pour plusieurs services',
            'Credits kaufen, die für verschiedene Leistungen nutzbar sind',
          ),
        },
        {
          id: 'bundle',
          label: t(
            'Buy a package of formats together',
            'Comprar um pacote com vários formatos',
            'Comprar un pack con varios formatos',
            'Acheter un pack de plusieurs formats',
            'Ein Paket mit mehreren Formaten kaufen',
          ),
        },
        {
          id: 'no_preference',
          label: t(
            'No preference',
            'Sem preferência',
            'Sin preferencia',
            'Pas de préférence',
            'Keine Präferenz',
          ),
        },
        {
          id: 'no_purchase',
          label: t(
            "I don't plan to buy these products",
            'Não pretendo comprar estes produtos',
            'No pienso comprar estos productos',
            'Je ne prévois pas d’acheter ces produits',
            'Ich habe nicht vor, diese Produkte zu kaufen',
          ),
        },
      ],
    },
    {
      id: 'B09',
      type: 'single_choice',
      dimension: 'repeat_trigger',
      required: true,
      label: t(
        'What would most motivate you to create another story?',
        'O que seria mais motivador para criar outra história?',
        '¿Qué te motivaría más a crear otra historia?',
        "Qu'est-ce qui vous motiverait le plus à créer une autre histoire ?",
        'Was würde dich am meisten motivieren, eine weitere Geschichte zu erstellen?',
      ),
      options: [
        {
          id: 'occasion',
          label: t(
            'A birthday, holiday, or other special occasion',
            'Um aniversário, uma festividade ou outra ocasião especial',
            'Un cumpleaños, unas fiestas u otra ocasión especial',
            'Un anniversaire, une fête ou une autre occasion spéciale',
            'Ein Geburtstag, ein Feiertag oder ein anderer besonderer Anlass',
          ),
        },
        {
          id: 'same_characters',
          label: t(
            'Continue an adventure with the same characters',
            'Continuar uma aventura com as mesmas personagens',
            'Continuar una aventura con los mismos personajes',
            'Poursuivre une aventure avec les mêmes personnages',
            'Ein Abenteuer mit denselben Figuren fortsetzen',
          ),
        },
        {
          id: 'templates',
          label: t(
            'New ideas and ready-to-personalize templates',
            'Novas ideias e modelos prontos a personalizar',
            'Ideas nuevas y plantillas listas para personalizar',
            'De nouvelles idées et des modèles prêts à personnaliser',
            'Neue Ideen und Vorlagen, die sich direkt personalisieren lassen',
          ),
        },
        {
          id: 'regular_reading',
          label: t(
            'Stories for regular family reading',
            'Histórias para leitura regular em família',
            'Historias para leer en familia con regularidad',
            'Des histoires pour des lectures régulières en famille',
            'Geschichten für regelmäßiges Lesen in der Familie',
          ),
        },
        {
          id: 'new_memories',
          label: t(
            'New photos or memories to turn into a story',
            'Novas fotografias ou memórias para transformar numa história',
            'Nuevas fotos o recuerdos para convertir en una historia',
            'De nouvelles photos ou de nouveaux souvenirs à transformer en histoire',
            'Neue Fotos oder Erinnerungen, die ich in eine Geschichte verwandeln kann',
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
            "I don't plan to create another story",
            'Não pretendo criar outra história',
            'No pienso crear otra historia',
            'Je ne prévois pas de créer une autre histoire',
            'Ich habe nicht vor, eine weitere Geschichte zu erstellen',
          ),
        },
      ],
    },
    {
      id: 'B10',
      type: 'long_text',
      dimension: 'open_improvement',
      required: false,
      label: t(
        'If you could change one thing about Mythoria, what would it be?',
        'Se pudesse mudar uma coisa no Mythoria, o que seria?',
        'Si pudieras cambiar una cosa de Mythoria, ¿cuál sería?',
        'Si vous pouviez changer une chose chez Mythoria, laquelle serait-ce ?',
        'Wenn du eine Sache an Mythoria ändern könntest, welche wäre es?',
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
