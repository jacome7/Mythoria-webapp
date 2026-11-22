import { parseResetReply } from './reset-reply';

describe('parseResetReply', () => {
  it.each(['YES.', 'Sim', '¡Sí!', 'Oui', 'Ja'])('accepts the explicit confirmation %s', (reply) => {
    expect(parseResetReply(reply)).toBe('yes');
  });

  it.each(['NOPE!', 'Não', 'Nao', 'No', 'Non', 'Nein'])('accepts the refusal %s', (reply) => {
    expect(parseResetReply(reply)).toBe('no');
  });

  it.each(['', 'Sim?', 'Sim...', 'Sim, mas ainda não', 'Não sei', 'O Sim é uma personagem'])(
    'asks for a clearer reply when given %j',
    (reply) => {
      expect(parseResetReply(reply)).toBeUndefined();
    },
  );
});
