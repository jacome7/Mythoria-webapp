# Implementation notes

## Organização

Este pack é a fonte editorial regenerável. Depois da validação, deve viver em `docs/landing-pages/livro-personalizado-para-casais/`. A pasta pública com o mesmo slug deve conter apenas os assets consumidos pela rota.

## Registo

- `locale`: `pt-PT`
- `primaryIntent`: `romance`
- `riskRating`: `green`
- `indexable`: `false`
- Sem testemunhos.
- Sem badges de preço, prazo ou entrega.

## Assets

Os sample books completos vivem em `public/sample-books/{slug}`. Os assets usados pela landing são copiados sem edição manual para `public/landing-pages/livro-personalizado-para-casais/assets/books/{slug}`.

## Tracking

Usar a infraestrutura existente e propriedades de baixa cardinalidade:

- `landing_page_view`: `landing_slug`, `locale`, `primary_intent`, `variant`.
- `landing_cta_click`: `landing_slug`, `primary_intent`, `cta_placement`, `cta_destination`.
- `sample_chapter_open`: `landing_slug`, `sample_book_slug`, `locale`.
- `sample_audio_start` e `sample_audio_complete`: `landing_slug`, `sample_book_slug`, `locale`.

Nunca enviar nomes, datas, dedicatórias, conteúdo do livro, fotografias, URLs privadas ou contexto da surpresa.

## Publicação

Não adicionar ao sitemap nem ativar indexação até existir aprovação humana de conteúdo, imagens, áudio, privacidade e comportamento da rota.
