const affirmativeReplies = new Set([
  'yes',
  'yes please',
  'yes, please',
  'yes, start over',
  'sim',
  'sim, por favor',
  'sim, quero recomeçar',
  'sí',
  'si',
  'sí, por favor',
  'sí, quiero empezar de nuevo',
  'oui',
  'oui, s’il vous plaît',
  'oui, je veux recommencer',
  'ja',
  'ja, bitte',
  'ja, ich möchte neu anfangen',
]);

const negativeReplies = new Set([
  'no',
  'nope',
  'nah',
  'no thanks',
  'no, thanks',
  'não',
  'nao',
  'não, obrigado',
  'não, obrigada',
  'não quero recomeçar',
  'no, gracias',
  'no quiero empezar de nuevo',
  'non',
  'non, merci',
  'je ne veux pas recommencer',
  'nein',
  'nein, danke',
  'ich möchte nicht neu anfangen',
]);

export function parseResetReply(value: string): 'yes' | 'no' | undefined {
  const reply = value
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/^¡\s*/u, '')
    .replace(/[.!]$/u, '')
    .replace(/'/gu, '’')
    .replace(/\s+/gu, ' ')
    .trim();

  if (affirmativeReplies.has(reply)) return 'yes';
  if (negativeReplies.has(reply)) return 'no';
}
