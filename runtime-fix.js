(() => {
  "use strict";

  const originalQuerySelector = Document.prototype.querySelector;
  const originalQuerySelectorAll = Document.prototype.querySelectorAll;

  // Compatibility layer for a few legacy CODEX! calls that used $().forEach()
  // where $$().forEach() was intended.
  const multiSelectors = new Set([
    ".pig-key",
    "#brComposer button",
    "#brSequence [data-idx]",
    ".br-ref-item"
  ]);

  Document.prototype.querySelector = function(selector) {
    if (multiSelectors.has(selector)) {
      return originalQuerySelectorAll.call(this, selector);
    }
    return originalQuerySelector.call(this, selector);
  };
})();
