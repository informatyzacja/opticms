function firstFunction() { console.log(main()); }

/**
 * Open a URL in a new tab. - https://stackoverflow.com/a/47098533
 */
function showAnchor(name,url) {
  var html = '<html><body><a href="'+url+'" target="blank" onclick="google.script.host.close()">'+name+'</a></body></html>';
  var ui = HtmlService.createHtmlOutput(html)
  SpreadsheetApp.getUi().showModelessDialog(ui, "Aktualizacja Opticmsa");
}
//function b64_to_utf8( str ) {
//  return decodeURIComponent(escape(atob( str )));
//}

// https://stackoverflow.com/a/69015165/3105260
function openUrl(url) {
  Logger.log('openUrl. url: ' + url);
  const html = `<html>
<a id='url' href="${url}">Click here</a>
  <script>
     var winRef = window.open("${url}");
     winRef ? google.script.host.close() : window.alert('Zezwól na otwieranie popup-ów przez tą witrynę w przeglądarce') ;
     </script>
</html>`; 
  Logger.log('openUrl. html: ' + html);
  var htmlOutput = HtmlService.createHtmlOutput(html).setWidth( 250 ).setHeight( 300 );
  Logger.log('openUrl. htmlOutput: ' + htmlOutput);
  SpreadsheetApp.getUi().showModalDialog( htmlOutput, 'Aktualizacja Opticmsa'); 
  // https://developers.google.com/apps-script/reference/base/ui#showModalDialog(Object,String)  Requires authorization with this scope: https://www.googleapis.com/auth/script.container.ui  See https://developers.google.com/apps-script/concepts/scopes#setting_explicit_scopes
}

function showJson(json) {
  var html = '<!doctype html><html><body><pre>' + JSON.stringify(json, null, 4).replace(/</g, '&lt;') + '</pre></body></html>';
  var ui = HtmlService.createHtmlOutput(html)
  SpreadsheetApp.getUi().showModelessDialog(ui, "Aktualizacja Opticmsa");
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('Aktualizacja Opticmsa')
      .addItem('Aktualizuj', 'menuItemUpdate')
      .addItem('Pokaż dane JSON', 'menuItemShow')
      .addToUi();
}

function menuItemUpdate() {
  let data = main();
  if(data.startsWith('https://')) {
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
  let rows = data.splice(1).map(row => {
    let objRow = {};
    row.forEach((value, i) => {
      let name = names[i];
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

  if(department == "rfss1") department = "w14";
  if(department == "rfss2") department = "w15";
  if(department == "rfss3") department = "w16";

  if(["w4", "w8"].includes(department)) {
    department += "n";
  }

  return `miniatura-${department}.png`;
}

function remapRow(row) {
  var res = {
    "firstname": "",
    "lastname": "",
    "image": "",
    "description": "",
    "linkedin_link": "",
    "fb_link": "",
    "url": "",
    "email": "",
    "phone": ""
  };
  for(let name in row) {
    let val = row[name];
    val = `${val}`.trim();

    if(name == "Imię") res.firstname = val;
    else if(name == "Nazwisko") res.lastname = val;
    else if(name == "Nr telefonu") res.phone = val;
    else if(name == "Adres e-mail") res.email = val;
    else if(name == "Funkcja") res.description = val;
    else if(name == "Nazwa zdjęcia na stronę") {
      if(val != "") res.image = val;
    } else if(name == "Wydział") { 
      if(res.image == "") res.image = imageFromDepartment(val);
    } else if(name == "Lp." || name == "Lp") {}
    else if(name == "Nr indeksu") {}
    else if(name == "Czy powinien być na stronie" && val == "Tak") {}
    else if(name == "Czy powinien być na stronie" && val == "Nie") {return null;}
    else if(name == "Komisja Parlamentarna" || name == "Telefon" || name == "Prawo głosu") {}
    else {
      console.error("Unknown column", name, ":", val);
    }
  }
  return res;
}

function fixMissingDepartments(rows) {
  let lastDepartment = null;
  rows.forEach((val, ind) => {
    if(val["Wydział"] == "")
      val["Wydział"] = lastDepartment;
    lastDepartment = val["Wydział"];
  });
}

function main(showPrettyJson) {
  let spreadsheet = SpreadsheetApp.getActiveSheet();
  let values = spreadsheet.getDataRange().getValues();
  let url = null;
  if(values[0][0].toLowerCase() == 'url') {
    url = values[0][1];
    console.log('[!] URL found:', url);
    values = values.splice(1);
  }

  let rows = getRows(values);

  console.log(rows);


  console.log(`all rows length=${rows.length}, first row:`, rows[0]);

  fixMissingDepartments(rows)

  let mappedRows = rows.map(remapRow)
    .filter(row => row != null)
    .filter(row => row.firstname != "" && row.lastname != "");

  if(showPrettyJson) {
    showJson(mappedRows);
    return;
  }

  if(url) {
    return `${url}#opticms-automation=${encodeURIComponent(JSON.stringify(mappedRows))}`;
  } else {
    return JSON.stringify(mappedRows, null, 4);
  }
}