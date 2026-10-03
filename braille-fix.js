(() => {
  "use strict";

  const originalQuerySelector = Document.prototype.querySelector;
  const originalQuerySelectorAll = Document.prototype.querySelectorAll;
  const brailleMultiSelectors = new Set([
    "#brComposer button",
    "#brSequence [data-idx]",
    ".br-ref-item"
  ]);

  Document.prototype.querySelector = function(selector) {
    if (brailleMultiSelectors.has(selector)) {
      return originalQuerySelectorAll.call(this, selector);
    }
    return originalQuerySelector.call(this, selector);
  };
})();
