# Contributing to eToro Census

## Development Setup

### Prerequisites
- Node.js 22.22.2+ (jsdom 30 requires `^22.22.2 || ^24.15.0 || >=26.0.0`; CI runs Node 22)
- npm 10+

### Installation
```bash
git clone https://github.com/weirdapps/etoro_census.git
cd etoro_census
npm install
```

### Environment Variables
Create a `.env.local` file:
```
ETORO_API_KEY=your_api_key
ETORO_USER_KEY=your_user_key
```

### Development Server
```bash
npm run dev  # Starts on port 3600
```

## Testing

### Running Tests
```bash
npm test           # Watch mode
npm test -- --run  # Single run
npm test -- --coverage  # With coverage report
```

### Test Structure
Tests are located alongside source files in `__tests__` directories:
```
src/lib/services/
├── investor-service.ts
├── user-service.ts
└── __tests__/
    ├── investor-service.test.ts
    └── user-service.test.ts
```

### Writing Tests
- Use Vitest with `vi.mock()` for mocking modules
- Test files should match `*.test.ts` pattern
- Mock external APIs, don't make real network calls
- Cover edge cases: null inputs, empty arrays, Map/Object handling

Example:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SomeService } from '../some-service';

describe('SomeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle null input gracefully', () => {
    expect(SomeService.someMethod(null)).toBeNull();
  });
});
```

## Code Style

### TypeScript
- Strict mode enabled (`noEmit` check runs in CI)
- Avoid `any` unless absolutely necessary
- Use proper interfaces for data structures
- All new code must pass type checking

### Linting
```bash
npm run lint
```
- Zero ESLint warnings/errors required for CI to pass
- Follow Next.js recommended rules

### Formatting
- 2-space indentation
- Single quotes for strings
- Trailing commas in multiline

## Pull Request Process

### Before Submitting
1. Run full test suite: `npm test -- --run`
2. Run type check: `npx tsc --noEmit`
3. Run linter: `npm run lint`
4. Run build: `npm run build`

### PR Requirements
- All CI checks must pass
- No decrease in test coverage
- Update documentation if adding features
- Use descriptive commit messages

### Commit Message Format
```
type: brief description

- Detail 1
- Detail 2
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`

## Architecture Overview

### Key Services
| Service | Purpose |
|---------|---------|
| `DataCollectionService` | Single-pass API data collection |
| `AnalysisService` | Multi-band investor analysis |
| `InvestorService` | Investor profile operations |
| `AssetService` | Asset/instrument operations |
| `UserService` | User data fetching |

### Data Flow
1. **Collection**: `DataCollectionService` fetches all data in one pass
2. **Analysis**: `AnalysisService` processes data for multiple bands (100, 500, 1000, 1500)
3. **Presentation**: React components display analysis results

### API Integration
- All eToro API calls go through `etoro-api-config.ts`
- Headers must use exact casing: `X-API-KEY`, `X-USER-KEY`
- Batch requests limited to 50 items

## CI/CD

### GitHub Actions
| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR to master | Tests, lint, type check, build |
| `daily-census.yml` | Daily 00:00 UTC | Generate census reports |
| `deploy-pages.yml` | After census | Deploy to GitHub Pages |

### CI Requirements
- All tests must pass
- TypeScript compilation must succeed
- ESLint must report zero errors
- Build must complete successfully

## Getting Help

- Check `CLAUDE.md` for project-specific patterns
- Review `ARCHITECTURE.md` for system design
- Check existing tests for implementation examples
