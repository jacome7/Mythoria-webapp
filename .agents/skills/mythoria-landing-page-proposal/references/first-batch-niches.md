# First Batch Niches

Use these as the first intended batch unless the user supplies another niche.

| Priority | Slug | Concept | Risk |
| ---: | --- | --- | --- |
| 1 | `livro-personalizado-criancas-autistas` | Personalised books for autistic children | yellow |
| 2 | `livro-aniversario-personalizado-crianca` | Personalised birthday book for a child | green |
| 3 | `historia-embalar-personalizada-crianca` | Personalised bedtime story | green |
| 4 | `historia-personalizada-criancas-tdah` | Personalised stories for children with ADHD | yellow |
| 5 | `livro-personalizado-equipa-turma` | Personalised book for team, class, or group | green |
| 6 | `livro-memorias-avos-familia` | Grandparent and family memory book | yellow |
| 7 | `livro-historia-amor-casal` | Personalised love story book | green |
| 8 | `livro-memorias-viagem-familia` | Family travel memory book | green |
| 9 | `livro-personalizado-animal-estimacao` | Personalised pet story | green |
| 10 | `livro-personalizado-equipa-empresa` | Personalised team/company book | green |

Recommended pilot:

```text
livro-personalizado-criancas-autistas
```

Reason: tests careful claims, sensitive niche handling, sample books, image prompts, audio samples, and review workflow.

Recommended second page:

```text
livro-aniversario-personalizado-crianca
```

Reason: commercially safer and useful for paid acquisition tests.

## Intent Mapping Notes

- Treat the slug as a creation intent, not a persona.
- Map to existing Mythoria intents only when a known token exists. If unsure, set `mappedExistingIntent` to `null` and explain the assumption in `implementation-notes.md`.
- Use `primaryGoal: "first_story_completed"` for most landing pages, with `secondaryGoal: "account_creation"`.
