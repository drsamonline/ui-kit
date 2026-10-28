<div align="center">

# ui-kit

[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-2e7d32)](LICENSE)

**A reactive UI layer small enough for a single file.** Zero runtime dependencies, no build step.

signals · computed · effects · hyperscript · keyed list · events · router · binding

</div>

---

## Why

Forge ships offline, single-file apps with **no build step**. Every framework needs a
bundler and a `node_modules`, so none can be used — but the useful part of a framework
(signals, reactive effects, declarative DOM) fits in a couple of kilobytes. `ui-kit` is
that part, tested, so every app stops hand-rolling it.

## What's in it

| | |
|---|---|
| `signal(v)` | a value with subscribe/notify; call it to read and track |
| `computed(fn)` | a derived signal — lazy, cached, re-derives when a dependency changes |
| `effect(fn)` | re-runs when any signal it read changes; returns a disposer |
| `h(tag, props, …)` | hyperscript — declarative DOM, no compiler |
| `text(sig)` | a text node bound to a signal |
| `list(items, key, render)` | a **keyed list** — the same node is reused for the same key across reorders |
| `on` / `bus` | DOM events and a tiny event bus |
| `router()` | a hash router; the route is a signal |
| `bind(sig)` | two-way form binding, in one place |

## Usage

```js
var UI = require("./ui-kit.js");           // Node; in a browser it is window.UI

var count = UI.signal(0);
var double = UI.computed(function () { return count() * 2; });

var app = UI.h("div", {},
  UI.h("button", { onClick: function () { count.update(function (n) { return n + 1; }); } }, "+"),
  UI.text(function () { return "count " + count() + ", double " + double(); })
);
UI.mount(app, document.body);
```

## The proof: TodoMVC

`examples/todomvc.js` is **TodoMVC built on the kit** — add, toggle, edit (double-click),
destroy, toggle-all, the three filters, clear-completed and the items-left count, with the
hash driving the filter. It is the acceptance test for the whole kit, and it runs headless
in CI. Open `index.html` for the live version.

## Notes

- **No build step.** `ui-kit.js` is the whole library; drop it in a `<script>` and go. Target ~2–3 KB minified.
- **Everything is reimplemented.** The shape is after hyperapp, Vue 3's reactivity and Mithril; the references are named in comments and **no code is copied**.
- **Lists replace items immutably.** `UI.list` reuses a node while its item is the same object, and re-renders just that one when the item is replaced — so update items by mapping to new objects.

## Tests

```
npm ci
node test-node.js      # 31 core cases
node test-todomvc.js   # the TodoMVC acceptance run
```

Covers the spec's required cases — a **signal notification** test, a **computed-chain** test, a **keyed-list reorder** test (nodes are reused), and the **TodoMVC acceptance run** — plus hyperscript, effects, the event bus, form binding and the router. `jsdom` is the only dev dependency; the kit itself has none.

## License

PolyForm Noncommercial — see [LICENSE](LICENSE). © 2026 Dr Sohil Momin.
