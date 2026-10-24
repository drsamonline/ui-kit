/* ui-kit — a reactive UI layer small enough for a single file. Zero dependencies.
 *
 * Signals and computed signals, reactive effects, hyperscript rendering, a keyed
 * list, events, a hash router and form binding. No compiler, no bundler, no
 * node_modules — the useful part of a framework in a couple of kilobytes.
 * (Shape after hyperapp, Vue 3's reactivity and Mithril; no code copied.)
 *
 * MIT License. (c) 2026 Dr Sohil Momin.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.UI = factory();
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var UI = { version: "0.1.0" };

  /* ---------------------------------------------- the reactive core */

  var active = null;                       // { deps: [ subscriberArray, ... ] }

  function track(subs) { if (active) active.deps.push(subs); }
  function notify(subs) {
    var copy = subs.slice();
    for (var i = 0; i < copy.length; i++) { if (typeof copy[i] === "function") copy[i](); }
  }
  function unbind(deps, fn) { deps.forEach(function (l) { var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }); }
  function bind(deps, fn) { deps.forEach(function (l) { l.push(fn); }); }
  function collect(fn) {
    var tracker = { deps: [] }, prev = active;
    active = tracker;
    try { fn(); } finally { active = prev; }
    return tracker.deps;
  }
  /* run fn with tracking OFF — read a signal without subscribing to it */
  UI.untracked = function (fn) { var prev = active; active = null; try { return fn(); } finally { active = prev; } };

  /* A signal: a value with subscribe/notify. Call it to read (and to track). */
  UI.signal = function (initial) {
    var value = initial, subs = [];
    function s() { track(subs); return value; }
    s.set = function (v) { if (v !== value) { value = v; notify(subs); } return s; };
    s.update = function (fn) { return s.set(fn(value)); };
    s.peek = function () { return value; };
    s.subscribe = function (fn) { subs.push(fn); return function () { unbind([subs], fn); }; };
    return s;
  };

  /* A computed signal: re-derives when a signal it read changes. Lazy — it only
     recomputes when someone reads it after a dependency changed. */
  UI.computed = function (fn) {
    var value, subs = [], deps = [], stale = true;
    function invalidate() { if (stale) return; stale = true; notify(subs); }
    function recompute() {
      unbind(deps, invalidate);
      deps = collect(function () { value = fn(); });
      bind(deps, invalidate);
      stale = false;
    }
    function s() { track(subs); if (stale) recompute(); return value; }
    s.peek = function () { if (stale) recompute(); return value; };
    return s;
  };

  /* An effect: re-runs when any signal it read changes. Returns a disposer. */
  UI.effect = function (fn) {
    var deps = [], disposed = false;
    function runner() {
      if (disposed) return;
      unbind(deps, runner);
      deps = collect(fn);
      bind(deps, runner);
    }
    runner();
    return function () { disposed = true; unbind(deps, runner); };
  };

  /* ------------------------------------------------------------ DOM */

  function doc() { return UI.doc || (typeof document !== "undefined" ? document : null); }

  function addChild(el, child) {
    if (child == null || child === false || child === true) return;
    if (Array.isArray(child)) { child.forEach(function (c) { addChild(el, c); }); return; }
    if (typeof child === "function") { addChild(el, child()); return; }   // a plain getter
    if (typeof child === "object" && child.nodeType) { el.appendChild(child); return; }
    el.appendChild(el.ownerDocument.createTextNode(String(child)));
  }

  /* hyperscript: h("div", { class: "x", onClick: fn }, child, ...) */
  UI.h = function (tag, props) {
    var d = doc(), el = d.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === "class" || k === "className") el.className = v;
      else if (k === "style" && typeof v === "object") { for (var s in v) el.style[s] = v[s]; }
      else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === "value" || k === "checked" || k === "disabled" || k === "id") el[k] = v;
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) addChild(el, arguments[i]);
    return el;
  };

  /* a text node bound to a signal or computed */
  UI.text = function (sig) {
    var node = doc().createTextNode("");
    UI.effect(function () { node.nodeValue = String(sig()); });
    return node;
  };

  /* mount a node into a parent (clearing it first) */
  UI.mount = function (node, parent) { parent.innerHTML = ""; parent.appendChild(node); return node; };

  /* ------------------------------------------------ keyed list */
  /* Reconcile children by key: the SAME node is reused for the same key across
     reorders, so a list re-renders without flicker. */
  UI.list = function (items, keyFn, renderFn, opts) {
    opts = opts || {};
    var container = UI.h(opts.tag || "ul", { class: opts.class || "ui-list" });
    var nodes = {};
    UI.effect(function () {
      var list = typeof items === "function" ? items() : items;
      var seen = {}, order = [];
      list.forEach(function (item, i) {
        var k = keyFn(item, i);
        seen[k] = true;
        var e = nodes[k];
        if (!e) {
          e = nodes[k] = { key: k, item: item, node: renderFn(item, i) };
        } else if (e.item !== item) {
          /* the item changed (replace items immutably): re-render just this one,
             in place, keeping every OTHER key's node */
          var fresh = renderFn(item, i);
          if (e.node.parentNode) e.node.parentNode.replaceChild(fresh, e.node);
          e.node = fresh; e.item = item;
        }
        order.push(e);
      });
      Object.keys(nodes).forEach(function (k) {
        if (!seen[k]) {
          var n = nodes[k].node;
          if (n.parentNode) n.parentNode.removeChild(n);
          delete nodes[k];
        }
      });
      order.forEach(function (e) { container.appendChild(e.node); });   // moves existing nodes into order
    });
    return container;
  };

  /* ------------------------------------------------------- events */
  UI.on = function (target, type, fn) {
    target.addEventListener(type, fn);
    return function () { target.removeEventListener(type, fn); };
  };
  UI.bus = function () {
    var map = {};
    return {
      on: function (t, fn) { (map[t] = map[t] || []).push(fn); return function () { unbind([map[t]], fn); }; },
      emit: function (t, data) { (map[t] || []).slice().forEach(function (fn) { fn(data); }); }
    };
  };

  /* ------------------------------------------------------- router */
  /* A hash router for multi-view single-file apps: the route is a signal. */
  UI.router = function (opts) {
    opts = opts || {};
    var win = opts.window || (typeof window !== "undefined" ? window : null);
    function read() {
      var h = (win && win.location && win.location.hash) || "";
      h = h.replace(/^#\/?/, "");
      return h || opts.fallback || "";
    }
    var route = UI.signal(read());
    if (win) UI.on(win, "hashchange", function () { route.set(read()); });
    return {
      route: route,
      go: function (path) { if (win) win.location.hash = "#/" + path; else route.set(path); },
      is: function (path) { return route() === path; }
    };
  };

  /* -------------------------------------------------- form binding */
  /* Two-way binding for an input, in ONE place. */
  UI.bind = function (sig, opts) {
    opts = opts || {};
    var input = UI.h("input", { type: opts.type || "text", value: sig(), class: opts.class, id: opts.id, placeholder: opts.placeholder });
    UI.effect(function () { var v = sig(); if (input.value !== String(v)) input.value = v; });
    UI.on(input, opts.event || "input", function () {
      sig.set(opts.number ? Number(input.value) : input.value);
    });
    return input;
  };

  return UI;
}));
