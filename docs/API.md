# ui-kit — API reference

**Version .** <div align="center">

Generated from the source in this repository: every name, argument and
note below is read out of the kit file, so it cannot describe a function
that is not there.

```js
<script src="ui-kit.js"></script>
UI.untracked(...)
// or: const UI = require('./ui-kit.js')
```

## The surface (12 entries)

| Name | Arguments | What it does |
|---|---|---|
| `UI.untracked` | `(fn)` | run fn with tracking OFF — read a signal without subscribing to it |
| `UI.signal` | `(initial)` | A signal: a value with subscribe/notify. Call it to read (and to track). |
| `UI.computed` | `(fn)` | — |
| `UI.effect` | `(fn)` | An effect: re-runs when any signal it read changes. Returns a disposer. |
| `UI.h` | `(tag, props)` | hyperscript: h("div", { class: "x", onClick: fn }, child, ...) |
| `UI.text` | `(sig)` | a text node bound to a signal or computed |
| `UI.mount` | `(node, parent)` | mount a node into a parent (clearing it first) |
| `UI.list` | `(items, keyFn, renderFn, opts)` | — |
| `UI.on` | `(target, type, fn)` | ------------------------------------------------------- events |
| `UI.bus` | `()` | — |
| `UI.router` | `(opts)` | ------------------------------------------------------- router A hash router for multi-view single-file apps: the route is a signal. |
| `UI.bind` | `(sig, opts)` | -------------------------------------------------- form binding Two-way binding for an input, in ONE place. |

## Notes

- Zero dependencies, one file, no build step: it works from `file://`, from a
  `<script>` tag and from Node.
- The version above is the `VERSION` file in this repository; a pinned copy is
  what an app vendors.
