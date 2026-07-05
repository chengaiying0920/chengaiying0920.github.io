(function () {
  const storagePrefix = "blog:view:";

  function normalizePath(path) {
    const url = new URL(path, window.location.origin);
    let normalized = url.pathname;
    if (!normalized.endsWith("/")) {
      normalized += "/";
    }
    return normalized;
  }

  function readCount(path) {
    const value = window.localStorage.getItem(storagePrefix + normalizePath(path));
    return Number.parseInt(value || "0", 10);
  }

  function writeCount(path, count) {
    window.localStorage.setItem(storagePrefix + normalizePath(path), String(count));
  }

  function renderCounts() {
    document.querySelectorAll("[data-view-path]").forEach(function (node) {
      const countNode = node.querySelector(".view-count");
      if (countNode) {
        countNode.textContent = String(readCount(node.dataset.viewPath));
      }
    });
  }

  function incrementCurrentPost() {
    const node = document.querySelector("[data-current-post]");
    if (!node) {
      return;
    }
    const path = node.dataset.currentPost;
    writeCount(path, readCount(path) + 1);
  }

  incrementCurrentPost();
  renderCounts();
})();
