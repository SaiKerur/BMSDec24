# BMS Design Tokens

Semantic CSS custom properties used across the React UI. Toggle themes with `data-theme="light"|"dark"` on `<html>`.

| Token | Purpose |
|-------|---------|
| `--color-bg` | Page background |
| `--color-surface` | Cards, panels |
| `--color-surface-2` | Inputs, secondary surfaces |
| `--color-border` | Borders and dividers |
| `--color-text` | Primary text |
| `--color-muted` | Secondary text |
| `--color-primary` | Brand accent (BookMyShow red) |
| `--color-primary-hover` | Primary hover state |
| `--color-success` | Available seats, success states |
| `--color-warning` | Hold countdown, warnings |
| `--shadow-md` | Elevated surfaces |
| `--radius-md` | Default border radius (14px) |

Legacy aliases (`--bg`, `--surface`, …) map to the `--color-*` tokens for backward compatibility.

See `frontend/src/styles/tokens.css` for values per theme.
