# Changelog

All notable changes to Broke Gamer are documented in this file.

Versions are managed by [release-please](https://github.com/googleapis/release-please) from Conventional Commits — do not bump by hand for normal releases.

## [1.2.0](https://github.com/dnelband/brokegamer/compare/v1.1.0...v1.2.0) (2026-07-25)


### Features

* **images:** proxy storefront art through next/image ([ba9a9ae](https://github.com/dnelband/brokegamer/commit/ba9a9ae1a8e4dc25257fc2c12d1cb5f240732f0a))
* **images:** proxy storefront art through next/image ([1a5caab](https://github.com/dnelband/brokegamer/commit/1a5caab376e6a1f26af778db6503880c03868d1b))

## [1.1.0](https://github.com/dnelband/gamesunder10/compare/v1.0.0...v1.1.0) (2026-07-20)


### Features

* **auth:** implement basic authentication and minimal user area ([8e2b8b7](https://github.com/dnelband/gamesunder10/commit/8e2b8b790d96eb2bd61e6ecdcf9eca7d19aa8e64))
* **branding-v1:** implement v1 branding - broke gamer ([1fd2b05](https://github.com/dnelband/gamesunder10/commit/1fd2b05c64a698707514a3734cbfb7b580fd0159))
* **cron-job:** add script to run scheduelled cron-local job ([7e3aac4](https://github.com/dnelband/gamesunder10/commit/7e3aac403c0d5bc9509b33dc75f8267915cb8883))
* **deal-source:** add xbox deal source ingestion layer and cron-job ([4f6f853](https://github.com/dnelband/gamesunder10/commit/4f6f853e4af646713aeae595ffedb5536edf8d09))
* **deals:** add chearp shark source and initial deal listing ui ([4f2029b](https://github.com/dnelband/gamesunder10/commit/4f2029bd10ac4485135201bf62b7806a4b02e5a2))
* **deals:** add per-store product-url-builder and stores view for monitoring ([31e7a92](https://github.com/dnelband/gamesunder10/commit/31e7a92e3857d958bb72d91168618a766c4843d7))
* **enrichment:** expand psn igsb enrichment strategy ([bfceabd](https://github.com/dnelband/gamesunder10/commit/bfceabdeabe01a3fd9225b62763bdd4bf0a229d4))
* **wishlist:** add basic authenticated user wishlist ([84c6d39](https://github.com/dnelband/gamesunder10/commit/84c6d39ead9700aab15edddfec0fb10b1a508802))
* **wishlist:** add email notification on wishlist item ([73771cd](https://github.com/dnelband/gamesunder10/commit/73771cd74b4b06eb6a9aa1908ff6b2226341b67e))


### Bug Fixes

* **ci:** broken ci job ([ba6b5e6](https://github.com/dnelband/gamesunder10/commit/ba6b5e62353a9cba5533d52b753be328f1651ded))
* **cron-jobs:** cron job config for hobby ([ee3078a](https://github.com/dnelband/gamesunder10/commit/ee3078a663c9a9c392ded3dbd402f61c72c5d5c1))
* **url-builder:** broken xbox store urls ([379b5ba](https://github.com/dnelband/gamesunder10/commit/379b5bacddeeb755aae06054ecaa8401103cda79))
* **wishlist:** improve wishlist item to deal matching ([318595f](https://github.com/dnelband/gamesunder10/commit/318595f57e3dc87c8e95fac099984982631b0553))

## [1.0.0] — 2026-07-20

### Added

- Deals listing and detail under €10 (CheapShark, PSN, Xbox)
- Filters, search, pagination, and storefront buy links
- Wishlist with deal matching and optional email alerts
- Admin ops pages (status, stores, implementation checklist)
- Vitest unit suite with 80% statements coverage gate in CI
- Husky pre-commit (lint + test) and GitHub Actions CI
- Site footer version link with changelog modal
