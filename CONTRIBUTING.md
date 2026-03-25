# Contributing to altor-vec

Thanks for your interest in contributing! This is a monorepo containing both the core Rust library and the Docusaurus plugin.

## Repository Structure

- **Core Library** (Rust) - WASM vector search engine
- **Docusaurus Plugin** (TypeScript) - `packages/docusaurus-plugin-altor-vec/`

---

## Core Library (Rust)

### Building from source

```bash
git clone https://github.com/altor-lab/altor-vec.git
cd altor-vec
cargo build
```

### Running tests

```bash
cargo test                     # core tests
cargo test --all-features      # include serialization tests
```

### Building WASM

```bash
cargo install wasm-pack        # one-time setup
cd wasm && wasm-pack build --target web --release
```

### Code style

```bash
cargo fmt                      # format code
cargo clippy --all-targets --all-features -- -D warnings  # lint
```

---

## Docusaurus Plugin (TypeScript)

### Setup

```bash
cd packages/docusaurus-plugin-altor-vec
npm install
```

### Building

```bash
npm run build                  # compile TypeScript
npm run watch                  # watch mode for development
```

### Testing

```bash
npm test                       # run tests (when available)
npm run typecheck              # TypeScript type checking
```

### Code style

```bash
npm run lint                   # lint code (when configured)
npm run format                 # format code (when configured)
```

---

## Pull Request Process

1. Open an issue describing the change you'd like to make.
2. Fork the repo and create a feature branch from `main`.
3. Make your changes and add tests:
   - **Rust**: Ensure `cargo test --all-features` passes
   - **TypeScript**: Ensure `npm run build` succeeds
4. Format and lint your code:
   - **Rust**: Run `cargo fmt` and `cargo clippy` with no warnings
   - **TypeScript**: Run `npm run typecheck` with no errors
5. Submit a PR — we'll review it as soon as we can.

## Questions?

Open an issue or email [anshul@altorlab.dev](mailto:anshul@altorlab.dev).
