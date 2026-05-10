# Project Overview

The **smart-api** project is an intraday trading algorithm developed in Node.js, Express, and TypeScript. It is specifically designed to automate trading strategies (primarily short straddle) for BankNifty index options using the **SmartAPI**.

### Main Technologies

- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express
- **API Integration:** [SmartAPI](https://smartapi.angelbroking.com/) (via `krb-smart-api-module`)
- **Testing:** Jest
- **Transpilation:** Babel
- **Task Runner:** npm scripts

### Architecture

- **Entry Points:** `src/server.ts` (HTTP server) and `src/app.ts` (Express app).
- **Routes:** Defined in `src/routes/`, organized by functionality (e.g., `algo`, `api`).
- **Data Stores:** In-memory stores located in `src/store/` (e.g., `dataStore.ts`, `orderStore.ts`) manage state during execution.
- **Middlewares:** Custom middlewares like `errorHandler.ts` in `src/middlewares/`.
- **Helpers:** Utility functions and constants in `src/helpers/`.

# Building and Running

### Development

To run the application in development mode with hot-reloading (via `ts-node`):

```bash
npm run dev
```

### Production

1. **Build:** Transpile TypeScript to JavaScript in the `dist/` directory using Babel:
   ```bash
   npm run build
   ```
2. **Start:** Run the compiled application from the `dist/` folder:
   ```bash
   npm start
   ```

### Testing

- **Run all tests:** `npm test`
- **Coverage report:** `npm run test:coverage`
- Tests are located in the `__tests__/` directory.

# Development Conventions

### Environment

- **Operating System:** Windows
- **Shell:** PowerShell.
- **CRITICAL RULE FOR AI:** **YOU MUST refer to this `GEMINI.md` file BEFORE executing ANY terminal command.**
- **PowerShell Compatibility Requirements:**
  - **NO `&&`:** Standard Windows PowerShell (5.1) does NOT support `&&`. Use `;` for sequential execution or check `$?` for conditional logic.
  - **NO `grep`:** Use `Select-String` or the built-in `grep_search` tool.
  - **NO `cat` / `ls` / `rm` with Bash flags:** While aliases exist, avoid Bash-specific flags (e.g., `ls -la`, `rm -rf`). Use `Get-ChildItem`, `Get-Content`, or `Remove-Item -Recurse -Force`.
  - **Quoting:** Use double quotes `"` for paths with spaces. Avoid single quotes `'` if variable expansion is needed.

### Coding Style & Linting

- **Linting:** ESLint is used for code quality.
- **Formatting:** Prettier is used for consistent code styling.
- **Configuration:** Managed via `eslint.config.mjs`, `.babelrc`, and settings in `package.json`.
- **Pre-commit Hooks:** Husky and `lint-staged` ensure that formatting and linting are applied automatically before each commit.

### Push Requirements

- **Verification:** Before pushing any changes, you MUST always run a full verification suite to ensure no regressions. This includes typechecking, linting, formatting, testing, and building:
  ```powershell
  pnpm format; pnpm lint; pnpm typecheck; pnpm test; pnpm build
  ```

### Commits

- This project follows **Conventional Commits** using emojis.
- Use `npm run commit` to use the interactive Commitizen CLI (`cz-emoji-conventional`).

### Testing Practices

- Use **Jest** for all testing.
- Mocking: External dependencies (like `got` or `smartapi-javascript`) should be mocked using the files in the `__mocks__/` directory to ensure fast and reliable tests.
- **CRITICAL RULE FOR AI:** Whenever you write new code, you MUST ensure it has **maximum test coverage** (aiming for 100% for the new/modified lines).
- **Pre-Commit Verification:** You MUST run the following commands to verify coverage and correctness for any new code:
  ```powershell
  npm test; npm run test:coverage
  ```
- **Lint-Staged:** Ensure all new files are included in the `lint-staged` workflow (automatically handled by glob patterns).

### Deployment

- The project includes `Dockerfile`, `cloudbuild.yaml`, and `deployment.yaml`, indicating it is ready for containerized deployment (likely Google Cloud Platform/GKE).
