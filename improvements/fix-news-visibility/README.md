# Fix News Visibility

Poniższy kod służy do naprawienia niewyświetlających się aktualności na stronie głównej.

## Konfiguracja
Do działania wymagane jest zrealizowanie instrukcji w ogólnym [README](..).

## Kod

```html
<script>
  window.addEventListener("load", () => {
    const loadMoreNews = document.getElementById("loadMoreNews");
    if (loadMoreNews !== null) {
      loadMoreNews.click();
    }

    const newsTags = document.getElementsByClassName("news-tags");
    if (newsTags !== undefined && newsTags !== null && newsTags.length > 0) {
      newsTags[0].children[0].click();
      newsTags[0].children[0].click();
    }
  });
</script>
```
