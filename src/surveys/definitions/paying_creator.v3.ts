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
const nothingInParticular = t(
  'Nothing in particular',
  'Nada em particular',
  'Nada en particular',
  'Rien de particulier',
  'Nichts Bestimmtes',
);

/** Five-face "how easy" scale shared by Q2 and Q6. Faces are paired with text labels. */
const easeScale = [
  {
    id: '1',
    value: 1,
    label: t('Very difficult', 'Muito difícil', 'Muy difícil', 'Très difficile', 'Sehr schwierig'),
  },
  {
    id: '2',
    value: 2,
    label: t('Difficult', 'Difícil', 'Difícil', 'Difficile', 'Schwierig'),
  },
  {
    id: '3',
    value: 3,
    label: t(
      'Neither easy nor difficult',
      'Nem fácil nem difícil',
      'Ni fácil ni difícil',
      'Ni facile ni difficile',
      'Weder einfach noch schwierig',
    ),
  },
  { id: '4', value: 4, label: t('Easy', 'Fácil', 'Fácil', 'Facile', 'Einfach') },
  {
    id: '5',
    value: 5,
    label: t('Very easy', 'Muito fácil', 'Muy fácil', 'Très facile', 'Sehr einfach'),
  },
];

/** Q5 options are identical for the one-story and the several-stories wording. */
const repeatCreationBarrierOptions = [
  {
    id: 'no_idea',
    label: t(
      "I haven't had another story idea.",
      'Não tive outra ideia para uma história.',
      'No he tenido otra idea para una historia.',
      'Je n’ai pas eu d’autre idée d’histoire.',
      'Ich hatte keine weitere Story-Idee.',
    ),
  },
  {
    id: 'no_occasion',
    label: t(
      "I haven't had a reason or special occasion.",
      'Não tive um motivo ou uma ocasião especial.',
      'No he tenido un motivo ni una ocasión especial.',
      'Je n’ai pas eu de raison ni d’occasion spéciale.',
      'Ich hatte keinen Anlass und keine besondere Gelegenheit.',
    ),
  },
  {
    id: 'effort',
    label: t(
      'Creating a story takes too much time or effort.',
      'Criar uma história exige demasiado tempo ou esforço.',
      'Crear una historia lleva demasiado tiempo o esfuerzo.',
      'Créer une histoire demande trop de temps ou d’efforts.',
      'Eine Geschichte zu erstellen kostet zu viel Zeit oder Mühe.',
    ),
  },
  {
    id: 'value_doubt',
    label: t(
      "I'm not sure another story would be worth the cost.",
      'Não tenho a certeza de que outra história valha o custo.',
      'No estoy seguro de que otra historia valga lo que cuesta.',
      'Je ne suis pas sûr(e) qu’une autre histoire vaille son prix.',
      'Ich bin nicht sicher, ob eine weitere Geschichte die Kosten wert wäre.',
    ),
  },
  {
    id: 'expectations_unmet',
    label: t(
      "My previous story didn't fully meet my expectations.",
      'A minha história anterior não correspondeu totalmente às minhas expectativas.',
      'Mi historia anterior no cumplió del todo mis expectativas.',
      'Mon histoire précédente n’a pas entièrement répondu à mes attentes.',
      'Meine bisherige Geschichte hat meine Erwartungen nicht ganz erfüllt.',
    ),
  },
];

/**
 * Survey C3: paying creators, revised v3 (Mythoria_Paying_Customer_Survey_Revised_v3.md).
 * Replaces v2; v1 and v2 stay published for their existing responses.
 *
 * Database-driven visibility uses `audience` (facts frozen in the invitation snapshot):
 * - Q4 only for authors who spent credits on a paid service (never asked of the respondent).
 * - Q5 wording depends on the number of completed (published) stories: exactly one, or several.
 *   Authors with no completed story are not in C3, and Q5 would be hidden for them anyway.
 * - Q7 only for authors with at least one completed story.
 *
 * Address forms: pt-PT formal (third person), es-ES informal (tu), fr-FR formal (vous),
 * de-DE informal (du), matching the app's existing UI copy.
 */
export const payingCreatorV3 = {
  schemaVersion: 1,
  id: 'paying_creator',
  version: 3,
  purpose:
    'Understand what builds purchase confidence, how customers experience checkout and paid services, why paying customers do not create more stories or buy again, and what would motivate repeat use and purchase: first-purchase driver, checkout ease and clarity, paid-service satisfaction, repeat-creation barrier, idea-generation friction, first-story deterrents, repeat triggers, payment model preference and repurchase drivers.',
  title: t(
    'Help us make Mythoria better',
    'Ajude-nos a tornar o Mythoria melhor',
    'Ayúdanos a mejorar Mythoria',
    'Aidez-nous à améliorer Mythoria',
    'Hilf uns, Mythoria besser zu machen',
  ),
  description: t(
    "You have already brought a story to life with Mythoria—or taken the first step by purchasing credits. We'd love to understand what worked, what could be easier, and what might inspire your next story.",
    'Já deu vida a uma história no Mythoria — ou deu o primeiro passo ao comprar créditos. Gostaríamos de perceber o que correu bem, o que podia ser mais fácil e o que pode inspirar a sua próxima história.',
    'Ya has dado vida a una historia con Mythoria, o has dado el primer paso al comprar créditos. Nos encantaría saber qué funcionó, qué podría ser más fácil y qué podría inspirar tu próxima historia.',
    'Vous avez déjà donné vie à une histoire avec Mythoria, ou fait le premier pas en achetant des crédits. Nous aimerions comprendre ce qui a bien fonctionné, ce qui pourrait être plus simple et ce qui pourrait inspirer votre prochaine histoire.',
    'Du hast mit Mythoria bereits eine Geschichte zum Leben erweckt – oder mit dem Kauf von Credits den ersten Schritt gemacht. Wir möchten gern verstehen, was gut geklappt hat, was einfacher sein könnte und was dich zu deiner nächsten Geschichte inspirieren könnte.',
  ),
  completionMessage: t(
    'Thank you for helping us improve Mythoria. Choose your complimentary PDF or audiobook for an eligible story.',
    'Obrigado por nos ajudar a melhorar o Mythoria. Escolha o seu PDF ou audiolivro gratuito para uma história elegível.',
    'Gracias por ayudarnos a mejorar Mythoria. Elige tu PDF o audiolibro gratuito para una historia elegible.',
    'Merci de nous aider à améliorer Mythoria. Choisissez votre PDF ou livre audio offert pour une histoire éligible.',
    'Danke, dass du uns hilfst, Mythoria zu verbessern. Wähle dein kostenloses PDF oder Hörbuch für eine passende Geschichte aus.',
  ),
  estimatedMinutes: 4,
  responsePolicy: { identity: 'invitation', maxCompletedPerInvitation: 1 },
  rewardEligible: true,
  internalOnly: false,
  questions: [
    // Section 1: Your first purchase and experience
    {
      id: 'C01',
      type: 'single_choice',
      dimension: 'first_purchase_driver',
      required: true,
      label: t(
        'What gave you the confidence to make your first purchase on Mythoria?',
        'O que lhe deu confiança para fazer a sua primeira compra no Mythoria?',
        '¿Qué te dio confianza para hacer tu primera compra en Mythoria?',
        'Qu’est-ce qui vous a donné confiance pour effectuer votre premier achat sur Mythoria ?',
        'Was hat dir das Vertrauen gegeben, bei Mythoria zum ersten Mal zu kaufen?',
      ),
      help: t(
        'Choose the main reason.',
        'Escolha o motivo principal.',
        'Elige el motivo principal.',
        'Choisissez la raison principale.',
        'Wähle den Hauptgrund.',
      ),
      options: [
        {
          id: 'first_story_quality',
          label: t(
            'The quality of a story I created or previewed convinced me.',
            'A qualidade de uma história que criei ou pré-visualizei convenceu-me.',
            'La calidad de una historia que creé o previsualicé me convenció.',
            'La qualité d’une histoire que j’ai créée ou prévisualisée m’a convaincu(e).',
            'Die Qualität einer Geschichte, die ich erstellt oder in der Vorschau gesehen habe, hat mich überzeugt.',
          ),
        },
        {
          id: 'gift_keepsake',
          label: t(
            'I wanted a meaningful gift or keepsake.',
            'Queria uma oferta ou recordação com significado.',
            'Quería un regalo o recuerdo especial.',
            'Je voulais un cadeau ou un souvenir qui ait du sens.',
            'Ich wollte ein bedeutungsvolles Geschenk oder Andenken.',
          ),
        },
        {
          id: 'price_offer',
          label: t(
            'The price or a special offer felt worthwhile.',
            'O preço ou uma oferta especial pareceu vantajoso.',
            'El precio o una oferta especial me pareció que merecía la pena.',
            'Le prix ou une offre spéciale m’a semblé avantageux.',
            'Der Preis oder ein Sonderangebot erschien mir lohnenswert.',
          ),
        },
        {
          id: 'trust_info',
          label: t(
            'Examples or information helped me trust Mythoria.',
            'Exemplos ou informações ajudaram-me a confiar no Mythoria.',
            'Los ejemplos o la información me ayudaron a confiar en Mythoria.',
            'Des exemples ou des informations m’ont aidé(e) à faire confiance à Mythoria.',
            'Beispiele oder Informationen haben mir geholfen, Mythoria zu vertrauen.',
          ),
        },
        { id: 'other', label: other, allowOtherText: true },
      ],
    },
    {
      id: 'C02',
      type: 'smileys',
      dimension: 'checkout_ease',
      required: false,
      label: t(
        'How easy was it to buy credits?',
        'Quão fácil foi comprar créditos?',
        '¿Cómo de fácil fue comprar créditos?',
        'Dans quelle mesure l’achat de crédits a-t-il été facile ?',
        'Wie einfach war es, Credits zu kaufen?',
      ),
      help: t(
        "You can skip this if you don't remember the purchase.",
        'Pode saltar esta pergunta se não se lembrar da compra.',
        'Puedes saltarte esta pregunta si no recuerdas la compra.',
        'Vous pouvez passer cette question si vous ne vous souvenez pas de l’achat.',
        'Du kannst diese Frage überspringen, wenn du dich nicht an den Kauf erinnerst.',
      ),
      options: easeScale,
    },
    {
      id: 'C03',
      type: 'single_choice',
      dimension: 'checkout_clarity',
      required: true,
      label: t(
        'What, if anything, was unclear when you purchased credits?',
        'O que, se alguma coisa, não estava claro quando comprou créditos?',
        '¿Qué, si es que algo, no estaba claro cuando compraste créditos?',
        'Qu’est-ce qui, le cas échéant, n’était pas clair lors de l’achat de crédits ?',
        'Was war, falls überhaupt etwas, beim Kauf von Credits unklar?',
      ),
      options: [
        {
          id: 'credits_needed',
          label: t(
            'How many credits each service required.',
            'Quantos créditos cada serviço exigia.',
            'Cuántos créditos requería cada servicio.',
            'Combien de crédits chaque service nécessitait.',
            'Wie viele Credits jede Leistung benötigt.',
          ),
        },
        {
          id: 'total_cost',
          label: t(
            'The final price of the credit pack.',
            'O preço final do pacote de créditos.',
            'El precio final del paquete de créditos.',
            'Le prix final du pack de crédits.',
            'Der Endpreis des Credit-Pakets.',
          ),
        },
        {
          id: 'payment_process',
          label: t(
            'The payment process or methods.',
            'O processo ou os métodos de pagamento.',
            'El proceso o los métodos de pago.',
            'Le processus ou les modes de paiement.',
            'Der Zahlungsvorgang oder die Zahlungsmethoden.',
          ),
        },
        {
          id: 'nothing',
          label: t(
            'Everything was clear.',
            'Estava tudo claro.',
            'Todo estaba claro.',
            'Tout était clair.',
            'Alles war klar.',
          ),
        },
        { id: 'other', label: other, allowOtherText: true },
      ],
    },
    {
      id: 'C04',
      type: 'stars',
      dimension: 'paid_quality_score',
      required: true,
      // Retrieved from usage records (credit ledger), never asked of the respondent.
      audience: [{ fact: 'usedPaidService', operator: 'equals', value: true }],
      label: t(
        'How well did the paid services you used meet your expectations?',
        'Em que medida os serviços pagos que utilizou corresponderam às suas expectativas?',
        '¿Hasta qué punto los servicios de pago que usaste cumplieron tus expectativas?',
        'Dans quelle mesure les services payants que vous avez utilisés ont-ils répondu à vos attentes ?',
        'Wie gut haben die kostenpflichtigen Leistungen, die du genutzt hast, deine Erwartungen erfüllt?',
      ),
      options: [
        {
          id: '1',
          value: 1,
          label: t(
            '1 · Far below expectations',
            '1 · Muito abaixo das expectativas',
            '1 · Muy por debajo de lo esperado',
            '1 · Très en dessous de mes attentes',
            '1 · Weit unter meinen Erwartungen',
          ),
        },
        { id: '2', value: 2, label: t('2', '2', '2', '2', '2') },
        { id: '3', value: 3, label: t('3', '3', '3', '3', '3') },
        { id: '4', value: 4, label: t('4', '4', '4', '4', '4') },
        {
          id: '5',
          value: 5,
          label: t(
            '5 · Exceeded expectations',
            '5 · Acima das expectativas',
            '5 · Por encima de lo esperado',
            '5 · Au-delà de mes attentes',
            '5 · Über meinen Erwartungen',
          ),
        },
      ],
    },

    // Section 2: Creating more stories
    {
      id: 'C05',
      type: 'single_choice',
      dimension: 'repeat_creation_barrier',
      required: true,
      // Exactly one completed story: the "another story" wording.
      audience: [{ fact: 'publishedStoryCount', operator: 'equals', value: 1 }],
      label: t(
        "What is the main reason you haven't created another story on Mythoria?",
        'Qual é o principal motivo pelo qual ainda não criou outra história no Mythoria?',
        '¿Cuál es el principal motivo por el que todavía no has creado otra historia en Mythoria?',
        'Quelle est la principale raison pour laquelle vous n’avez pas encore créé d’autre histoire sur Mythoria ?',
        'Was ist der Hauptgrund, warum du noch keine weitere Geschichte bei Mythoria erstellt hast?',
      ),
      options: repeatCreationBarrierOptions,
    },
    {
      id: 'C05B',
      type: 'single_choice',
      dimension: 'repeat_creation_barrier',
      required: true,
      // Two or more completed stories: the "more frequently" wording.
      audience: [{ fact: 'publishedStoryCount', operator: 'gte', value: 2 }],
      label: t(
        'What most often prevents you from creating stories more frequently?',
        'O que o impede com mais frequência de criar histórias com maior regularidade?',
        '¿Qué es lo que más a menudo te impide crear historias con más frecuencia?',
        'Qu’est-ce qui vous empêche le plus souvent de créer des histoires plus fréquemment ?',
        'Was hält dich am häufigsten davon ab, öfter Geschichten zu erstellen?',
      ),
      options: repeatCreationBarrierOptions,
    },
    {
      id: 'C06',
      type: 'smileys',
      dimension: 'idea_generation_ease',
      required: true,
      label: t(
        'How easy is it for you to come up with ideas for new stories?',
        'Quão fácil é para si ter ideias para novas histórias?',
        '¿Cómo de fácil te resulta tener ideas para nuevas historias?',
        'Dans quelle mesure vous est-il facile de trouver des idées de nouvelles histoires ?',
        'Wie leicht fällt es dir, Ideen für neue Geschichten zu finden?',
      ),
      options: easeScale,
    },
    {
      id: 'C07',
      type: 'single_choice',
      dimension: 'first_story_deterrent',
      required: true,
      // Only for authors with at least one completed story.
      audience: [{ fact: 'publishedStoryCount', operator: 'gte', value: 1 }],
      label: t(
        'Did anything about your first story make you less interested in creating another one?',
        'Alguma coisa na sua primeira história o fez ter menos interesse em criar outra?',
        '¿Hubo algo en tu primera historia que te hiciera tener menos interés en crear otra?',
        'Y a-t-il eu quelque chose dans votre première histoire qui vous a donné moins envie d’en créer une autre ?',
        'Gab es etwas an deiner ersten Geschichte, das dein Interesse an einer weiteren verringert hat?',
      ),
      options: [
        {
          id: 'story_quality',
          label: t(
            'The story or writing quality.',
            'A qualidade da história ou da escrita.',
            'La calidad de la historia o de la redacción.',
            'La qualité de l’histoire ou de l’écriture.',
            'Die Qualität der Geschichte oder des Textes.',
          ),
        },
        {
          id: 'illustrations',
          label: t(
            'The illustrations or characters.',
            'As ilustrações ou as personagens.',
            'Las ilustraciones o los personajes.',
            'Les illustrations ou les personnages.',
            'Die Illustrationen oder Figuren.',
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
        {
          id: 'effort',
          label: t(
            'The time and effort required.',
            'O tempo e o esforço necessários.',
            'El tiempo y el esfuerzo necesarios.',
            'Le temps et les efforts nécessaires.',
            'Der erforderliche Zeit- und Arbeitsaufwand.',
          ),
        },
        {
          id: 'nothing',
          label: t(
            'No—nothing about my first story discouraged me.',
            'Não — nada na minha primeira história me desencorajou.',
            'No, nada de mi primera historia me desanimó.',
            'Non, rien dans ma première histoire ne m’a découragé(e).',
            'Nein – nichts an meiner ersten Geschichte hat mich entmutigt.',
          ),
        },
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
        { id: 'nothing', label: nothingInParticular },
      ],
    },

    // Section 3: Future purchases
    {
      id: 'C09',
      type: 'single_choice',
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
            'Pay directly for the product I want.',
            'Pagar diretamente o produto que quero.',
            'Pagar directamente el producto que quiero.',
            'Payer directement le produit que je veux.',
            'Das gewünschte Produkt direkt bezahlen.',
          ),
        },
        {
          id: 'credits',
          label: t(
            'Keep buying flexible credits.',
            'Continuar a comprar créditos flexíveis.',
            'Seguir comprando créditos flexibles.',
            'Continuer à acheter des crédits flexibles.',
            'Weiterhin flexible Credits kaufen.',
          ),
        },
        {
          id: 'bundle',
          label: t(
            'Buy a package with several formats.',
            'Comprar um pacote com vários formatos.',
            'Comprar un pack con varios formatos.',
            'Acheter un pack avec plusieurs formats.',
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
      ],
    },
    {
      id: 'C10',
      type: 'single_choice',
      dimension: 'repurchase_driver',
      required: true,
      label: t(
        'What would make you more likely to purchase from Mythoria again?',
        'O que o tornaria mais propenso a voltar a comprar no Mythoria?',
        '¿Qué haría más probable que volvieras a comprar en Mythoria?',
        'Qu’est-ce qui vous inciterait davantage à racheter chez Mythoria ?',
        'Was würde die Wahrscheinlichkeit erhöhen, dass du wieder bei Mythoria kaufst?',
      ),
      help: t(
        'Choose the one improvement that would matter most to you.',
        'Escolha a melhoria que seria mais importante para si.',
        'Elige la mejora que más te importaría.',
        'Choisissez l’amélioration qui compterait le plus pour vous.',
        'Wähle die eine Verbesserung, die dir am wichtigsten wäre.',
      ),
      options: [
        {
          id: 'quality',
          label: t(
            'Better stories and illustrations.',
            'Melhores histórias e ilustrações.',
            'Mejores historias e ilustraciones.',
            'De meilleures histoires et illustrations.',
            'Bessere Geschichten und Illustrationen.',
          ),
        },
        {
          id: 'price',
          label: t(
            'More affordable prices or better-value packages.',
            'Preços mais acessíveis ou pacotes com melhor valor.',
            'Precios más asequibles o paquetes con mejor relación calidad-precio.',
            'Des prix plus abordables ou des packs au meilleur rapport qualité-prix.',
            'Günstigere Preise oder Pakete mit besserem Preis-Leistungs-Verhältnis.',
          ),
        },
        {
          id: 'simple_checkout',
          label: t(
            'Simpler purchasing and clearer pricing.',
            'Compra mais simples e preços mais claros.',
            'Una compra más sencilla y precios más claros.',
            'Un achat plus simple et des prix plus clairs.',
            'Einfacherer Kauf und klarere Preise.',
          ),
        },
        {
          id: 'more_reasons',
          label: t(
            'More story ideas, product formats, or reasons to buy.',
            'Mais ideias de histórias, formatos de produto ou motivos para comprar.',
            'Más ideas de historias, formatos de producto o motivos para comprar.',
            'Plus d’idées d’histoires, de formats de produit ou de raisons d’acheter.',
            'Mehr Story-Ideen, Produktformate oder Kaufanlässe.',
          ),
        },
        { id: 'nothing', label: nothingInParticular },
      ],
    },

    // Section 4: Your suggestions
    {
      id: 'C11',
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
