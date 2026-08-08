# Notas de implementação

## Decisões registadas

- Reutilizar o motor partilhado de landing pages; não criar rota ou template paralelo.
- Manter a página indexável, com cartão no hub, homepage e sitemap após aprovação explícita.
- Usar `kids_adventures` e destinatário `child` no contexto permitido pela rota.
- Usar os tokens canónicos `claymation` e `papercut`, já presentes no enum e nos prompts do workflow; não é necessária migração.
- Reutilizar seis ícones Paper Cut existentes e já legíveis a 128 px; não gerar substitutos.
- Publicar apenas cinco teasers MP3 de 30–45 segundos, sem prometer audiobook completo.
- Apresentar os packs publicamente como livros criados com a Mythoria. A proveniência interna continua a declarar inputs sintéticos de demonstração.
- Não incluir testemunhos, números de clientes, avaliações, preços, prazos ou disponibilidade inventada.

## Assets e cópia determinística

Os packs em `public/sample-books/{slug}` são a fonte canónica. Um script dedicado copia capa, feature, imagem de capítulo e teaser para `public/landing-pages/livro-personalizado-crianca/assets/books/{slug}` e deriva hero/OG a partir da feature de Mia. Títulos de capa são aplicados por composição determinística, não confiados ao modelo de imagem.

## Analytics

Usar a infraestrutura existente com:

- `landing_page_view`, `landing_section_view` e `landing_cta_click`;
- `sample_book_open`, `sample_chapter_open`, `sample_audio_start`, `sample_audio_complete`;
- apenas slug da landing, intent, locale, slug do livro e label de estilo.

Nunca enviar nomes, idades, texto da história, prompts, memórias, desenhos, fotografias, voz ou transcrições.

## Claims bloqueadas

Formatos além de leitura digital são descritos como condicionais à oferta atual. Preço liga ao painel global atual. Não é publicado prazo de criação, impressão ou entrega. A retenção detalhada não é afirmada sem política confirmada.

## Verificações antes de lançamento

O percurso anónimo pode validar CTA e preservação de atribuição até ao ecrã controlado por autenticação. Concluir uma história e uma compra requer validação posterior numa sessão autorizada pelo utilizador. A audição editorial integral por revisor pt-PT foi concluída e a aprovação explícita para `indexable: true` foi recebida em 2026-08-08; publicação e verificação em produção permanecem gates separados.
