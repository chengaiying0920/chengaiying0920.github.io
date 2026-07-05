---
layout: page
title: 笔记
permalink: /notes/
---

这里收集直接用 Markdown 编写的公开笔记。

<div class="link-list">
{% for note in site.notes %}
  <a href="{{ note.url | relative_url }}">{{ note.title }}</a>
{% endfor %}
</div>
