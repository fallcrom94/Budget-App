# Local Budget Web App

This folder is a standalone static web app for Local Budget.

It uses:

- Plain HTML
- Plain CSS
- Plain JavaScript
- SQL.js in the browser
- GitHub as the database storage/sync backend

It does not use Node.js, npm, React, a server, paid hosting, firewall ports, or direct access to a local Windows file.

## What It Edits

The web app downloads, opens, edits, and uploads:

```text
budget.sqlite3
```

from the GitHub repo/folder you configure.

The Windows app can still use the same file by syncing with GitHub, but the web app no longer depends on the Windows app for daily entry.

## Setup

1. Put these files on GitHub Pages:
   - `index.html`
   - `style.css`
   - `app.js`
2. Open the published GitHub Pages URL.
3. Enter:
   - `owner/repo`
   - branch, usually `main`
   - folder, usually `local-budget-backups`
   - fine-grained GitHub token
4. Tap `Open Database`.

The fine-grained token needs:

- Access only to the private budget backup repo
- `Contents: Read and write`

## Daily Use

The first screen after loading is `Add`, because transaction entry is the focus.

Adding a transaction:

1. Enter the amount.
2. Choose expense/income.
3. Choose account and category.
4. Optionally add vendor and notes.
5. Tap `Save Transaction`.

The app saves the transaction into SQLite and uploads the updated `budget.sqlite3` to GitHub.

## Features

- Dashboard totals
- Account balances and net worth
- Add/edit/delete transactions
- Fast transaction entry
- Vendor suggestions from previous transactions
- Transaction search
- CSV import/export
- Accounts
- Categories
- Monthly budgets
- Debts
- Reports with monthly income, spending, and savings rate

## Conflict Handling

The web app uploads the entire SQLite database file.

If GitHub says the database changed since the web app loaded it, saving fails with a conflict message. Use `Reload From GitHub`, then make the change again.

Avoid editing in the Windows app and web app at the exact same time.

## Reset

To clear saved browser settings, open:

```text
https://your-pages-url/?reset=1
```

or use `Clear Web Settings` in the Settings tab.

## Security Note

The GitHub token is stored in this browser's `localStorage`. Use a private repo and a token limited to that repo.
