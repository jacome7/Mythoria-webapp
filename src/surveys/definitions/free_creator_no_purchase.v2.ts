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

const other = t('Other', 'Outra', 'Otra', 'Autre', 'Sonstiges');

/**
 * Survey C2 v2: one completed free story, no credit purchase (Mythoria_C2_Survey_Final.md).
 * Replaces v1; v1 stays published for its existing responses.
 *
 * Branching (all on earlier answers):
 * - B03 (rating) and B05 (perceived value) only when the story was read (all or part).
 * - Exactly one of B04 (read) / B04N (not read) is shown; both share one analysis dimension.
 * - B04A follows a price/credit concern from either variant.
 * - B04B (story improvement) shows once: low rating (B03 <= 3) or "improve before paying".
 * - B04C follows "didn't know about the additional formats".
 * Address forms: pt-PT formal (third person), es-ES informal (tu), fr-FR formal (vous),
 * de-DE informal (du), matching the app's existing UI copy.
 */
export const freeCreatorNoPurchaseV2 = {
  schemaVersion: 1,
  id: 'free_creator_no_purchase',
  version: 2,
  purpose:
    'Explain the gap between free-story activation and a first purchase: main reason for creating the story, reading completion, quality versus expectations, main reason for not buying (separate wording for readers and non-readers), price and credit concerns, story improvements, awareness of additional formats, perceived value of owning or giving the story, preferred additional version and payment model, and repeat-use motivation.',
  title: t(
    'Help us make Mythoria better',
    'Ajude-nos a tornar o Mythoria melhor',
    'Ayúdanos a mejorar Mythoria',
    'Aidez-nous à améliorer Mythoria',
    'Hilf uns, Mythoria besser zu machen',
  ),
  description: t(
    "You've already created your first story with Mythoria. We'd love to hear how it went, what would make it more valuable, and what could inspire your next one.",
    'Já criou a sua primeira história com o Mythoria. Gostaríamos de saber como correu, o que a tornaria mais valiosa e o que poderia inspirar a próxima.',
    'Ya has creado tu primera historia con Mythoria. Nos encantaría saber cómo fue, qué la haría más valiosa y qué podría inspirar la siguiente.',
    'Vous avez déjà créé votre première histoire avec Mythoria. Nous aimerions savoir comment cela s’est passé, ce qui la rendrait plus précieuse et ce qui pourrait inspirer la suivante.',
    'Du hast mit Mythoria bereits deine erste Geschichte erstellt. Wir würden gern erfahren, wie es lief, was sie wertvoller machen würde und was dich zur nächsten inspirieren könnte.',
  ),
  intro: t(
    "We'll use your feedback, together with how you use Mythoria, to understand and improve our experience. Your responses will not be published.",
    'Vamos usar a sua opinião, em conjunto com a forma como utiliza o Mythoria, para compreender e melhorar a nossa experiência. As suas respostas não serão publicadas.',
    'Usaremos tus comentarios, junto con cómo usas Mythoria, para entender y mejorar nuestra experiencia. Tus respuestas no se publicarán.',
    'Nous utiliserons vos commentaires, ainsi que votre usage de Mythoria, pour comprendre et améliorer notre expérience. Vos réponses ne seront pas publiées.',
    'Wir nutzen dein Feedback zusammen mit deiner Nutzung von Mythoria, um unser Erlebnis zu verstehen und zu verbessern. Deine Antworten werden nicht veröffentlicht.',
  ),
  completionMessage: t(
    'Thank you for helping us improve Mythoria! Choose your complimentary PDF or audiobook for an eligible story.',
    'Obrigado por nos ajudar a melhorar o Mythoria! Escolha o seu PDF ou audiolivro gratuito para uma história elegível.',
    '¡Gracias por ayudarnos a mejorar Mythoria! Elige tu PDF o audiolibro gratuito para una historia elegible.',
    'Merci de nous aider à améliorer Mythoria ! Choisissez votre PDF ou livre audio offert pour une histoire éligible.',
    'Danke, dass du uns hilfst, Mythoria zu verbessern! Wähle dein kostenloses PDF oder Hörbuch für eine passende Geschichte aus.',
  ),
  estimatedMinutes: 3,
  responsePolicy: { identity: 'invitation', maxCompletedPerInvitation: 1 },
  rewardEligible: true,
  internalOnly: false,
  questions: [
    // Section 1: Your first story
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
            'Create something special for a child.',
            'Criar algo especial para uma criança.',
            'Crear algo especial para un niño o una niña.',
            'Créer quelque chose de spécial pour un enfant.',
            'Etwas Besonderes für ein Kind schaffen.',
          ),
        },
        {
          id: 'memories',
          label: t(
            'Preserve a personal or family memory.',
            'Guardar uma memória pessoal ou familiar.',
            'Conservar un recuerdo personal o familiar.',
            'Préserver un souvenir personnel ou familial.',
            'Eine persönliche oder familiäre Erinnerung bewahren.',
          ),
        },
        {
          id: 'gift',
          label: t(
            'Make a gift for someone.',
            'Fazer uma prenda para alguém.',
            'Hacer un regalo para alguien.',
            'Faire un cadeau à quelqu’un.',
            'Jemandem ein Geschenk machen.',
          ),
        },
        {
          id: 'explore',
          label: t(
            'Try Mythoria and see what it could do.',
            'Experimentar o Mythoria e ver o que consegue fazer.',
            'Probar Mythoria y ver qué podía hacer.',
            'Essayer Mythoria et voir ce qu’elle peut faire.',
            'Mythoria ausprobieren und sehen, was es kann.',
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
        'Did you read your story after creating it?',
        'Leu a sua história depois de a criar?',
        '¿Leíste tu historia después de crearla?',
        'Avez-vous lu votre histoire après l’avoir créée ?',
        'Hast du deine Geschichte nach dem Erstellen gelesen?',
      ),
      options: [
        {
          id: 'complete',
          label: t(
            'Yes, all of it.',
            'Sim, toda.',
            'Sí, entera.',
            'Oui, en entier.',
            'Ja, vollständig.',
          ),
        },
        {
          id: 'partial',
          label: t(
            'Yes, part of it.',
            'Sim, uma parte.',
            'Sí, una parte.',
            'Oui, en partie.',
            'Ja, teilweise.',
          ),
        },
        {
          id: 'not_yet',
          label: t('Not yet.', 'Ainda não.', 'Todavía no.', 'Pas encore.', 'Noch nicht.'),
        },
        {
          id: 'access_problem',
          label: t(
            'I had trouble opening or reading it.',
            'Tive problemas a abri-la ou a lê-la.',
            'Tuve problemas para abrirla o leerla.',
            'J’ai eu du mal à l’ouvrir ou à la lire.',
            'Ich hatte Probleme, sie zu öffnen oder zu lesen.',
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
        'How well did your story meet your expectations?',
        'Em que medida a sua história correspondeu às suas expectativas?',
        '¿Hasta qué punto tu historia cumplió tus expectativas?',
        'Dans quelle mesure votre histoire a-t-elle répondu à vos attentes ?',
        'Inwieweit hat deine Geschichte deine Erwartungen erfüllt?',
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

    // Section 2: Why the free experience did not become a purchase
    {
      id: 'B04',
      type: 'single_choice',
      dimension: 'primary_nonpurchase_barrier',
      required: true,
      visibleWhen: { question: 'B02', operator: 'in', value: ['complete', 'partial'] },
      label: t(
        "Which statement best explains why you haven't made a purchase after creating your story?",
        'Qual das afirmações explica melhor por que ainda não fez uma compra depois de criar a sua história?',
        '¿Qué afirmación explica mejor por qué todavía no has hecho una compra después de crear tu historia?',
        'Quelle affirmation explique le mieux pourquoi vous n’avez pas encore effectué d’achat après la création de votre histoire ?',
        'Welche Aussage erklärt am besten, warum du nach dem Erstellen deiner Geschichte noch nichts gekauft hast?',
      ),
      options: [
        {
          id: 'online_enough',
          label: t(
            'Reading the free online version was enough for me.',
            'Ler a versão online gratuita foi suficiente para mim.',
            'Me bastó con leer la versión gratuita en línea.',
            'La lecture de la version gratuite en ligne m’a suffi.',
            'Die kostenlose Online-Version zu lesen hat mir gereicht.',
          ),
        },
        {
          id: 'price_credits',
          label: t(
            'The price or credit system discouraged me.',
            'O preço ou o sistema de créditos desencorajou-me.',
            'El precio o el sistema de créditos me desanimó.',
            'Le prix ou le système de crédits m’a découragé(e).',
            'Der Preis oder das Credit-System hat mich abgeschreckt.',
          ),
        },
        {
          id: 'improve_first',
          label: t(
            'I wanted to improve my story before paying.',
            'Queria melhorar a minha história antes de pagar.',
            'Quería mejorar mi historia antes de pagar.',
            'Je voulais améliorer mon histoire avant de payer.',
            'Ich wollte meine Geschichte verbessern, bevor ich bezahle.',
          ),
        },
        {
          id: 'formats_unknown',
          label: t(
            "I didn't know about the additional formats available.",
            'Não sabia dos formatos adicionais disponíveis.',
            'No sabía que había formatos adicionales disponibles.',
            'Je ne connaissais pas les formats supplémentaires disponibles.',
            'Ich kannte die zusätzlich verfügbaren Formate nicht.',
          ),
        },
        { id: 'other', label: other, allowOtherText: true },
      ],
    },
    {
      id: 'B04N',
      type: 'single_choice',
      // Same dimension as B04: exactly one of the two is ever shown.
      dimension: 'primary_nonpurchase_barrier',
      required: true,
      visibleWhen: { question: 'B02', operator: 'in', value: ['not_yet', 'access_problem'] },
      label: t(
        'What has kept you from taking the next step with your story?',
        'O que o tem impedido de dar o passo seguinte com a sua história?',
        '¿Qué te ha impedido dar el siguiente paso con tu historia?',
        'Qu’est-ce qui vous a empêché de passer à l’étape suivante avec votre histoire ?',
        'Was hat dich davon abgehalten, den nächsten Schritt mit deiner Geschichte zu gehen?',
      ),
      options: [
        {
          id: 'no_time',
          label: t(
            "I haven't had time to read it yet.",
            'Ainda não tive tempo para a ler.',
            'Todavía no he tenido tiempo de leerla.',
            'Je n’ai pas encore eu le temps de la lire.',
            'Ich hatte noch keine Zeit, sie zu lesen.',
          ),
        },
        {
          // Reveals the optional "what went wrong" text field.
          id: 'access_problem',
          allowOtherText: true,
          label: t(
            'I had trouble opening or reading it.',
            'Tive problemas a abri-la ou a lê-la.',
            'Tuve problemas para abrirla o leerla.',
            'J’ai eu du mal à l’ouvrir ou à la lire.',
            'Ich hatte Probleme, sie zu öffnen oder zu lesen.',
          ),
        },
        {
          id: 'no_need',
          label: t(
            "I don't currently need another story or format.",
            'Neste momento não preciso de outra história ou formato.',
            'Ahora mismo no necesito otra historia ni otro formato.',
            'Je n’ai pas besoin d’une autre histoire ni d’un autre format pour le moment.',
            'Ich brauche im Moment keine weitere Geschichte und kein weiteres Format.',
          ),
        },
        {
          id: 'price_unsure',
          label: t(
            'I was unsure about prices or credits.',
            'Tinha dúvidas sobre os preços ou os créditos.',
            'Tenía dudas sobre los precios o los créditos.',
            'J’avais des doutes sur les prix ou les crédits.',
            'Ich war unsicher wegen der Preise oder Credits.',
          ),
        },
        { id: 'other', label: other, allowOtherText: true },
      ],
    },
    {
      id: 'B04A',
      type: 'single_choice',
      dimension: 'price_barrier_detail',
      required: true,
      visibleWhen: {
        any: [
          { question: 'B04', operator: 'equals', value: 'price_credits' },
          { question: 'B04N', operator: 'equals', value: 'price_unsure' },
        ],
      },
      label: t(
        'What was your biggest concern about purchasing?',
        'Qual foi a sua maior preocupação em relação à compra?',
        '¿Cuál fue tu mayor preocupación sobre la compra?',
        'Quelle a été votre principale préoccupation concernant l’achat ?',
        'Was war deine größte Sorge beim Kauf?',
      ),
      options: [
        {
          id: 'total_price',
          label: t(
            'The total price felt too high.',
            'O preço total pareceu-me demasiado elevado.',
            'El precio total me pareció demasiado alto.',
            'Le prix total m’a semblé trop élevé.',
            'Der Gesamtpreis kam mir zu hoch vor.',
          ),
        },
        {
          id: 'minimum_pack',
          label: t(
            "I didn't want to buy a pack of credits.",
            'Não queria comprar um pacote de créditos.',
            'No quería comprar un paquete de créditos.',
            'Je ne voulais pas acheter un pack de crédits.',
            'Ich wollte kein Credit-Paket kaufen.',
          ),
        },
        {
          id: 'credits_needed',
          label: t(
            "I wasn't sure how many credits I needed.",
            'Não tinha a certeza de quantos créditos precisava.',
            'No tenía claro cuántos créditos necesitaba.',
            'Je ne savais pas combien de crédits il me fallait.',
            'Ich war nicht sicher, wie viele Credits ich brauche.',
          ),
        },
        {
          id: 'value',
          label: t(
            "I wasn't sure the result would be worth paying for.",
            'Não tinha a certeza de que o resultado valesse o preço.',
            'No tenía claro que el resultado mereciera lo que costaba.',
            'Je ne savais pas si le résultat vaudrait la peine de payer.',
            'Ich war nicht sicher, ob sich das Ergebnis zu bezahlen lohnt.',
          ),
        },
        {
          id: 'checkout',
          label: t(
            'The checkout or payment process felt difficult.',
            'O processo de compra ou de pagamento pareceu-me difícil.',
            'El proceso de compra o de pago me pareció difícil.',
            'Le processus d’achat ou de paiement m’a semblé difficile.',
            'Der Kauf- oder Zahlungsvorgang kam mir schwierig vor.',
          ),
        },
      ],
    },
    {
      id: 'B04B',
      type: 'single_choice',
      dimension: 'quality_improvement',
      required: true,
      // Shown once: low rating (1-3) or "improve before paying", asked after B04.
      visibleWhen: {
        any: [
          { question: 'B03', operator: 'lte', value: 3 },
          { question: 'B04', operator: 'equals', value: 'improve_first' },
        ],
      },
      label: t(
        'What would you most like to improve about your story?',
        'O que gostaria mais de melhorar na sua história?',
        '¿Qué te gustaría mejorar más de tu historia?',
        'Qu’aimeriez-vous le plus améliorer dans votre histoire ?',
        'Was würdest du an deiner Geschichte am liebsten verbessern?',
      ),
      options: [
        {
          id: 'writing',
          label: t(
            'The writing and storyline.',
            'O texto e o enredo.',
            'La redacción y la trama.',
            'L’écriture et l’intrigue.',
            'Der Schreibstil und die Handlung.',
          ),
        },
        {
          id: 'illustrations',
          label: t(
            'The illustrations.',
            'As ilustrações.',
            'Las ilustraciones.',
            'Les illustrations.',
            'Die Illustrationen.',
          ),
        },
        {
          id: 'characters',
          label: t(
            'The characters and their consistency.',
            'As personagens e a sua coerência.',
            'Los personajes y su coherencia.',
            'Les personnages et leur cohérence.',
            'Die Figuren und ihre Konsistenz.',
          ),
        },
        {
          id: 'personalization',
          label: t(
            'The level of personalization.',
            'O nível de personalização.',
            'El nivel de personalización.',
            'Le niveau de personnalisation.',
            'Der Grad der Personalisierung.',
          ),
        },
        { id: 'other', label: other, allowOtherText: true },
      ],
    },
    {
      id: 'B04C',
      type: 'single_choice',
      dimension: 'discovery_barrier_detail',
      required: true,
      visibleWhen: { question: 'B04', operator: 'equals', value: 'formats_unknown' },
      label: t(
        'Which additional format were you least aware of?',
        'De que formato adicional tinha menos conhecimento?',
        '¿Cuál de los formatos adicionales conocías menos?',
        'Quel format supplémentaire connaissiez-vous le moins ?',
        'Welches zusätzliche Format war dir am wenigsten bekannt?',
      ),
      options: [
        {
          id: 'printed',
          label: t(
            'Printed books.',
            'Livros impressos.',
            'Libros impresos.',
            'Livres imprimés.',
            'Gedruckte Bücher.',
          ),
        },
        {
          id: 'pdf',
          label: t(
            'Print-ready PDFs.',
            'PDFs prontos a imprimir.',
            'PDF listos para imprimir.',
            'PDF prêts à imprimer.',
            'Druckfertige PDF-Dateien.',
          ),
        },
        {
          id: 'audio',
          label: t('Audiobooks.', 'Audiolivros.', 'Audiolibros.', 'Livres audio.', 'Hörbücher.'),
        },
        {
          id: 'all',
          label: t('All of these.', 'Todos estes.', 'Todos estos.', 'Tous ceux-ci.', 'Alle diese.'),
        },
      ],
    },
    {
      id: 'B05',
      type: 'single_choice',
      dimension: 'story_value_perception',
      required: true,
      visibleWhen: { question: 'B02', operator: 'in', value: ['complete', 'partial'] },
      label: t(
        'What best describes how you felt about your finished story?',
        'O que melhor descreve o que sentiu em relação à sua história concluída?',
        '¿Qué describe mejor lo que sentiste sobre tu historia terminada?',
        'Qu’est-ce qui décrit le mieux ce que vous avez ressenti à propos de votre histoire terminée ?',
        'Was beschreibt am besten, wie du deine fertige Geschichte empfunden hast?',
      ),
      help: t(
        'Choose the statement that feels closest to your experience.',
        'Escolha a afirmação que mais se aproxima da sua experiência.',
        'Elige la afirmación que más se parezca a tu experiencia.',
        'Choisissez l’affirmation qui se rapproche le plus de votre expérience.',
        'Wähle die Aussage, die deiner Erfahrung am nächsten kommt.',
      ),
      options: [
        {
          id: 'keepsake',
          label: t(
            'Something meaningful I would like to keep.',
            'Algo com significado que gostaria de guardar.',
            'Algo especial que me gustaría conservar.',
            'Quelque chose de significatif que j’aimerais conserver.',
            'Etwas Bedeutungsvolles, das ich behalten möchte.',
          ),
        },
        {
          id: 'share',
          label: t(
            'Something I would enjoy sharing with others.',
            'Algo que gostaria de partilhar com outras pessoas.',
            'Algo que disfrutaría compartiendo con otras personas.',
            'Quelque chose que j’aimerais partager avec d’autres.',
            'Etwas, das ich gern mit anderen teilen würde.',
          ),
        },
        {
          id: 'fun_only',
          label: t(
            'A fun experience, but not something I need to own.',
            'Uma experiência divertida, mas não algo que precise de ter.',
            'Una experiencia divertida, pero no algo que necesite tener.',
            'Une expérience amusante, mais pas quelque chose que j’ai besoin de posséder.',
            'Ein unterhaltsames Erlebnis, aber nichts, was ich besitzen muss.',
          ),
        },
        {
          id: 'gift',
          label: t(
            'A story I might want to give as a gift.',
            'Uma história que talvez quisesse oferecer.',
            'Una historia que quizá querría regalar.',
            'Une histoire que j’aimerais peut-être offrir.',
            'Eine Geschichte, die ich vielleicht verschenken möchte.',
          ),
        },
        {
          id: 'not_valuable',
          label: t(
            "It didn't feel particularly valuable to me.",
            'Não me pareceu particularmente valiosa.',
            'No me pareció especialmente valiosa.',
            'Elle ne m’a pas semblé particulièrement précieuse.',
            'Sie kam mir nicht besonders wertvoll vor.',
          ),
        },
      ],
    },

    // Section 3: Future formats, purchasing, and repeat use
    {
      id: 'B06',
      type: 'buttons',
      selection: 'single',
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
            'A PDF to keep or print.',
            'Um PDF para guardar ou imprimir.',
            'Un PDF para guardar o imprimir.',
            'Un PDF à conserver ou à imprimer.',
            'Eine PDF-Datei zum Aufbewahren oder Drucken.',
          ),
        },
        {
          id: 'audio',
          label: t(
            'A narrated audiobook.',
            'Um audiolivro narrado.',
            'Un audiolibro narrado.',
            'Un livre audio narré.',
            'Ein gesprochenes Hörbuch.',
          ),
        },
        {
          id: 'bundle',
          label: t(
            'A package with a printed book and audiobook.',
            'Um pacote com livro impresso e audiolivro.',
            'Un pack con libro impreso y audiolibro.',
            'Un pack avec livre imprimé et livre audio.',
            'Ein Paket aus gedrucktem Buch und Hörbuch.',
          ),
        },
        {
          id: 'none',
          label: t(
            'No additional version for now.',
            'Nenhuma versão adicional por agora.',
            'Ninguna versión adicional por ahora.',
            'Aucune version supplémentaire pour le moment.',
            'Vorerst keine zusätzliche Version.',
          ),
        },
      ],
    },
    {
      id: 'B07',
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
            'Pay directly for each product.',
            'Pagar diretamente cada produto.',
            'Pagar directamente cada producto.',
            'Payer directement chaque produit.',
            'Jedes Produkt direkt bezahlen.',
          ),
        },
        {
          id: 'credits',
          label: t(
            'Buy credits to use across different services.',
            'Comprar créditos para usar em diferentes serviços.',
            'Comprar créditos para usar en distintos servicios.',
            'Acheter des crédits à utiliser pour différents services.',
            'Credits kaufen, die für verschiedene Leistungen nutzbar sind.',
          ),
        },
        {
          id: 'bundle',
          label: t(
            'Buy a package of formats together.',
            'Comprar um pacote com vários formatos.',
            'Comprar un pack con varios formatos.',
            'Acheter un pack de plusieurs formats.',
            'Ein Paket mit mehreren Formaten kaufen.',
          ),
        },
        {
          id: 'no_preference',
          label: t(
            'No preference.',
            'Sem preferência.',
            'Sin preferencia.',
            'Pas de préférence.',
            'Keine Präferenz.',
          ),
        },
        {
          id: 'no_purchase',
          label: t(
            "I don't plan to buy these products.",
            'Não pretendo comprar estes produtos.',
            'No pienso comprar estos productos.',
            'Je ne prévois pas d’acheter ces produits.',
            'Ich habe nicht vor, diese Produkte zu kaufen.',
          ),
        },
      ],
    },
    {
      // Same wording and option ids as C3 (paying_creator) Q8 for cross-survey comparison.
      id: 'B08',
      type: 'single_choice',
      dimension: 'repeat_trigger',
      required: true,
      label: t(
        'What would most motivate you to use Mythoria again?',
        'O que seria mais motivador para voltar a usar o Mythoria?',
        '¿Qué te motivaría más a volver a usar Mythoria?',
        'Qu’est-ce qui vous motiverait le plus à utiliser Mythoria de nouveau ?',
        'Was würde dich am meisten motivieren, Mythoria wieder zu nutzen?',
      ),
      options: [
        {
          id: 'gifts',
          label: t(
            'Personalized gifts for special occasions.',
            'Ofertas personalizadas para ocasiões especiais.',
            'Regalos personalizados para ocasiones especiales.',
            'Des cadeaux personnalisés pour les occasions spéciales.',
            'Personalisierte Geschenke für besondere Anlässe.',
          ),
        },
        {
          id: 'continuations',
          label: t(
            'Continuing stories with existing characters.',
            'Continuar histórias com personagens existentes.',
            'Continuar historias con personajes existentes.',
            'Poursuivre des histoires avec des personnages existants.',
            'Geschichten mit bestehenden Figuren fortsetzen.',
          ),
        },
        {
          id: 'regular_stories',
          label: t(
            'Creating stories regularly for children.',
            'Criar histórias regularmente para crianças.',
            'Crear historias con regularidad para niños.',
            'Créer régulièrement des histoires pour les enfants.',
            'Regelmäßig Geschichten für Kinder erstellen.',
          ),
        },
        {
          id: 'memories',
          label: t(
            'Turning more personal or family memories into books.',
            'Transformar mais memórias pessoais ou de família em livros.',
            'Convertir más recuerdos personales o familiares en libros.',
            'Transformer davantage de souvenirs personnels ou familiaux en livres.',
            'Weitere persönliche oder familiäre Erinnerungen in Bücher verwandeln.',
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

    // Section 4: Your suggestions
    {
      id: 'B09',
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
