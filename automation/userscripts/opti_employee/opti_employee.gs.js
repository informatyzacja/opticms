function firstFunction() {
  console.log(main());
}

function getRows(data) {
  const [names, ...rows] = data;

  return rows.map((row) =>
    Object.fromEntries(row.map((value, i) => [names[i], value])),
  );
}

function fixMissingDepartments(rows) {
  let lastDepartment = null;

  for (const row of rows) {
    if (row['Wydział'] == '') row['Wydział'] = lastDepartment;

    lastDepartment = row['Wydział'];
  }
}

function remapRow(row) {
  const res = {
    firstname: '',
    lastname: '',
    image: '',
    description: '',
    linkedin_link: '',
    fb_link: '',
    url: '',
    email: '',
    phone: '',
  };

  for (const [name, value] of Object.entries(row)) {
    const trimmedValue = `${value}`.trim();

    switch (name) {
      case 'Imię':
        res.firstname = trimmedValue;
        break;
      case 'Nazwisko':
        res.lastname = trimmedValue;
        break;
      case 'Nr telefonu':
        res.phone = trimmedValue;
        break;
      case 'Adres e-mail':
        res.email = trimmedValue;
        break;
      case 'Funkcja':
        res.description = trimmedValue;
        break;
      case 'Nazwa zdjęcia na stronę':
        if (trimmedValue !== '') {
          res.image = trimmedValue;
        }
        break;
      case 'Wydział':
        if (res.image === '') {
          res.image = imageFromDepartment(trimmedValue);
        }
        break;
      case 'Czy powinien być na stronie':
        if (trimmedValue === 'Nie') {
          return null;
        }
        break;
      default:
        console.error('Unknown column', name, ':', trimmedValue);
    }
  }

  return res;
}

function showJson(json) {
  const html = `<!doctype html><html><body><pre>${JSON.stringify(
    json,
    null,
    4,
  ).replace(/</g, '&lt;')}</pre></body></html>`;

  const htmlOutput = HtmlService.createHtmlOutput(html);

  SpreadsheetApp.getUi().showModelessDialog(
    htmlOutput,
    'Aktualizacja Opticmsa',
  );
}

/**
 * Open a URL in a new tab. - https://stackoverflow.com/a/47098533
 */
function showAnchor(name, url) {
  const html = `<html><body><a href="${url}" target="_blank" onclick="google.script.host.close()">${name}</a></body></html>`;
  const htmlOutput = HtmlService.createHtmlOutput(html);

  SpreadsheetApp.getUi().showModelessDialog(
    htmlOutput,
    'Aktualizacja Opticmsa',
  );
}

// https://stackoverflow.com/a/69015165/3105260
function openUrl(url) {
  const html = `
    <html>
      <a id='url' href="${url}" target="_blank">Click here</a>
      <script>
        var winRef = window.open("${url}");
        winRef ? google.script.host.close() : window.alert('Zezwól na otwieranie popup-ów przez tą witrynę w przeglądarce');
      </script>
    </html>`;

  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(250)
    .setHeight(300);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Aktualizacja Opticmsa');
  // https://developers.google.com/apps-script/reference/base/ui#showModalDialog(Object,String)  Requires authorization with this scope: https://www.googleapis.com/auth/script.container.ui  See https://developers.google.com/apps-script/concepts/scopes#setting_explicit_scopes
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
    openUrl(data);
  } else {
    SpreadsheetApp.getUi().alert(data);
  }
}

function menuItemShow() {
  main(true);
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

function main(showPrettyJson) {
  const spreadsheet = SpreadsheetApp.getActiveSheet();
  const values = spreadsheet.getDataRange().getValues();

  let url = null;

  if (values[0][0].toLowerCase() === 'url') {
    url = values[0][1];

    console.log('[!] URL found:', url);
  }

  const rows = getRows(values.slice(url !== null ? 1 : 0));

  console.log(rows);

  console.log(`all rows length=${rows.length}, first row:`, rows[0]);

  fixMissingDepartments(rows);

  const mappedRows = [];

  for (const row of rows) {
    const mappedRow = remapRow(row);

    if (
      mappedRow !== null &&
      mappedRow.firstname !== '' &&
      mappedRow.lastname !== ''
    ) {
      mappedRows.push(mappedRow);
    }
  }

  if (showPrettyJson) {
    showJson(mappedRows);

    return;
  }

  if (url !== null) {
    return `${url}#opticms-automation=${encodeURIComponent(
      JSON.stringify(mappedRows),
    )}`;
  } else {
    return JSON.stringify(mappedRows, null, 4);
  }
}
