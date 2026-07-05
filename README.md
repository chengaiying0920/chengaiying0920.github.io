# Cheng Aiying Blog

这是一个基于 GitHub Pages 和 Jekyll 的个人博客。

## 本地预览

```bash
bundle install
bundle exec jekyll serve
```

打开 `http://127.0.0.1:4000`。

## 写作

- 新博客文章放在 `_posts/`，文件名格式为 `YYYY-MM-DD-title.md`。
- 笔记放在 `_notes/`，会自动发布到 `/notes/`。
- 任意公开 Markdown 文件可以放在 `docs/`，通过 `/reader/?file=docs/sample.md` 在站内渲染查看。

推送到 `main` 分支后，GitHub Actions 会构建并发布到 GitHub Pages。
