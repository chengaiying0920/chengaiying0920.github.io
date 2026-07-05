(function () {
  const input = document.getElementById("markdown-file");
  const button = document.getElementById("load-markdown");
  const output = document.getElementById("markdown-content");
  const title = document.getElementById("reader-title");

  function getFileFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("file") || input.value;
  }

  function normalizePath(path) {
    return path.replace(/^\/+/, "").replace(/\.\./g, "");
  }

  async function loadMarkdown(path) {
    const file = normalizePath(path || "docs/sample.md");
    input.value = file;
    output.innerHTML = "<p>正在读取 Markdown...</p>";

    try {
      const response = await fetch("/" + file, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      const markdown = await response.text();
      title.textContent = file;
      if (window.marked) {
        output.innerHTML = window.marked.parse(markdown);
      } else {
        const fallback = document.createElement("pre");
        fallback.textContent = markdown;
        output.replaceChildren(fallback);
      }
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("file", file);
      window.history.replaceState({}, "", nextUrl);
    } catch (error) {
      output.innerHTML = "<p>无法读取该 Markdown 文件，请确认路径存在并已提交到仓库。</p>";
    }
  }

  button.addEventListener("click", function () {
    loadMarkdown(input.value);
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      loadMarkdown(input.value);
    }
  });

  window.addEventListener("DOMContentLoaded", function () {
    loadMarkdown(getFileFromUrl());
  });
})();
