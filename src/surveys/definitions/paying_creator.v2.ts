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

/**
 * Survey C3: paying creators, revised v2 (Mythoria_Paying_Customer_Survey_Revised_v2.md).
 * Replaces v1 wording, options and branching; v1 stays published for its existing responses.
 * Address forms: pt-PT formal (third person), es-ES informal (tu), fr-FR formal (vous),
 * de-DE informal (du), matching the app's existing UI copy.
 */
export const payingCreatorV2 = {
  schemaVersion: 1,
  id: 'paying_creator',
  version: 2,
  purpose:
    'Understand what builds purchase confidence, how customers experience credits and paid services, and what would motivate future purchases and repeat story creation: first-purchase driver, credit usage and barriers, checkout ease and clarity, paid-service satisfaction, preferred future products and payment model, repeat triggers and repurchase drivers.',
  title: t(
    'Help us improve your Mythoria experience',
    'Ajude-nos a melhorar a sua experiência no Mythoria',
    'Ayúdanos a mejorar tu experiencia en Mythoria',
    'Aidez-nous à améliorer votre expérience Mythoria',
    'Hilf uns, dein Mythoria-Erlebnis zu verbessern',
  ),
  description: t(
    'Thank you for supporting Mythoria. Your feedback helps us improve story creation, purchasing, and the formats that matter most to you.',
    'Obrigado por apoiar o Mythoria. A sua opinião ajuda-nos a melhorar a criação de histórias, a compra e os formatos que mais lhe interessam.',
    'Gracias por apoyar a Mythoria. Tus comentarios nos ayudan a mejorar la creación de historias, la compra y los formatos que más te importan.',
    'Merci de soutenir Mythoria. Vos commentaires nous aident à améliorer la création d’histoires, l’achat et les formats qui comptent le plus pour vous.',
    'Danke, dass du Mythoria unterstützt. Dein Feedback hilft uns, die Erstellung von Geschichten, den Kauf und die Formate zu verbessern, die dir am wichtigsten sind.',
  ),
  completionMessage: t(
    'Thank you for helping us improve Mythoria. You can now choose your complimentary PDF or audiobook for an eligible story.',
    'Obrigado por nos ajudar a melhorar o Mythoria. Já pode escolher o seu PDF ou audiolivro gratuito para uma história elegível.',
    'Gracias por ayudarnos a mejorar Mythoria. Ya puedes elegir tu PDF o audiolibro gratuito para una historia elegible.',
    'Merci de nous aider à améliorer Mythoria. Vous pouvez maintenant choisir votre PDF ou livre audio offert pour une histoire éligible.',
    'Danke, dass du uns hilfst, Mythoria zu verbessern. Du kannst jetzt dein kostenloses PDF oder Hörbuch für eine passende Geschichte auswählen.',
  ),
  estimatedMinutes: 3,
  responsePolicy: { identity: 'invitation', maxCompletedPerInvitation: 1 },
  rewardEligible: true,
  internalOnly: false,
  questions: [
    // Section 1: First purchase and credit use
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
        'Select the reason that best describes your decision.',
        'Selecione o motivo que melhor descreve a sua decisão.',
        'Elige el motivo que mejor describe tu decisión.',
        'Sélectionnez la raison qui décrit le mieux votre décision.',
        'Wähle den Grund, der deine Entscheidung am besten beschreibt.',
      ),
      options: [
        {
          id: 'first_story_quality',
          label: t(
            'Quality of my first story convinced me.',
            'A qualidade da minha primeira história convenceu-me.',
            'La calidad de mi primera historia me convenció.',
            'La qualité de ma première histoire m’a convaincu(e).',
            'Die Qualität meiner ersten Geschichte hat mich überzeugt.',
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
      type: 'single_choice',
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
            'Yes, completely.',
            'Sim, totalmente.',
            'Sí, por completo.',
            'Oui, tout à fait.',
            'Ja, vollständig.',
          ),
        },
        {
          id: 'some_difficulty',
          label: t(
            'Yes, but with some difficulty.',
            'Sim, mas com alguma dificuldade.',
            'Sí, pero con cierta dificultad.',
            'Oui, mais avec quelques difficultés.',
            'Ja, aber mit einigen Schwierigkeiten.',
          ),
        },
        {
          id: 'partial',
          label: t(
            'Only partly.',
            'Apenas em parte.',
            'Solo en parte.',
            'Seulement en partie.',
            'Nur teilweise.',
          ),
        },
        { id: 'no', label: t('No.', 'Não.', 'No.', 'Non.', 'Nein.') },
        {
          id: 'not_used',
          label: t(
            "I haven't used them yet.",
            'Ainda não os usei.',
            'Todavía no los he usado.',
            'Je ne les ai pas encore utilisés.',
            'Ich habe sie noch nicht verwendet.',
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
      help: t(
        'If you experienced difficulties, what was the main issue?',
        'Se teve dificuldades, qual foi o principal problema?',
        'Si tuviste dificultades, ¿cuál fue el problema principal?',
        'Si vous avez rencontré des difficultés, quel a été le principal problème ?',
        'Falls du Schwierigkeiten hattest: Was war das Hauptproblem?',
      ),
      options: [
        {
          id: 'insufficient_credits',
          label: t(
            'I needed more credits than I expected.',
            'Precisei de mais créditos do que esperava.',
            'Necesité más créditos de los que esperaba.',
            'J’ai eu besoin de plus de crédits que prévu.',
            'Ich brauchte mehr Credits als erwartet.',
          ),
        },
        {
          id: 'unclear_usage',
          label: t(
            "I wasn't sure how to use them.",
            'Não tinha a certeza de como os usar.',
            'No sabía muy bien cómo usarlos.',
            'Je ne savais pas trop comment les utiliser.',
            'Ich wusste nicht genau, wie ich sie verwenden soll.',
          ),
        },
        {
          id: 'technical',
          label: t(
            'I encountered a technical problem.',
            'Encontrei um problema técnico.',
            'Me encontré con un problema técnico.',
            'J’ai rencontré un problème technique.',
            'Ich bin auf ein technisches Problem gestoßen.',
          ),
        },
        {
          id: 'unexpected_result',
          label: t(
            'The result did not meet my expectations.',
            'O resultado não correspondeu às minhas expectativas.',
            'El resultado no cumplió mis expectativas.',
            'Le résultat n’a pas répondu à mes attentes.',
            'Das Ergebnis hat meine Erwartungen nicht erfüllt.',
          ),
        },
        { id: 'other', label: other, allowOtherText: true },
      ],
    },

    // Section 2: Checkout and product satisfaction
    {
      id: 'C03',
      type: 'stars',
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
      options: [
        {
          id: '1',
          value: 1,
          label: t(
            '1 · Very difficult',
            '1 · Muito difícil',
            '1 · Muy difícil',
            '1 · Très difficile',
            '1 · Sehr schwierig',
          ),
        },
        { id: '2', value: 2, label: t('2', '2', '2', '2', '2') },
        { id: '3', value: 3, label: t('3', '3', '3', '3', '3') },
        { id: '4', value: 4, label: t('4', '4', '4', '4', '4') },
        {
          id: '5',
          value: 5,
          label: t(
            '5 · Very easy',
            '5 · Muito fácil',
            '5 · Muy fácil',
            '5 · Très facile',
            '5 · Sehr einfach',
          ),
        },
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
      id: 'C05',
      type: 'stars',
      dimension: 'paid_quality_score',
      required: true,
      visibleWhen: { question: 'C02', operator: 'not_equals', value: 'not_used' },
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
    {
      id: 'C06',
      type: 'single_choice',
      dimension: 'future_product_interest',
      required: true,
      label: t(
        'Which Mythoria product would interest you most in the future?',
        'Que produto do Mythoria lhe interessaria mais no futuro?',
        '¿Qué producto de Mythoria te interesaría más en el futuro?',
        'Quel produit Mythoria vous intéresserait le plus à l’avenir ?',
        'Welches Mythoria-Produkt würde dich in Zukunft am meisten interessieren?',
      ),
      options: [
        {
          id: 'new_stories',
          label: t(
            'More personalized stories.',
            'Mais histórias personalizadas.',
            'Más historias personalizadas.',
            'Plus d’histoires personnalisées.',
            'Mehr personalisierte Geschichten.',
          ),
        },
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
          id: 'audio',
          label: t('Audiobooks.', 'Audiolivros.', 'Audiolibros.', 'Livres audio.', 'Hörbücher.'),
        },
        {
          id: 'pdf',
          label: t(
            'PDFs to keep or print.',
            'PDFs para guardar ou imprimir.',
            'PDF para guardar o imprimir.',
            'PDF à conserver ou à imprimer.',
            'PDF-Dateien zum Aufbewahren oder Drucken.',
          ),
        },
        {
          id: 'none',
          label: t(
            'None in particular.',
            'Nenhum em particular.',
            'Ninguno en particular.',
            'Aucun en particulier.',
            'Keines im Besonderen.',
          ),
        },
      ],
    },

    // Section 3: Future purchase and repeat use
    {
      id: 'C07',
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
    {
      id: 'C09',
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
