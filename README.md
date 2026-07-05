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
- 笔记放在 `_notes/`，会自动发布到 `/notes/文件名/`。
- 普通 Markdown 页面也可以直接放在仓库中，只要文件顶部包含 Front Matter，就会被 GitHub Pages 渲染成网页。

推送到 `main` 分支后，GitHub Actions 会构建并发布到 GitHub Pages。
