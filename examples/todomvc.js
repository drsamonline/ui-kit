/* TodoMVC, built on ui-kit — the acceptance test for the whole kit.
 * Behaviour follows the TodoMVC spec: add, toggle, edit (double-click), destroy,
 * toggle-all, the three filters, clear-completed and the items-left count. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../ui-kit.js"));
  else root.TodoMVC = factory(root.UI);
}(typeof self !== "undefined" ? self : this, function (UI) {
  "use strict";

  function assign(o, extra) { for (var k in extra) o[k] = extra[k]; return o; }

  function create(mount, opts) {
    opts = opts || {};
    var nextId = 1;
    var todos = UI.signal(opts.todos ? opts.todos.slice() : []);
    var filter = UI.signal(opts.filter || "all");
    var draft = UI.signal("");

    function add(title) {
      title = String(title == null ? "" : title).trim();
      if (!title) return;
      todos.update(function (l) {
        return l.concat([{ id: nextId++, title: title, completed: false, editing: false }]);
      });
      draft.set("");
    }
    function mapTodo(id, extra) {
      todos.update(function (l) {
        return l.map(function (t) { return t.id === id ? assign(assign({}, t), extra) : t; });
      });
    }
    function toggle(id) { mapTodo(id, { completed: !find(id).completed }); }
    function destroy(id) { todos.update(function (l) { return l.filter(function (t) { return t.id !== id; }); }); }
    function startEdit(id) { mapTodo(id, { editing: true }); }
    function stopEdit(id) { mapTodo(id, { editing: false }); }
    function edit(id, title) { mapTodo(id, { title: String(title).trim() || find(id).title, editing: false }); }
    function toggleAll(on) {
      todos.update(function (l) {
        return l.map(function (t) { return assign(assign({}, t), { completed: on }); });
      });
    }
    function clearCompleted() { todos.update(function (l) { return l.filter(function (t) { return !t.completed; }); }); }
    function find(id) { return todos.peek().filter(function (t) { return t.id === id; })[0] || {}; }

    var activeCount = UI.computed(function () { return todos().filter(function (t) { return !t.completed; }).length; });
    var completedCount = UI.computed(function () { return todos().filter(function (t) { return t.completed; }).length; });
    var visible = UI.computed(function () {
      var f = filter();
      return todos().filter(function (t) {
        return f === "active" ? !t.completed : (f === "completed" ? t.completed : true);
      });
    });

    /* ---- the view ---- */
    var newTodo = UI.h("input", { class: "new-todo", placeholder: "What needs to be done?" });
    UI.on(newTodo, "keydown", function (e) { if (e.key === "Enter") { add(newTodo.value); newTodo.value = ""; draft.set(""); } });
    UI.effect(function () { var v = draft(); if (newTodo.value !== v) newTodo.value = v; });

    var toggleAllBox = UI.h("input", { class: "toggle-all", type: "checkbox" });
    UI.on(toggleAllBox, "change", function () { toggleAll(toggleAllBox.checked); });

    var list = UI.list(function () { return visible(); }, function (t) { return t.id; }, function (t) {
      var cb = UI.h("input", { class: "toggle", type: "checkbox", checked: t.completed });
      UI.on(cb, "change", function () { toggle(t.id); });
      var label = UI.h("label", {}, t.title);
      UI.on(label, "dblclick", function () { startEdit(t.id); });
      var del = UI.h("button", { class: "destroy" });
      UI.on(del, "click", function () { destroy(t.id); });
      var li = UI.h("li", { class: t.completed ? "completed" : "" }, cb, label, del);
      if (t.editing) {
        var ed = UI.h("input", { class: "edit", value: t.title });
        UI.on(ed, "keydown", function (e) {
          if (e.key === "Enter") edit(t.id, ed.value);
          else if (e.key === "Escape") stopEdit(t.id);
        });
        UI.on(ed, "blur", function () { edit(t.id, ed.value); });
        li.appendChild(ed);
        if (ed.focus) setTimeout(function () { try { ed.focus(); } catch (e) {} }, 0);
      }
      return li;
    }, { tag: "ul", class: "todo-list" });

    var count = UI.text(function () { var n = activeCount(); return n + (n === 1 ? " item left" : " items left"); });
    var clearBtn = UI.h("button", { class: "clear-completed" }, "Clear completed");
    UI.on(clearBtn, "click", clearCompleted);

    var filters = UI.h("ul", { class: "filters" },
      UI.h("li", {}, UI.h("a", { href: "#/", class: "all" }, "All")),
      UI.h("li", {}, UI.h("a", { href: "#/active", class: "active" }, "Active")),
      UI.h("li", {}, UI.h("a", { href: "#/completed", class: "completed" }, "Completed")));

    var mainSection = UI.h("section", { class: "main" }, toggleAllBox, list);
    var footer = UI.h("footer", { class: "footer" }, count, filters, clearBtn);
    var app = UI.h("section", { class: "todoapp" },
      UI.h("header", { class: "header" }, UI.h("h1", {}, "todos"), newTodo), mainSection, footer);

    /* ---- reactive furniture ---- */
    UI.effect(function () {
      var any = todos().length > 0;
      mainSection.style.display = any ? "block" : "none";
      footer.style.display = any ? "block" : "none";
    });
    UI.effect(function () {
      clearBtn.style.display = completedCount() ? "inline-block" : "none";
      var f = filter();
      filters.querySelector(".all").className = "all" + (f === "all" ? " selected" : "");
      filters.querySelector(".active").className = "active" + (f === "active" ? " selected" : "");
      filters.querySelector(".completed").className = "completed" + (f === "completed" ? " selected" : "");
    });
    UI.effect(function () { toggleAllBox.checked = todos().length > 0 && activeCount() === 0; });

    /* the hash drives the filter, if there is a window */
    var win = opts.window || (typeof window !== "undefined" ? window : null);
    if (win && opts.router !== false) {
      var router = UI.router({ window: win, fallback: "all" });
      UI.effect(function () { filter.set(router.route() || "all"); });
    }

    if (mount) UI.mount(app, mount);
    return {
      app: app, todos: todos, filter: filter, draft: draft,
      add: add, toggle: toggle, destroy: destroy, startEdit: startEdit, stopEdit: stopEdit, edit: edit,
      toggleAll: toggleAll, clearCompleted: clearCompleted,
      activeCount: activeCount, completedCount: completedCount, visible: visible,
      newTodo: newTodo, list: list, footer: footer, mainSection: mainSection
    };
  }

  return { create: create };
}));
