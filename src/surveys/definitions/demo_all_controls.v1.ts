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
 * QA / demo survey. Never offered to customers (`internalOnly`).
 * Exercises every question type, every option flag and every branching feature
 * (equals, in, contains, gte, lt, answered, not_answered, `all`, `any`, screen groups).
 */
export const demoAllControlsV1 = {
  schemaVersion: 1,
  id: 'demo_all_controls',
  version: 1,
  purpose:
    'Internal QA fixture that exercises every survey control, option flag and branching feature. Not shown to customers.',
  title: t(
    'Reading habits (demo)',
    'Hábitos de leitura (demonstração)',
    'Hábitos de lectura (demostración)',
    'Habitudes de lecture (démonstration)',
    'Lesegewohnheiten (Demo)',
  ),
  description: t(
    'A demo survey used to test every control and branching rule.',
    'Um questionário de demonstração usado para testar todos os controlos e regras de ramificação.',
    'Un cuestionario de demostración para probar todos los controles y reglas de ramificación.',
    'Un questionnaire de démonstration pour tester tous les contrôles et toutes les règles de branchement.',
    'Eine Demo-Umfrage zum Testen aller Steuerelemente und Verzweigungsregeln.',
  ),
  intro: t(
    'This demo survey is for internal testing only. It takes about 5 minutes. Answers are anonymous and are not published.',
    'Este questionário de demonstração destina-se apenas a testes internos. Demora cerca de 5 minutos. As respostas são anónimas e não são publicadas.',
    'Este cuestionario de demostración es solo para pruebas internas. Lleva unos 5 minutos. Las respuestas son anónimas y no se publican.',
    'Ce questionnaire de démonstration est réservé aux tests internes. Il dure environ 5 minutes. Les réponses sont anonymes et ne sont pas publiées.',
    'Diese Demo-Umfrage dient nur internen Tests. Sie dauert etwa 5 Minuten. Die Antworten sind anonym und werden nicht veröffentlicht.',
  ),
  completionMessage: t(
    'Thank you! The demo survey is complete.',
    'Obrigado! O questionário de demonstração está concluído.',
    '¡Gracias! El cuestionario de demostración ha terminado.',
    'Merci ! Le questionnaire de démonstration est terminé.',
    'Danke! Die Demo-Umfrage ist abgeschlossen.',
  ),
  estimatedMinutes: 5,
  responsePolicy: { identity: 'anonymous', maxCompletedPerInvitation: 1 },
  rewardEligible: false,
  internalOnly: true,
  questions: [
    {
      id: 'D00',
      type: 'static_content',
      label: t(
        'About this demo',
        'Sobre esta demonstração',
        'Acerca de esta demostración',
        'À propos de cette démonstration',
        'Über diese Demo',
      ),
      body: t(
        'The questions below are about reading habits. They only exist to test how each control looks and behaves.',
        'As perguntas seguintes são sobre hábitos de leitura. Existem apenas para testar o aspeto e o comportamento de cada controlo.',
        'Las siguientes preguntas tratan sobre hábitos de lectura. Solo sirven para probar el aspecto y el comportamiento de cada control.',
        "Les questions suivantes portent sur les habitudes de lecture. Elles servent uniquement à tester l'apparence et le comportement de chaque contrôle.",
        'Die folgenden Fragen drehen sich um Lesegewohnheiten. Sie dienen nur dazu, Aussehen und Verhalten jedes Steuerelements zu testen.',
      ),
    },
    {
      id: 'D01',
      type: 'single_choice',
      dimension: 'demo_reading_frequency',
      required: true,
      label: t(
        'How often do you read for pleasure?',
        'Com que frequência lê por prazer?',
        '¿Con qué frecuencia lees por placer?',
        'À quelle fréquence lisez-vous pour le plaisir ?',
        'Wie oft liest du zum Vergnügen?',
      ),
      help: t(
        'Pick the option that fits best.',
        'Escolha a opção que melhor se adequa.',
        'Elige la opción que mejor encaje.',
        'Choisissez l’option qui convient le mieux.',
        'Wähle die Option, die am besten passt.',
      ),
      options: [
        {
          id: 'daily',
          label: t('Every day', 'Todos os dias', 'Todos los días', 'Tous les jours', 'Jeden Tag'),
        },
        {
          id: 'weekly',
          label: t(
            'A few times a week',
            'Algumas vezes por semana',
            'Varias veces por semana',
            'Plusieurs fois par semaine',
            'Mehrmals pro Woche',
          ),
        },
        {
          id: 'monthly',
          label: t(
            'A few times a month',
            'Algumas vezes por mês',
            'Varias veces al mes',
            'Plusieurs fois par mois',
            'Mehrmals im Monat',
          ),
        },
        {
          id: 'rarely',
          label: t('Rarely', 'Raramente', 'Rara vez', 'Rarement', 'Selten'),
        },
        { id: 'other', label: OTHER, allowOtherText: true },
      ],
    },
    {
      id: 'D02',
      type: 'multi_choice',
      dimension: 'demo_genres',
      required: true,
      label: t(
        'Which genres do you enjoy? Choose up to three.',
        'De que géneros gosta? Escolha até três.',
        '¿Qué géneros disfrutas? Elige hasta tres.',
        'Quels genres appréciez-vous ? Choisissez-en jusqu’à trois.',
        'Welche Genres gefallen dir? Wähle bis zu drei.',
      ),
      validation: { minSelected: 1, maxSelected: 3 },
      options: [
        { id: 'fantasy', label: t('Fantasy', 'Fantasia', 'Fantasía', 'Fantasy', 'Fantasy') },
        {
          id: 'mystery',
          label: t('Mystery', 'Mistério', 'Misterio', 'Policier et mystère', 'Krimi und Rätsel'),
        },
        {
          id: 'history',
          label: t('History', 'História', 'Historia', 'Histoire', 'Geschichte'),
        },
        {
          id: 'science',
          label: t('Science', 'Ciência', 'Ciencia', 'Sciences', 'Wissenschaft'),
        },
        {
          id: 'none',
          exclusive: true,
          label: t(
            'None of these',
            'Nenhum destes',
            'Ninguno de estos',
            'Aucun de ceux-ci',
            'Keines davon',
          ),
        },
      ],
    },
    {
      id: 'D03',
      type: 'buttons',
      selection: 'single',
      dimension: 'demo_preferred_format',
      required: true,
      label: t(
        'Which format do you prefer?',
        'Que formato prefere?',
        '¿Qué formato prefieres?',
        'Quel format préférez-vous ?',
        'Welches Format bevorzugst du?',
      ),
      options: [
        {
          id: 'paper',
          label: t(
            'Paper book',
            'Livro em papel',
            'Libro en papel',
            'Livre papier',
            'Buch aus Papier',
          ),
        },
        {
          id: 'ebook',
          label: t('E-book', 'Livro digital', 'Libro electrónico', 'Livre numérique', 'E-Book'),
        },
        {
          id: 'audio',
          label: t('Audiobook', 'Audiolivro', 'Audiolibro', 'Livre audio', 'Hörbuch'),
        },
      ],
    },
    {
      id: 'D04',
      type: 'buttons',
      selection: 'multiple',
      dimension: 'demo_reading_moments',
      required: true,
      label: t(
        'When do you usually read? Select all that apply.',
        'Quando costuma ler? Selecione todas as que se aplicam.',
        '¿Cuándo sueles leer? Selecciona todas las que correspondan.',
        'Quand lisez-vous habituellement ? Sélectionnez toutes les réponses applicables.',
        'Wann liest du normalerweise? Wähle alles Zutreffende aus.',
      ),
      validation: { minSelected: 1 },
      options: [
        {
          id: 'bedtime',
          label: t(
            'Before bed',
            'Antes de dormir',
            'Antes de dormir',
            'Avant de dormir',
            'Vor dem Schlafen',
          ),
        },
        {
          id: 'commute',
          label: t(
            'While commuting',
            'Durante as deslocações',
            'Durante los trayectos',
            'Pendant les trajets',
            'Auf dem Weg',
          ),
        },
        {
          id: 'weekend',
          label: t(
            'At the weekend',
            'Ao fim de semana',
            'Los fines de semana',
            'Le week-end',
            'Am Wochenende',
          ),
        },
      ],
    },
    {
      id: 'D05',
      type: 'short_text',
      dimension: 'demo_favourite_author',
      required: false,
      label: t(
        'Who is a favourite author of yours?',
        'Quem é um dos seus autores preferidos?',
        '¿Quién es uno de tus autores favoritos?',
        'Quel est l’un de vos auteurs préférés ?',
        'Wer ist einer deiner Lieblingsautoren?',
      ),
      help: t('Optional.', 'Opcional.', 'Opcional.', 'Facultatif.', 'Optional.'),
      placeholder: t(
        'Type a name',
        'Escreva um nome',
        'Escribe un nombre',
        'Saisissez un nom',
        'Namen eingeben',
      ),
      validation: { maxLength: 80 },
    },
    {
      id: 'D06',
      type: 'long_text',
      dimension: 'demo_open_comment',
      required: false,
      label: t(
        'Tell us about a book you remember well.',
        'Fale-nos de um livro de que se lembre bem.',
        'Cuéntanos sobre un libro que recuerdes bien.',
        'Parlez-nous d’un livre dont vous vous souvenez bien.',
        'Erzähl uns von einem Buch, an das du dich gut erinnerst.',
      ),
      help: t('Optional.', 'Opcional.', 'Opcional.', 'Facultatif.', 'Optional.'),
      placeholder: t(
        'Write as much or as little as you like',
        'Escreva o que quiser',
        'Escribe lo que quieras',
        'Écrivez ce que vous voulez',
        'Schreib so viel oder so wenig, wie du möchtest',
      ),
      validation: { maxLength: 1000 },
    },
    {
      id: 'D07',
      type: 'number',
      dimension: 'demo_books_per_year',
      required: true,
      label: t(
        'How many books did you read last year?',
        'Quantos livros leu no ano passado?',
        '¿Cuántos libros leíste el año pasado?',
        'Combien de livres avez-vous lus l’année dernière ?',
        'Wie viele Bücher hast du letztes Jahr gelesen?',
      ),
      unit: t('books', 'livros', 'libros', 'livres', 'Bücher'),
      validation: { min: 0, max: 20, step: 1, integer: true },
    },
    {
      id: 'D08',
      type: 'slider',
      screen: 'ratings',
      dimension: 'demo_enjoyment_score',
      required: true,
      label: t(
        'How much do you enjoy reading?',
        'Quanto gosta de ler?',
        '¿Cuánto disfrutas leyendo?',
        'Dans quelle mesure aimez-vous lire ?',
        'Wie gern liest du?',
      ),
      validation: { min: 0, max: 10, step: 1 },
      minLabel: t('Not at all', 'Nada', 'Nada', 'Pas du tout', 'Überhaupt nicht'),
      maxLabel: t('A great deal', 'Muito', 'Muchísimo', 'Énormément', 'Sehr gern'),
      naOptions: [
        {
          id: 'unsure',
          notApplicable: true,
          label: t(
            'Not sure',
            'Não tenho a certeza',
            'No estoy seguro',
            'Je ne sais pas',
            'Ich bin mir nicht sicher',
          ),
        },
      ],
    },
    {
      id: 'D09',
      type: 'stars',
      screen: 'ratings',
      dimension: 'demo_library_rating',
      required: true,
      label: t(
        'How would you rate your local library?',
        'Como avalia a biblioteca da sua zona?',
        '¿Cómo valoras tu biblioteca local?',
        'Comment évaluez-vous votre bibliothèque locale ?',
        'Wie bewertest du deine örtliche Bücherei?',
      ),
      options: [
        {
          id: '1',
          value: 1,
          label: t('Very poor', 'Muito fraca', 'Muy mala', 'Très mauvaise', 'Sehr schlecht'),
        },
        { id: '2', value: 2, label: t('Poor', 'Fraca', 'Mala', 'Mauvaise', 'Schlecht') },
        { id: '3', value: 3, label: t('Fair', 'Razoável', 'Regular', 'Correcte', 'Mittelmäßig') },
        { id: '4', value: 4, label: t('Good', 'Boa', 'Buena', 'Bonne', 'Gut') },
        {
          id: '5',
          value: 5,
          label: t('Excellent', 'Excelente', 'Excelente', 'Excellente', 'Ausgezeichnet'),
        },
        {
          id: 'not_applicable',
          notApplicable: true,
          label: t(
            "I don't use a library",
            'Não uso nenhuma biblioteca',
            'No uso ninguna biblioteca',
            "Je n'utilise pas de bibliothèque",
            'Ich nutze keine Bücherei',
          ),
        },
      ],
    },
    {
      id: 'D10',
      type: 'smileys',
      screen: 'ratings',
      dimension: 'demo_mood_score',
      required: true,
      label: t(
        'How do you feel after finishing a good book?',
        'Como se sente depois de acabar um bom livro?',
        '¿Cómo te sientes después de terminar un buen libro?',
        'Comment vous sentez-vous après avoir terminé un bon livre ?',
        'Wie fühlst du dich, nachdem du ein gutes Buch beendet hast?',
      ),
      options: [
        {
          id: '1',
          value: 1,
          label: t(
            'Very low',
            'Muito em baixo',
            'Muy decaído',
            'Très abattu',
            'Sehr niedergeschlagen',
          ),
        },
        { id: '2', value: 2, label: t('Low', 'Em baixo', 'Decaído', 'Abattu', 'Niedergeschlagen') },
        { id: '3', value: 3, label: t('Neutral', 'Neutro', 'Neutral', 'Neutre', 'Neutral') },
        { id: '4', value: 4, label: t('Happy', 'Contente', 'Contento', 'Content', 'Zufrieden') },
        {
          id: '5',
          value: 5,
          label: t(
            'Very happy',
            'Muito contente',
            'Muy contento',
            'Très content',
            'Sehr zufrieden',
          ),
        },
        {
          id: 'not_applicable',
          notApplicable: true,
          label: t(
            'Prefer not to say',
            'Prefiro não dizer',
            'Prefiero no decirlo',
            'Je préfère ne pas répondre',
            'Möchte ich nicht sagen',
          ),
        },
      ],
    },
    {
      id: 'D11',
      type: 'select',
      dimension: 'demo_reading_language',
      required: true,
      label: t(
        'In which language do you read most?',
        'Em que língua lê mais?',
        '¿En qué idioma lees más?',
        'Dans quelle langue lisez-vous le plus ?',
        'In welcher Sprache liest du am meisten?',
      ),
      options: [
        { id: 'en', label: t('English', 'Inglês', 'Inglés', 'Anglais', 'Englisch') },
        {
          id: 'pt',
          label: t('Portuguese', 'Português', 'Portugués', 'Portugais', 'Portugiesisch'),
        },
        { id: 'es', label: t('Spanish', 'Espanhol', 'Español', 'Espagnol', 'Spanisch') },
        { id: 'fr', label: t('French', 'Francês', 'Francés', 'Français', 'Französisch') },
        { id: 'de', label: t('German', 'Alemão', 'Alemán', 'Allemand', 'Deutsch') },
      ],
    },
    // --- Branching examples -------------------------------------------------------------
    {
      id: 'X01',
      type: 'single_choice',
      dimension: 'demo_reading_time',
      required: true,
      // `in` operator on a single-select answer.
      visibleWhen: { question: 'D01', operator: 'in', value: ['daily', 'weekly'] },
      label: t(
        'Which part of the day do you prefer for reading?',
        'Que altura do dia prefere para ler?',
        '¿Qué momento del día prefieres para leer?',
        'Quel moment de la journée préférez-vous pour lire ?',
        'Welche Tageszeit bevorzugst du zum Lesen?',
      ),
      options: [
        { id: 'morning', label: t('Morning', 'Manhã', 'Mañana', 'Matin', 'Morgens') },
        { id: 'afternoon', label: t('Afternoon', 'Tarde', 'Tarde', 'Après-midi', 'Nachmittags') },
        { id: 'evening', label: t('Evening', 'Noite', 'Noche', 'Soir', 'Abends') },
      ],
    },
    {
      id: 'X02',
      type: 'single_choice',
      dimension: 'demo_fantasy_detail',
      required: true,
      // `contains` operator on a multi-select answer.
      visibleWhen: { question: 'D02', operator: 'contains', value: 'fantasy' },
      label: t(
        'What do you like most about fantasy?',
        'O que mais gosta na fantasia?',
        '¿Qué es lo que más te gusta de la fantasía?',
        'Qu’est-ce que vous aimez le plus dans la fantasy ?',
        'Was gefällt dir an Fantasy am meisten?',
      ),
      options: [
        {
          id: 'worlds',
          label: t(
            'The invented worlds',
            'Os mundos inventados',
            'Los mundos inventados',
            'Les mondes imaginaires',
            'Die erfundenen Welten',
          ),
        },
        {
          id: 'characters',
          label: t(
            'The characters',
            'As personagens',
            'Los personajes',
            'Les personnages',
            'Die Figuren',
          ),
        },
        {
          id: 'plot',
          label: t('The adventure', 'A aventura', 'La aventura', 'L’aventure', 'Das Abenteuer'),
        },
      ],
    },
    {
      id: 'X03',
      type: 'short_text',
      dimension: 'demo_library_praise',
      required: false,
      // `gte` operator on a stars answer (N/A answers never match).
      visibleWhen: { question: 'D09', operator: 'gte', value: 4 },
      label: t(
        'What does your library do well?',
        'O que a sua biblioteca faz bem?',
        '¿Qué hace bien tu biblioteca?',
        'Qu’est-ce que votre bibliothèque fait bien ?',
        'Was macht deine Bücherei gut?',
      ),
      validation: { maxLength: 80 },
    },
    {
      id: 'X04',
      type: 'short_text',
      dimension: 'demo_skip_reason',
      required: false,
      // `not_answered` operator on an optional question.
      visibleWhen: { question: 'D05', operator: 'not_answered' },
      label: t(
        'You skipped the favourite author question. Any reason?',
        'Saltou a pergunta sobre o autor preferido. Houve algum motivo?',
        'Te saltaste la pregunta sobre el autor favorito. ¿Hay algún motivo?',
        'Vous avez ignoré la question sur l’auteur préféré. Une raison particulière ?',
        'Du hast die Frage nach dem Lieblingsautor übersprungen. Gibt es einen Grund?',
      ),
      validation: { maxLength: 80 },
    },
    {
      id: 'X05',
      type: 'short_text',
      dimension: 'demo_comment_followup',
      required: false,
      // `answered` operator on an optional long-text question.
      visibleWhen: { question: 'D06', operator: 'answered' },
      label: t(
        'Thanks for sharing. Would you recommend that book?',
        'Obrigado por partilhar. Recomendaria esse livro?',
        'Gracias por compartirlo. ¿Recomendarías ese libro?',
        'Merci d’avoir partagé. Recommanderiez-vous ce livre ?',
        'Danke fürs Teilen. Würdest du dieses Buch empfehlen?',
      ),
      validation: { maxLength: 80 },
    },
    {
      id: 'X06',
      type: 'single_choice',
      dimension: 'demo_reading_barrier',
      required: true,
      // `any` combinator mixing equals (single choice), lt (number) and lt (smileys).
      visibleWhen: {
        any: [
          { question: 'D01', operator: 'equals', value: 'rarely' },
          { question: 'D07', operator: 'lt', value: 2 },
          { question: 'D10', operator: 'lt', value: 3 },
        ],
      },
      label: t(
        'What would help you read more?',
        'O que poderia ajudar a ler mais?',
        '¿Qué te ayudaría a leer más?',
        'Qu’est-ce qui vous aiderait à lire davantage ?',
        'Was würde dir helfen, mehr zu lesen?',
      ),
      options: [
        {
          id: 'time',
          label: t(
            'More free time',
            'Mais tempo livre',
            'Más tiempo libre',
            'Plus de temps libre',
            'Mehr Freizeit',
          ),
        },
        {
          id: 'recommendations',
          label: t(
            'Better recommendations',
            'Melhores recomendações',
            'Mejores recomendaciones',
            'De meilleures recommandations',
            'Bessere Empfehlungen',
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
      id: 'X07',
      type: 'static_content',
      // `all` combinator: both ratings are high (and the slider is a real number, not N/A).
      visibleWhen: {
        all: [
          { question: 'D09', operator: 'gte', value: 4 },
          { question: 'D10', operator: 'gte', value: 4 },
          { question: 'D08', operator: 'gte', value: 7 },
        ],
      },
      label: t(
        'You really enjoy reading!',
        'Gosta mesmo de ler!',
        '¡Disfrutas de verdad leyendo!',
        'Vous aimez vraiment lire !',
        'Du liest wirklich gern!',
      ),
      body: t(
        'This note only appears when every rating above is high. It tests the "all" combinator.',
        'Esta nota só aparece quando todas as avaliações acima são altas. Serve para testar o combinador "all".',
        'Esta nota solo aparece cuando todas las valoraciones anteriores son altas. Sirve para probar el combinador "all".',
        'Cette note n’apparaît que lorsque toutes les évaluations ci-dessus sont élevées. Elle sert à tester le combinateur "all".',
        'Dieser Hinweis erscheint nur, wenn alle obigen Bewertungen hoch sind. Er testet den Kombinator "all".',
      ),
    },
  ],
} satisfies SurveyDefinitionInput;
