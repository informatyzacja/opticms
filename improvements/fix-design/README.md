# Fix Design

Poniższy kod służy do naprawienia nieczytelnego wyglądu strony (w miarę możliwości).

## Konfiguracja
Do działania wymagane jest zrealizowanie instrukcji w ogólnym [README](..).

## Kod

```html
<style>
  @media (min-width:1025px) {
    header.top {
      height: auto;
    }

    header.top .logo {
      height: auto;
      margin-bottom: 20px;
      line-height: 0;
    }

    .menu-cont {
      margin-top: 16px;
      margin-bottom: 0;
    }
  }

  .slide-content .button {
    background-color: white;
    color: black !important;
  }

  .slide-content .button:hover {
    color: white !important;
  }

  .button.news {
    background-color: white;
    font-weight: 600 !important;
  }

  .footer {
    color: black;
  }

  .footer .column-content {
    color: black;
  }

  .footer h3 {
    color: black;
  }

  .footer .row.columns a {
    color: black;
  }

  .footer .button {
    background-color: white;
    color: black !important;
  }

  .footer .button:hover {
    color: white !important;
  }

  .person-basic-info {
    word-wrap: normal;
      text-shadow: 0px 4px 3px rgba(0,0,0,0.4),
              0px 8px 13px rgba(0,0,0,0.1),
              0px 18px 23px rgba(0,0,0,0.1);
  }

  .person-basic-info .desc {
    font-size: 1.2em;
    font-weight: 600;
  }
</style>
```
