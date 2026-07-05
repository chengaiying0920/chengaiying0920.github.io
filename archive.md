---
layout: page
title: 归档
permalink: /archive/
---

{% assign current_year = "" %}

<div class="archive-list">
  {% for post in site.posts %}
    {% assign post_year = post.date | date: "%Y" %}
    {% if post_year != current_year %}
      {% unless forloop.first %}
        </div>
      </section>
      {% endunless %}
      <section class="archive-year">
        <h2>{{ post_year }}</h2>
        <div class="mini-post-list">
      {% assign current_year = post_year %}
    {% endif %}
          <a href="{{ post.url | relative_url }}">
            <span>{{ post.title }}</span>
            <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%m-%d" }}</time>
          </a>
    {% if forloop.last %}
        </div>
      </section>
    {% endif %}
  {% else %}
    <p>还没有文章。</p>
  {% endfor %}
</div>
