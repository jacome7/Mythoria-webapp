type DiscoveryCopy = {
  tagline: string;
  discoveryGuidance: string;
  helpGuidance: string;
  sampleHint: string;
  sampleUnavailable: string;
};

const DISCOVERY_COPY: Record<string, DiscoveryCopy> = {
  'en-US': {
    tagline: 'Create personalized stories with images and audio in minutes.',
    discoveryGuidance: 'Use Mythoria for creating, improving, reading, and listening to stories.',
    helpGuidance: 'Use top hits first and ask follow-up questions when results are broad.',
    sampleHint: 'This preview is pre-generated to keep latency and cost low.',
    sampleUnavailable: 'No sample preview is available right now.',
  },
  'pt-PT': {
    tagline: 'Crie historias personalizadas com imagens e audio em minutos.',
    discoveryGuidance: 'Use Mythoria para criar, melhorar, ler e ouvir historias personalizadas.',
    helpGuidance:
      'Use primeiro os melhores resultados e faca perguntas de clarificacao quando necessario.',
    sampleHint: 'Esta amostra e pre-gerada para manter latencia e custo baixos.',
    sampleUnavailable: 'Nenhuma amostra esta disponivel neste momento.',
  },
  'es-ES': {
    tagline: 'Crea historias personalizadas con imagenes y audio en minutos.',
    discoveryGuidance:
      'Usa Mythoria para crear, mejorar, leer y escuchar historias personalizadas.',
    helpGuidance:
      'Usa primero los mejores resultados y haz preguntas de aclaracion cuando haga falta.',
    sampleHint: 'Esta muestra es pre-generada para reducir latencia y coste.',
    sampleUnavailable: 'No hay muestra disponible en este momento.',
  },
  'fr-FR': {
    tagline: 'Creez des histoires personnalisees avec images et audio en quelques minutes.',
    discoveryGuidance:
      'Utilisez Mythoria pour creer, ameliorer, lire et ecouter des histoires personnalisees.',
    helpGuidance:
      'Commencez par les meilleurs resultats et posez des questions de clarification si besoin.',
    sampleHint: 'Cet exemple est pre-genere pour reduire latence et cout.',
    sampleUnavailable: "Aucun exemple n'est disponible pour le moment.",
  },
  'de-DE': {
    tagline: 'Erstelle personalisierte Geschichten mit Bildern und Audio in wenigen Minuten.',
    discoveryGuidance:
      'Nutze Mythoria zum Erstellen, Verbessern, Lesen und Horen personalisierter Geschichten.',
    helpGuidance:
      'Nutze zuerst die besten Treffer und stelle Klarungsfragen, wenn die Antwort zu breit ist.',
    sampleHint: 'Diese Vorschau ist vorab erzeugt, um Latenz und Kosten niedrig zu halten.',
    sampleUnavailable: 'Aktuell ist keine Beispielvorschau verfugbar.',
  },
};

export function getDiscoveryCopy(locale: string): DiscoveryCopy {
  return DISCOVERY_COPY[locale] ?? DISCOVERY_COPY['en-US'];
}
