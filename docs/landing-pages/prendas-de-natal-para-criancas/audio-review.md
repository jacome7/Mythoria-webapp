# Revisão das oito narrações

**24 de novembro de 2026.** As oito faixas passaram na revisão multimodal. A pronúncia de «Leo» com e aberto na edição portuguesa do _Clube_ ficou registada como nota menor. A revisão não indicou alterações ao áudio nem à transcrição publicada de cada amostra.

## Método

1. Envio individual dos oito MP3 como `audio/mpeg`, em linha no pedido Gemini. A API registou tokens de entrada `AUDIO` para cada faixa nas duas passagens. Na primeira, o Gemini 3.8 Flash transcreveu e avaliou o áudio sem receber o texto ou a variante pretendida. Na segunda, o Gemini 4 Hydrogen recebeu o mesmo MP3, o texto de referência e a lista de diferenças a confirmar. [Documentação Gemini sobre análise de áudio](https://aistudio.google.com/docs/audio)
2. Comparação palavra a palavra entre a passagem cega e o texto em `audio-sample.json`, previamente igualado com `book.json`. A segunda passagem ouviu de novo as diferenças aparentes e avaliou sotaque, interpretação, ritmo, adequação à faixa etária, possíveis cortes e sons estranhos. Os marcadores de sotaque abaixo sustentam a compatibilidade com a variante pedida. O áudio em registo narrativo padrão dá evidência limitada para localizar uma cidade específica.
3. Descodificação integral com FFmpeg e verificação de formato com `ffprobe`. São MP3 mono a 24 kHz, de 32,02 a 43,13 s. A descodificação encontrou zero amostras saturadas em cada faixa e picos de −2,68 a −1,83 dBFS. A análise por modelos é uma verificação automatizada. A escuta editorial humana permanece pendente.

## Resultado por faixa

| Faixa                                                    | Texto e pronúncia                                                                                                                                                             | Ritmo e integridade                                                                                                                                 |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A carta que perdeu o envelope**, PT, 38,66 s           | A abertura «Fuuuuu!» soa como vento (00:00–00:02). A redução vocálica e as sibilantes em «castanhas» e «três» são compatíveis com português europeu lisboeta.                 | A contagem tem pausas distintas e a pergunta final chega inteira. Boa adequação aos 3–6 anos. A inspiração após o sopro é natural.                  |
| **La carta que perdió su sobre**, ES, 43,13 s            | A abertura «¡Fuuuuu!» soa como um sopro assobiado (00:00–00:02). «Hizo», «nariz» e «cinco» sustentam a variante peninsular centro-norte, compatível com Madrid.               | Contagem clara e ligeira inspiração expressiva antes de «Rita» (00:26–00:27). Final completo. Boa adequação aos 3–6 anos.                           |
| **Quando a estrela do teatro se apagou**, PT, 37,66 s    | «Nove» foi ouvido. O algarismo «9» aparece só na transcrição cega. A redução em «estrela» e «espetáculo» é compatível com português europeu lisboeta.                         | Pausas dão tempo à piada dos cotovelos e à frase final. Início e fim íntegros. Boa adequação aos 6–9 anos.                                          |
| **Cuando se apagó la estrella del teatro**, ES, 36,14 s  | A transcrição independente coincide com o guião. A distinção em «parecía», «cinco» e «centro» é compatível com espanhol peninsular de Madrid.                                 | Bom espaço para a piada da batata. Dicção clara, sem sons estranhos detetados. Boa adequação aos 6–9 anos.                                          |
| **O clube do telhado torto**, PT, 32,02 s                | «Leo» soa como «Léo» por volta de 00:09 e continua identificável. A redução em «desenho» e «escola» e as sibilantes de «dois» são compatíveis com português europeu lisboeta. | As falas dos 00:07–00:10 são um pouco mais rápidas. «Tloc» tem uma pausa clara e a conclusão chega inteira. Boa adequação aos 6–9 anos.             |
| **El club del tejado torcido**, ES, 36,41 s              | A transcrição independente coincide com o guião. A distinção em «cerró», «torcido» e «lombriz» é compatível com espanhol peninsular de Madrid.                                | «Toc» (cerca de 00:25) e a pausa antes de «otra gota» acompanham a ação. Sem cortes ou outros sons estranhos detetados. Boa adequação aos 6–9 anos. |
| **A notícia a que faltava metade**, PT, 35,38 s          | «Onze» foi ouvido e escrito «11» pelo transcritor. Vogais átonas reduzidas e sibilantes em «três caixas» e «lhes tinha» são compatíveis com português europeu lisboeta.       | Pausas antes da pergunta dão espaço ao suspense. Frases de abertura e fecho completas. Boa adequação aos 9–12 anos.                                 |
| **La noticia a la que le faltaba la mitad**, ES, 32,14 s | «Once» foi ouvido e escrito «11» pelo transcritor. A distinção em «once», «decía» e «redacción» é compatível com espanhol peninsular de Madrid.                               | Pausas antes do texto do aviso e da pergunta. Final completo, sem falhas digitais detetadas. Boa adequação aos 9–12 anos.                           |

Na comparação com o áudio, não se confirmaram omissões, trocas ou repetições de palavras. Os sopros iniciais fazem parte da interpretação das duas _Cartas_. O e aberto de «Leo» mantém o nome inteligível com a grafia do guião. Os numerais foram normalizações da transcrição automática.

### Identificação dos MP3 auditados

Cada pasta abaixo é relativa a `public/sample-books`. Os hashes referem-se ao ficheiro `assets/audio-teaser.mp3` dessa pasta.

| Pasta                                     | SHA-256                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `a-carta-que-perdeu-o-envelope`           | `ac7842dedce48b5307404d850fb39ba5a9d5a31aaa65f164c85067a4c7efda02` |
| `la-carta-que-perdio-su-sobre`            | `537be9408e4e4ecfdc4712c0e811cb33e350ad7cdaef0b4c8ea1ffa382fee5b7` |
| `quando-a-estrela-do-teatro-se-apagou`    | `14e209d7469e5de01715032dbc31849542ad62f79cd02b3852ca67f178301c36` |
| `cuando-se-apago-la-estrella-del-teatro`  | `3f94aff27eeaac33169cf158ad3b114449a9f0987d31adc2a374fa7017fa4942` |
| `o-clube-do-telhado-torto`                | `e6cf677a13a2829b247cc9e0bddfe8d7616a5948832fe959d20b2c390c7a9183` |
| `el-club-del-tejado-torcido`              | `2647efdc034bc72c9cbad171a127bdf106785c53fe84886a8607d752be67394e` |
| `a-noticia-a-que-faltava-metade`          | `c81a989f44b438a119dafb22a8986321d0a52aa98b7b1f2c7071fbf86ea21ed2` |
| `la-noticia-a-la-que-le-faltaba-la-mitad` | `bd69d4bda845779c82a906b315c24383bb813ada60580d1ab91340cb182b7aba` |

## Proveniência e estado editorial

As duas edições da Inês em `public/seasonal-books/ines` incluem capas locais, a mesma ilustração do ribeiro seco com lettering próprio e um PDF de leitura etiquetado de 19 folhas por idioma. Cada PDF atribui a autoria editorial e a edição à Mythoria e identifica o conteúdo como amostra editorial. A experiência local regista ilustração gerada no Codex com referência à primeira ilustração do próprio livro. O relato do ensaio Sunburst regista um manuscrito aprovado para o ensaio e um retrato ficcional. A capa e as edições inspecionadas apresentam a personagem ficcional e elementos genéricos, sem dados de cliente identificados. O ensaio e as provas de impressão têm âmbito próprio. A prova física permanece pendente para o produto impresso.

O pedido do titular contém a autorização para publicar após as verificações solicitadas. A aprovação editorial humana independente e a escuta humana mantêm-se pendentes. As oito faixas passaram as verificações auditivas automatizadas acima e a revisão de capa, autoria e edição identificou os créditos e a origem ficcional. Esta revisão local deixou a decisão operacional de publicar no fluxo autorizado de lançamento.
