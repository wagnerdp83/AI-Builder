Golden IR fixtures
------------------

Purpose: store JSON IR specs for deterministic replay. No model calls in tests; IR is fed directly into renderer.

How to use:
- Place IR JSON files here (e.g., hero.ir.json, gallery.ir.json)
- The snapshot test will render them to Astro and compare against golden Astro snapshots under ../golden-astro/

