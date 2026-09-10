# Contributing

Thanks for your interest in improving these examples.

## Reporting a problem

Open an issue describing what you expected, what happened, and which example it
concerns. For anything security-related, follow [SECURITY.md](./SECURITY.md)
instead of opening a public issue.

## Making a change

1. Fork the repository and create a branch for your change.
2. Make the change, keeping it focused — one topic per pull request.
3. Check that it builds and lints cleanly:

   ```bash
   cd nextjs
   npm ci
   npm run lint
   npm run build
   ```

4. Open a pull request explaining what changes and why.

## What we look for

These are teaching examples, so clarity beats cleverness. A change is easier to
accept when it:

- keeps each example readable on its own, without having to trace it across files;
- explains *why* in a comment wherever the *what* is not obvious;
- never sends the API key to the browser — every Platform call is made server-side,
  through the helpers in [`nextjs/src/lib/platform.ts`](./nextjs/src/lib/platform.ts);
- matches the surrounding style rather than introducing a new one.

## Adding an implementation for another platform

The `android/` and `ios/` folders are placeholders. If you want to fill one in,
open an issue first so we can agree on the scope — each implementation should
cover the same examples as the Next.js one rather than a subset.

## API keys

Never commit an API key. Every example reads its key from an environment
variable; `nextjs/.env.example` shows which one. `.env*` files are gitignored,
and so is the `temp/` scratch directory.
