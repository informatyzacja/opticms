# opti_employee

Userscript który finalnie będzie synchronizował osoby na stronie SSPWr z bazą danych w arkuszu Google.

![](.images/employee_actions.png)

## Przykładowe wejście do promptu

Jak na razie skrypt nie synchronizuje się z arkuszem googla, co jest celowym założeniam, dla testu można używać jsona o wyglądzie:

```json
[
  {
    "firstname": "Adam",
    "lastname": "Kowalski",
    "image": "miniatura-w1.png",
    "description": "Przewodniczący",
    "linkedin_link": "",
    "fb_link": "",
    "url": "",
    "email": "adam.kowalski@pwr.edu.pl",
    "phone": ""
  },
  {
    "firstname": "Jan",
    "lastname": "Nowak",
    "image": "miniatura-w8.png",
    "description": "",
    "linkedin_link": "",
    "fb_link": "",
    "url": "",
    "email": "jan.nowak@pwr.edu.pl",
    "phone": ""
  },
  {
    "firstname": "Anatolia",
    "lastname": "Wójcik",
    "image": "miniaturka_w2_nowa.png",
    "description": "",
    "linkedin_link": "",
    "fb_link": "",
    "url": "",
    "email": "",
    "phone": 500123456
  },
  {
    "firstname": "Maciej",
    "lastname": "Krawczyk",
    "image": "miniatura-w1.png",
    "description": "Członek",
    "linkedin_link": "",
    "fb_link": "",
    "url": "",
    "email": "",
    "phone": ""
  },
  {
    "firstname": "Adam",
    "lastname": "Nowakowski",
    "image": "miniatura-w5.png",
    "description": "",
    "linkedin_link": "",
    "fb_link": "",
    "url": "",
    "email": "",
    "phone": ""
  }
]
```
