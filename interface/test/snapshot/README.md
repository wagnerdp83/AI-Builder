Snapshot Testing System
========================

Purpose: Ensure deterministic rendering by comparing IR-to-Astro output against golden snapshots.

How it works:
1. Golden IR fixtures (JSON) are stored in `../golden-ir/`
2. First run creates golden Astro snapshots in `../golden-astro/`
3. Subsequent runs compare rendered output against snapshots
4. Any deviation triggers test failure (regression detection)

Files:
- `ir-snapshot.spec.ts`: Main snapshot test runner
- `../golden-ir/*.ir.json`: Input IR specifications
- `../golden-astro/*.astro`: Expected rendered output

To update snapshots:
- Delete the `.astro` file from `golden-astro/`
- Re-run tests to generate new golden snapshot

This ensures the deterministic renderer maintains byte-identical output for identical inputs. 