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
- 普通 Markdown 页面也可以直接放在仓库中，只要文件顶部包含 Front Matter，就会被 GitHub Pages 渲染成网页。

推送到 `main` 分支后，GitHub Actions 会构建并发布到 GitHub Pages。

## 评论

博客文章已经接入 giscus 评论模板。启用步骤：

1. 在仓库 `Settings -> Features` 打开 Discussions。
2. 安装 giscus GitHub App，并授权给 `chengaiying0920/chengaiying0920.github.io`。
3. 打开 `https://giscus.app/zh-CN`，选择仓库和 Discussion 分类，复制生成的 `data-category-id`。
4. 把 `_config.yml` 中 `giscus.category_id` 填好，并把 `giscus.enabled` 改成 `true`。

之后每篇 `_posts/` 文章底部都会显示评论区；单篇文章可以在 Front Matter 里设置 `comments: false` 关闭评论。
