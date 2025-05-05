# Contributing to DYOR Hub Documentation

This guide explains how to contribute to the DYOR Hub documentation.

## Documentation Setup

DYOR Hub uses GitBook for documentation, which syncs with our GitHub repository. Our documentation follows these principles:

1. Documentation files are stored in the `apps/docs` directory
2. GitBook syncs with the `docs/gitbook` branch (not the `main` branch)
3. An automated workflow syncs changes from `main` to `docs/gitbook` daily

## How to Contribute Documentation

### Option 1: Edit directly in GitBook (Recommended for small changes)

1. Visit our [GitBook documentation](https://juliens-organization-7.gitbook.io/dyor-hub)
2. Make your changes in the GitBook interface
3. The changes will be automatically committed to the `docs/gitbook` branch

### Option 2: Submit a PR to the docs/gitbook branch (Recommended for developers)

1. Fork the repository
2. Create a new branch from the `docs/gitbook` branch (not from `main`)
   ```bash
   git checkout docs/gitbook
   git checkout -b my-documentation-changes
   ```
3. Make your changes to files in the `apps/docs` directory
4. Commit and push your changes
5. Create a Pull Request targeting the `docs/gitbook` branch (not `main`)

### Option 3: Include documentation in code PRs to main

If you're making code changes that require documentation updates:

1. Include the documentation changes in your PR to the `main` branch
2. Our automated workflow will sync these changes to the `docs/gitbook` branch within 24 hours

## Documentation Guidelines

- Use Markdown for all documentation files
- Include meaningful headings and sections
- Use code blocks with appropriate syntax highlighting
- Keep documentation up-to-date with code changes
- Add images in the `apps/docs/assets` directory when helpful

## Reviewing Documentation Changes

Documentation changes through PRs will be reviewed like code changes. Once approved and merged, they will be automatically reflected in GitBook.

## Questions?

If you have questions about contributing to documentation, please open an issue with the "documentation" label.
