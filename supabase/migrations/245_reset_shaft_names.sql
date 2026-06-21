-- Reset shaft_names: scraper injected garbage text (news/review fragments)
UPDATE public.catalog_models SET shaft_names = NULL WHERE shaft_names IS NOT NULL;
