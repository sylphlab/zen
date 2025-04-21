# Lessons Learned

*(This file records insights and learnings from the project to inform future decisions and avoid repeating mistakes.)*
- **Monorepo Cleanup:** When removing dependencies or configurations (like linters/formatters), ensure checks and removals are performed not only at the root but also within individual package directories (`packages/*`) to avoid leaving remnants. Initial checks missed ESLint/Prettier configs in sub-package `package.json` files.