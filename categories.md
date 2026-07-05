---
layout: page
title: 分类
permalink: /categories/
---

{% assign sorted_tags = site.tags | sort %}

{% if sorted_tags.size > 0 %}
  <div class="taxonomy-nav">
    {% for tag in sorted_tags %}
      {% assign tag_name = tag[0] %}
      {% assign posts = tag[1] %}
      <a href="#{{ tag_name | slugify }}">{{ tag_name }} <span>{{ posts.size }}</span></a>
    {% endfor %}
  </div>

  <div class="taxonomy-list">
    {% for tag in sorted_tags %}
      {% assign tag_name = tag[0] %}
      {% assign posts = tag[1] %}
      <section id="{{ tag_name | slugify }}" class="taxonomy-section">
        <h2>{{ tag_name }}</h2>
        <div class="mini-post-list">
          {% for post in posts %}
            <a href="{{ post.url | relative_url }}">
              <span>{{ post.title }}</span>
              <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%Y-%m-%d" }}</time>
            </a>
          {% endfor %}
        </div>
      </section>
    {% endfor %}
  </div>
{% else %}
  <p>还没有可显示的分类。</p>
{% endif %}
