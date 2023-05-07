function firstFunction() { console.log(main()); }

/**
 * Open a URL in a new tab. - https://stackoverflow.com/a/47098533
 */
function showAnchor(name, url) {
  const html = `<html><body><a href="${url}" target="blank" onclick="google.script.host.close()">${name}</a></body></html>`;
  const ui = HtmlService.createHtmlOutput(html);

  SpreadsheetApp.getUi().showModelessDialog(ui, 'Aktualizacja Opticmsa');
}
//function b64_to_utf8( str ) {
//  return decodeURIComponent(escape(atob( str )));
//}

// https://stackoverflow.com/a/69015165/3105260
function openUrl(url) {
  Logger.log(`openUrl. url: ${url}`);

  const html = `<html>
<a id='url' href="${url}">Click here</a>
  <script>
     var winRef = window.open("${url}");
     winRef ? google.script.host.close() : window.alert('Zezwól na otwieranie popup-ów przez tą witrynę w przeglądarce') ;
     </script>
</html>`;

  Logger.log(`openUrl. html: ${html}`);

  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(250).setHeight(300);

  Logger.log(`openUrl. htmlOutput: ${htmlOutput}`);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Aktualizacja Opticmsa');
  // https://developers.google.com/apps-script/reference/base/ui#showModalDialog(Object,String)  Requires authorization with this scope: https://www.googleapis.com/auth/script.container.ui  See https://developers.google.com/apps-script/concepts/scopes#setting_explicit_scopes
}

function showJson(json) {
  const html = '<!doctype html><html><body><pre>' + JSON.stringify(json, null, 4).replace(/</g, '&lt;') + '</pre></body></html>';
  const ui = HtmlService.createHtmlOutput(html);

  SpreadsheetApp.getUi().showModelessDialog(ui, 'Aktualizacja Opticmsa');
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  // Or DocumentApp or FormApp.
  ui.createMenu('Aktualizacja Opticmsa')
    .addItem('Aktualizuj', 'menuItemUpdate')
    .addItem('Pokaż dane JSON', 'menuItemShow')
    .addToUi();
}

function menuItemUpdate() {
  const data = main();

  if (data.startsWith('https://')) {
    //showAnchor('aktualizuj', data);
    openUrl(data);
  } else {
    SpreadsheetApp.getUi().alert(data);
  }
}

function menuItemShow() {
  main(true);
}

function getRows(data) {
  const names = data[0];

  const rows = data.splice(1).map(row => {
    let objRow = {};

    row.forEach((value, i) => {
      const name = names[i];
      objRow[name] = value;
    });

    return objRow;
  });

  return rows;
}

/*
  opticms script requires: {
    "firstname": "Adam",
    "lastname": "Kowalski",
    "image": "miniatura-w1.png",
    "description": "Przewodniczący",
    "linkedin_link": "",
    "fb_link": "",
    "url": "",
    "email": "adam.kowalski@pwr.edu.pl",
    "phone": ""
  }
*/

function imageFromDepartment(department) {
  // get rid of '-'
  department = department.replace(/-/g, '');

  // get rid of everything after department number
  department = department.replace(/^(\D*\d*).*$/, '$1');

  department = department.toLowerCase();

  switch (department) {
    case 'w1':
      return 'w1_nowe.jpg';
    case 'w2':
      return 'miniatura-w2.png';
    case 'w3':
      return 'miniatura-w3.png';
    case 'w4':
    case 'w4n':
      return 'miniatura-w4n.png';
    case 'w5':
      return 'miniatura-w5.png';
    case 'w6':
      return 'miniatura-w6.png';
    case 'w7':
      return 'miniatura-w7.png';
    case 'w8':
    case 'w8n':
      return 'miniatura-w8n.png';
    case 'w9':
      return 'miniatura-w9.png';
    case 'w10':
      return 'miniatura-w10.png';
    case 'w11':
      return 'miniatura-w11.png';
    case 'w12':
    case 'w12n':
      return 'miniatura-w12.png';
    case 'w13':
      return 'miniatura-w13.png';
    case 'rfss1':
      return 'miniatura-w14.png';
    case 'rfss2':
      return 'miniatura-w15.png';
    case 'rfss3':
      return 'miniatura-w16.png';
    default:
      return 'miniatura-w16.png'; // on error xd
  }
}

function remapRow(row) {
  let res = {
    'firstname': '',
    'lastname': '',
    'image': '',
    'description': '',
    'linkedin_link': '',
    'fb_link': '',
    'url': '',
    'email': '',
    'phone': ''
  };

  for (const name in row) {
    const value = `${row[name]}`.trim();

    if (name == 'Imię') res.firstname = value;
    else if (name == 'Nazwisko') res.lastname = value;
    else if (name == 'Nr telefonu') res.phone = value;
    else if (name == 'Adres e-mail') res.email = value;
    else if (name == 'Funkcja') res.description = value;
    else if (name == 'Nazwa zdjęcia na stronę') {
      if (value != '') res.image = value;
    } else if (name == 'Wydział') {
      if (res.image == '') res.image = imageFromDepartment(value);
    } else if (name == 'Lp.' || name == 'Lp') { }
    else if (name == 'Nr indeksu') { }
    else if (name == 'Czy powinien być na stronie' && value == 'Tak') { }
    else if (name == 'Czy powinien być na stronie' && value == 'Nie') { return null; }
    else if (name == 'Komisja Parlamentarna' || name == 'Telefon' || name == 'Prawo głosu') { }
    else {
      console.error('Unknown column', name, ':', value);
    }
  }

  return res;
}

function fixMissingDepartments(rows) {
  let lastDepartment = null;

  rows.forEach((value, index) => {
    if (value['Wydział'] == '')
      value['Wydział'] = lastDepartment;

    lastDepartment = value['Wydział'];
  });
}

function main(showPrettyJson) {
  const spreadsheet = SpreadsheetApp.getActiveSheet();
  let values = spreadsheet.getDataRange().getValues();

  let url = null;

  if (values[0][0].toLowerCase() == 'url') {
    url = values[0][1];

    console.log('[!] URL found:', url);

    values = values.splice(1);
  }

  const rows = getRows(values);

  console.log(rows);

  console.log(`all rows length=${rows.length}, first row:`, rows[0]);

  fixMissingDepartments(rows);

  const mappedRows = rows.map(remapRow)
    .filter(row => row != null)
    .filter(row => row.firstname != '' && row.lastname != '');

  if (showPrettyJson) {
    showJson(mappedRows);

    return;
  }

  if (url !== null) {
    return `${url}#opticms-automation=${encodeURIComponent(JSON.stringify(mappedRows))}`;
  } else {
    return JSON.stringify(mappedRows, null, 4);
  }
}
