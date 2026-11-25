BEGIN;
INSERT INTO authors (author_id, clerk_user_id, display_name, email)
VALUES ('00000000-0000-4000-8000-000000000001', 'user_isolated_fixture', 'Browser Fixture', 'author@fixture.invalid');
UPDATE authors SET experimental_features_enabled = true
WHERE author_id = '00000000-0000-4000-8000-000000000001';
INSERT INTO stories (story_id, author_id, title, slug, synopsis, story_language, status, is_public, is_featured, chapter_count, published_at) VALUES
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Mateus e o Léo', 'mateus-e-o-leo', 'A história de uma amizade.', 'pt-PT', 'published', true, true, 1, now()),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'How I Met Your Mother', 'how-i-met-your-mother', 'A story about friendship.', 'en-US', 'published', true, true, 1, now());
UPDATE stories SET cover_uri='/Mythoria-logo-white-512x336.jpg';
INSERT INTO chapters (story_id, author_id, version, chapter_number, title, html_content)
SELECT story_id, author_id, 1, 1, 'A new beginning',
 '<p>This is a disposable browser fixture story. The two friends followed a faded trail on the map, shared their picnic by the river and stopped to watch a flock of birds. By sunset, they had learned how to find their way home by following the old stone wall.</p>'
FROM stories;
INSERT INTO faq_sections (id, section_key, default_label)
VALUES ('00000000-0000-4000-8000-000000000004', 'credits-pricing-and-payments', 'Pricing & Credits');
INSERT INTO faq_entries (section_id, faq_key, locale, title, content_mdx) VALUES
 ('00000000-0000-4000-8000-000000000004', 'how-credits-work', 'en-US', 'How do credits work?', 'Use your credits to create personalized stories.');
COMMIT;
BEGIN;
UPDATE stories SET story_language='pt-PT' WHERE slug='how-i-met-your-mother';
INSERT INTO stories (story_id, author_id, title, slug, synopsis, story_language, status, is_public, is_featured, chapter_count, published_at, cover_uri) VALUES
 ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'Jogos de amizade', 'juventude-de-gaia-no-mundial-de-clubes', 'Uma história de amizade e futebol.', 'pt-PT', 'published', true, false, 1, now(), '/Mythoria-logo-white-512x336.jpg'),
 ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', 'Uma imaginação sem limites', 'joo-e-a-sua-imaginao', 'Uma história fictícia sobre um dia criativo.', 'pt-PT', 'published', true, false, 1, now(), '/Mythoria-logo-white-512x336.jpg');
INSERT INTO chapters (story_id, author_id, version, chapter_number, title, html_content)
SELECT story_id, author_id, 1, 1, 'Uma nova aventura', '<p>Dois amigos decidiram investigar a origem de um mapa antigo. A bibliotecária explicou que o papel guardava pistas sobre um jardim que ninguém visitava há muito tempo. Com a sua ajuda, encontraram o caminho escondido e escreveram uma nova história sobre o lugar.</p>'
FROM stories WHERE story_id IN ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000006');
INSERT INTO blog_posts (id, slug_base, status, published_at)
VALUES ('00000000-0000-4000-8000-000000000007', 'meet-mythoria-ai-team', 'published', now());
INSERT INTO blog_post_translations (post_id, locale, slug, title, summary, content_mdx) VALUES
 ('00000000-0000-4000-8000-000000000007', 'en-US', 'meet-mythoria-ai-team', 'Meet the story team', 'Synthetic English fixture article.', 'Meet the team behind this synthetic fixture.'),
 ('00000000-0000-4000-8000-000000000007', 'fr-FR', 'decouvrez-equipe-mythoria', 'Découvrez notre équipe', 'Un article de test fictif.', 'Découvrez une équipe fictive dans cet article de test.');
COMMIT;
UPDATE stories SET is_featured=true WHERE slug='juventude-de-gaia-no-mundial-de-clubes';
INSERT INTO pricing (service_code, credits) VALUES ('eBookGeneration', 10), ('printedSoftCover', 20), ('extraBookCopy', 15), ('shippingCost', 5);
