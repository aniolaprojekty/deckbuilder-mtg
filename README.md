# Deckbuilder MTG

Aplikacja na Androida (i w przeglądarce): skanowanie stron klasera, kolekcja kart, wybór preconu Commandera i podpowiedzi upgrade'ów z kolekcji, z informacją, czy zmiana podnosi bracket talii.

## Pobranie
- **APK:** zakładka [Releases → latest](../../releases/tag/latest), plik `deckbuilder-mtg.apk`. Każdy push na `main` buduje nową wersję, która instaluje się na poprzednią bez utraty danych.
- **Wersja web:** GitHub Pages tego repozytorium.

## Struktura
- `src/app.html` — cała aplikacja (HTML/CSS/JS); `src/precons.json` — 161 preconów Commandera (źródło: taw/magic-preconstructed-decks, `tools/build_precons.py`).
- `tools/build.py` — składa `www/` (precony wbudowane w `index.html`).
- `android/` — projekt Capacitor 8; CI: `.github/workflows/android.yml`.

## Lokalnie
```
npm ci
python3 tools/build.py
npx cap sync android   # potem Android Studio: android/
```

## Silnik bracketu
Game Changers z pola `game_changer` Scryfall; MLD, dodatkowe tury i combo 2-kartowe (Commander Spellbook + lista wbudowana) wg reguł Commander Brackets beta (X 2025 / II 2026).
