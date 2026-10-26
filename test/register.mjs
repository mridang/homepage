// Lets `node --test` load the app's TypeScript the way the bundler does:
// the `@/` alias for src/ and relative imports without a file extension.
import { register } from 'node:module';

register(new URL('./resolver.mjs', import.meta.url));
