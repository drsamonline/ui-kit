/* The TodoMVC acceptance run for ui-kit. Run: node test-todomvc.js
 * Drives the real TodoMVC app through the DOM and checks the spec's behaviour. */
"use strict";
var JSDOM = require("jsdom").JSDOM;
var dom = new JSDOM("<!DOCTYPE html><body><div id=app></div></body>", { url: "https://example.test/#/" });
var UI = require("./ui-kit.js");
UI.doc = dom.window.document;
var TodoMVC = require("./examples/todomvc.js");

var pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log("PASS  " + name); } else { fail++; console.log("FAIL  " + name); } }

var host = dom.window.document.getElementById("app");
var app = TodoMVC.create(host, { window: dom.window });

function press(el, key) { el.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: key, bubbles: true })); }
function addTodo(text) { app.newTodo.value = text; press(app.newTodo, "Enter"); }
function items() { return Array.prototype.slice.call(app.list.children); }
function liFor(text) {
  return items().filter(function (li) { var l = li.querySelector("label"); return l && l.textContent === text; })[0];
}
function countText() { var m = /(\d+) items? left/.exec(app.footer.textContent); return m ? m[0] : null; }
function title() { return host.querySelector(".header h1").textContent; }

/* header + empty state */
ok("todomvc: renders the header", title() === "todos");
ok("todomvc: the main and footer are hidden with no todos",
   app.mainSection.style.display === "none" && app.footer.style.display === "none");

/* add */
addTodo("Write the kit");
ok("todomvc: Enter adds a todo", items().length === 1 && items()[0].querySelector("label").textContent === "Write the kit");
addTodo("Test the kit");
addTodo("Ship the kit");
ok("todomvc: three todos", items().length === 3);
ok("todomvc: the count reads '3 items left'", countText() === "3 items left");
ok("todomvc: main and footer are shown once there are todos",
   app.mainSection.style.display === "block" && app.footer.style.display === "block");
ok("todomvc: an empty title is ignored", (addTodo("   "), items().length === 3));
ok("todomvc: the input clears after adding", app.newTodo.value === "");

/* toggle */
var first = liFor("Write the kit");
first.querySelector(".toggle").checked = true;
first.querySelector(".toggle").dispatchEvent(new dom.window.Event("change"));
ok("todomvc: toggling marks the item completed", liFor("Write the kit").className.indexOf("completed") !== -1);
ok("todomvc: the count drops to '2 items left'", countText() === "2 items left");

/* filters */
app.filter.set("active");
ok("todomvc: the active filter hides completed", items().length === 2 && liFor("Write the kit") === undefined);
app.filter.set("completed");
ok("todomvc: the completed filter shows only completed", items().length === 1 && liFor("Write the kit") !== undefined);
app.filter.set("all");
ok("todomvc: the all filter shows everything", items().length === 3);

/* edit */
var target = liFor("Test the kit");
target.querySelector("label").dispatchEvent(new dom.window.MouseEvent("dblclick", { bubbles: true }));
var ed = liFor("Test the kit").querySelector(".edit");
ok("todomvc: double-click opens an editor", !!ed && ed.value === "Test the kit");
ed.value = "Test it thoroughly";
press(ed, "Enter");
ok("todomvc: Enter commits the edit", liFor("Test it thoroughly") !== undefined && liFor("Test the kit") === undefined);

/* destroy */
liFor("Ship the kit").querySelector(".destroy").dispatchEvent(new dom.window.Event("click"));
ok("todomvc: destroy removes the item", items().length === 2 && liFor("Ship the kit") === undefined);

/* toggle-all */
app.mainSection.querySelector(".toggle-all").checked = true;
app.mainSection.querySelector(".toggle-all").dispatchEvent(new dom.window.Event("change"));
ok("todomvc: toggle-all completes everything", countText() === "0 items left");
ok("todomvc: the toggle-all box reflects the state", app.mainSection.querySelector(".toggle-all").checked === true);

/* clear completed */
app.footer.querySelector(".clear-completed").dispatchEvent(new dom.window.Event("click"));
ok("todomvc: clear-completed empties the list", items().length === 0);
ok("todomvc: the empty state returns", app.mainSection.style.display === "none");

/* the hash drives the filter */
addTodo("one");
dom.window.location.hash = "#/active";
dom.window.dispatchEvent(new dom.window.Event("hashchange"));
ok("todomvc: the hash route sets the filter", app.filter() === "active");
dom.window.location.hash = "#/completed";
dom.window.dispatchEvent(new dom.window.Event("hashchange"));
ok("todomvc: the completed route shows nothing here", items().length === 0 && app.filter() === "completed");

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
