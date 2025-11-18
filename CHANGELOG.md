## 0.2.0

Bifrost is now an extension of [vike-react](https://vike.dev/vike-react)!
This means pages can be built using all vike-react features.

### Breaking changes:

- Head does not change on page navigation.
- `bodyattributes` is global config.
- `scripts`, `dynamicScripts`, and `metaTags` are removed. Use `+Head` instead.
- `title`, `description`, and `viewport` are no longer nested inside `documentProps`.
- `pageProps` is removed. Use `+data` and `useData` instead.
- `layoutProps` config is removed. Use `useData` or `usePageContext` instead.
- `redirectTo` is removed. Use `throw redirect()` instead.
- [hook type definitions are deprecated](https://vike.dev/migration/hook-types)
