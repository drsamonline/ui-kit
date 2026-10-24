/* Tests for ui-kit. Run: node test-node.js */
"use strict";
var JSDOM = require("jsdom").JSDOM;
var dom = new JSDOM("<!DOCTYPE html><body><div id=app></div></body>");
var UI = require("./ui-kit.js");
UI.doc = dom.window.document;

var pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log("PASS  " + name); } else { fail++; console.log("FAIL  " + name); } }

/* ---- signals ---- */
var a = UI.signal(1);
var seen = [];
var off = a.subscribe(function () { seen.push(a.peek()); });
ok("signal: subscribe is notified on set", (a.set(2), seen.join() === "2"));
a.set(2);
ok("signal: setting the same value does not notify", seen.join() === "2");
a.update(function (v) { return v + 1; });
ok("signal: update transforms the value", a.peek() === 3 && seen.join() === "2,3");
off();
a.set(9);
ok("signal: unsubscribe stops notification", seen.join() === "2,3");
ok("signal: peek reads without tracking", a.peek() === 9);

/* ---- effects ---- */
var b = UI.signal(0), runs = 0, last = null;
var dispose = UI.effect(function () { runs++; last = b(); });
ok("effect: runs once immediately", runs === 1 && last === 0);
b.set(5);
ok("effect: re-runs when a dependency changes", runs === 2 && last === 5);
b.set(5);
ok("effect: a same-value set does not re-run", runs === 2);
dispose();
b.set(7);
ok("effect: a disposed effect stops", runs === 2);

/* ---- computed chain ---- */
var n = UI.signal(2);
var doubled = UI.computed(function () { return n() * 2; });
var plusOne = UI.computed(function () { return doubled() + 1; });
ok("computed: derives from a signal", doubled() === 4 && plusOne() === 5);
n.set(5);
ok("computed: a chain re-derives when the root changes", doubled() === 10 && plusOne() === 11);
var computes = 0;
var watched = UI.computed(function () { computes++; return n() * 3; });
watched(); watched();
ok("computed: is lazy and cached between reads", computes === 1);
n.set(6);
ok("computed: invalidates on change", watched() === 18 && computes === 2);
ok("computed: a consumer effect re-runs through the chain", (function () {
  var hits = 0;
  var d = UI.effect(function () { plusOne(); hits++; });
  n.set(7);
  var res = hits === 2;
  d();
  return res;
})());

/* ---- hyperscript + mount ---- */
var el = UI.h("div", { class: "box", id: "b1", "data-x": "1" }, UI.h("span", {}, "hi"), " tail");
ok("h: builds an element with class, id and attribute", el.className === "box" && el.id === "b1" && el.getAttribute("data-x") === "1");
ok("h: appends child elements and text", el.firstChild.tagName === "SPAN" && el.textContent === "hi tail");
var clicked = 0;
var btn = UI.h("button", { onClick: function () { clicked++; } }, "go");
btn.dispatchEvent(new dom.window.Event("click"));
ok("h: binds an on* handler", clicked === 1);
var host = dom.window.document.getElementById("app");
UI.mount(el, host);
ok("mount: attaches to a parent", host.firstChild === el);
var t = UI.text(a);
UI.effect(function () { /* keep a tracked */ });
ok("text: is a text node bound to a signal", t.nodeType === 3 && t.nodeValue === "9");

/* ---- keyed list ---- */
var A = { id: 1, t: "a" }, B = { id: 2, t: "b" }, C = { id: 3, t: "c" };
var items = UI.signal([A, B, C]);
var list = UI.list(function () { return items(); }, function (x) { return x.id; }, function (x) { return UI.h("li", { "data-k": x.id }, x.t); });
function nodeOf(key) { return list.querySelector('[data-k="' + key + '"]'); }
var aNode = nodeOf(1), bNode = nodeOf(2), cNode = nodeOf(3);
ok("list: renders one node per item", list.children.length === 3);
items.set([C, A, B]);
ok("list: a reorder keeps the same nodes (keyed reuse)", nodeOf(1) === aNode && nodeOf(2) === bNode && nodeOf(3) === cNode);
ok("list: a reorder puts them in the new order", list.children[0] === cNode && list.children[1] === aNode && list.children[2] === bNode);
items.set([C, A, B, { id: 4, t: "d" }]);
ok("list: an added item gets a new node", list.children.length === 4 && nodeOf(4).textContent === "d");
var A2 = { id: 1, t: "A" };
items.set([C, A2, B, { id: 4, t: "d" }]);
ok("list: a changed item re-renders in place", nodeOf(1) !== aNode && nodeOf(1).textContent === "A" && nodeOf(3) === cNode);
items.set([C, B]);
ok("list: a removed item's node is removed", list.children.length === 2 && nodeOf(1) === null);

/* ---- events / bus ---- */
var bus = UI.bus(), got = null;
bus.on("ping", function (d) { got = d; });
bus.emit("ping", 42);
ok("bus: on + emit deliver a value", got === 42);

/* ---- form binding ---- */
var name = UI.signal("start");
var input = UI.bind(name);
ok("bind: the input starts at the signal value", input.value === "start");
input.value = "typed";
input.dispatchEvent(new dom.window.Event("input"));
ok("bind: typing writes back to the signal", name() === "typed");
name.set("from code");
ok("bind: a signal write updates the input", input.value === "from code");

/* ---- router ---- */
var win = dom.window;
win.location.hash = "#/active";
var r = UI.router({ window: win, fallback: "all" });
ok("router: reads the current hash", r.route() === "active");
win.location.hash = "#/completed";
win.dispatchEvent(new win.Event("hashchange"));
ok("router: a hashchange updates the route signal", r.route() === "completed" && !r.is("active"));

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
