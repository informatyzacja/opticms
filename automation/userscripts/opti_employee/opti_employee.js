// ==UserScript==
// @name        opti_employee
// @namespace   Komisja ds. Informatyzacji
// @description OptiCMS employee list automation
// @author      Komisja ds. Informatyzacji
// @version     0.1.0
// @match       https://samorzad.pwr.edu.pl/panel/employers/*
// @run-at      document-start
// @grant       GM.getValue
// @grant       GM.setValue
// @homepageURL https://github.com/informatyzacja/opticms/tree/main/automation/userscripts/opti_employee
// @supportURL  https://github.com/informatyzacja/opticms/issues
// @downloadURL https://raw.githubusercontent.com/informatyzacja/opticms/main/automation/userscripts/opti_employee/opti_employee.js
// ==/UserScript==

let config = {};

async function getValue(name, def) {
  return await GM.getValue(name, def);
}

async function setValue(name, val) {
  return await GM.setValue(name, val);
}

class State {
  constructor(gmValue) {
    let obj = {};
    try {
      obj = JSON.parse(gmValue);
    } catch {}
    this.toAdd = obj.toAdd || [];
    this.toCheck = obj.toCheck || [];
    this.toDelete = obj.toDelete || [];
    this.order = obj.order || [];
    this.goBackFromNextSort = obj.goBackFromNextSort || false;
    this.setToCheck = obj.setToCheck || false;
    this.log = obj.log || [];
  }

  workingOn() {
    const { toCheck, toAdd, toDelete, order, log } = this;

    if (toCheck.length > 0) return 'checking';
    if (toAdd.length > 0) return 'adding';
    if (toDelete.length > 0) return 'deleting';
    if (order.length > 0) return 'setting-order';
    if (log.length > 0) return 'displaying-log';

    return 'idle';
  }

  async save() {
    console.log('Saving state: ', JSON.stringify(this, true, 2));
    await setValue('grease-opticms-state', JSON.stringify(this));
  }
}

let state = null;

async function log(str) {
  console.log('[log]', str);
  state.log.push(str);
  await state.save();
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function displayLog() {
  const d = document.createElement('div');
  const { log } = state;

  d.className = 'module-body corner-all';
  d.style.marginTop = '1em';
  d.style.marginBottom = '1em';
  d.innerHTML = `
    <div class="module-content">
      <h3 class="grid-header">Raport: zmiany wprowadzone przez skrypt</h3>
      ${log
        .map(escapeHtml)
        .map((text) => `<li>${text}</li>`)
        .join('\n')}
    </div>
  `;

  const container = document.querySelector(
    '#dashboard > .wrap-fluid > .container-fluid',
  );

  container.insertBefore(d, container.children[2]);

  state.log = [];
  await state.save();
}

async function waitForSelector(selector) {
  let element = document.querySelector(selector);

  if (element) {
    return element;
  }

  return new Promise((resolve, reject) => {
    let observer = new MutationObserver((mutations) => {
      let element = document.querySelector(selector);

      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
}

function waitForTruthyValue(something) {
  return new Promise((resolve, reject) => {
    let firstTry = something();

    if (firstTry) {
      resolve(firstTry);
      return;
    }

    let intervalId = setInterval(function () {
      let res = something();

      if (res) {
        resolve(res);
        clearInterval(intervalId);
      }
    }, 75);
  });
}

function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), ms);
  });
}

function pressEnter(element) {
  element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
}

function initToCheck() {
  return [
    ...new Set(
      Array.from(
        document.querySelectorAll('a[href^="/panel/employers/edit/page_id/"]'),
        (el) => el.href,
      ),
    ),
  ];
}

async function addMultipleClickedValues(toAdd) {
  let arr = [];

  try {
    arr = JSON.parse(toAdd);

    if (!Array.isArray(arr)) throw new Error();

    state.order = arr.map(({ firstname, lastname }) => ({
      firstname,
      lastname,
    }));

    // Reverse so .pop() returns elements from the begging
    arr.reverse();
  } catch {
    alert('[!!] not a valid JSON');
    return;
  }

  addOverlay();

  // const employerLinks = Array.from(
  //   document.querySelectorAll('a[href^="/panel/employers/edit/page_id/"]'),
  // ).map((el) => el.href);

  // const uniqueEmployerLinks = [...new Set(employerLinks)];

  state.toAdd = arr;
  state.setToCheck = true;
  // state.toCheck = uniqueEmployerLinks;
  state.toDelete = [];

  await state.save();

  // reset search first
  const resetButton = document.querySelector(
    '.module-content input.grid-reset[type=button]',
  );
  resetButton.click(); // redirects

  //nextPageInFlow();
  //document.location = `/panel/employers/add/page_id/${config.pageId}/?seq`;
}

async function addMultipleClicked() {
  const toAdd = prompt('json with people');

  return await addMultipleClickedValues(toAdd);
}

async function ensureNoListView() {
  const btn = await waitForSelector(
    'span.elfinder-button-icon.elfinder-button-icon-view',
  );

  if (!btn.classList.contains('elfinder-button-icon-view-list')) {
    console.log('[!!] switching away from list view');
    btn.click();

    await wait(400);
  }
}

function clickThenDoubleClick(el) {
  el.click();

  const doubleClickEvent = new MouseEvent('dblclick', {
    bubbles: true,
    cancelable: true,
    view: window,
  });

  el.dispatchEvent(doubleClickEvent);
}

async function pageEmployeesSetImage(image) {
  const photosOpenButton = document.querySelector('#photos_open');
  photosOpenButton.click();

  // wait for file manager to open
  await waitForSelector('#filemanagerphotos_open .elfinder-navbar-wrapper');
  await wait(100);

  console.log('[!!] file manager window is open');

  await ensureNoListView();

  const searchBar = document.querySelector(
    '.elfinder-button-search input[type="text"]',
  );
  const searchButton = document.querySelector(
    '.elfinder-button-search .ui-icon-search',
  );

  searchBar.value = image;
  searchButton.click();

  const statusWindowSelector =
    '.elfinder-dialog-icon.elfinder-dialog-icon-search';

  // wait for the "Searching..." window to come up
  console.log(
    `[!!] Searched for '${image}' - waiting for the "Searching..." window to come up`,
  );

  await waitForSelector(statusWindowSelector);

  // wait for the window to disappear
  console.log(
    `[!!] Searched for '${image}' - waiting for the "Searching..." window to close`,
  );

  const waitForElementToDisappear = () =>
    document.querySelector(statusWindowSelector) ? null : true;

  await waitForTruthyValue(waitForElementToDisappear);

  console.log(`[!!] Window closed - waiting for the results view`);

  const elfinderCwdViewIcons = await waitForSelector(
    '.elfinder-cwd-view-icons',
  );

  console.log(
    `[!!] Results view obtained (with ${
      [...elfinderCwdViewIcons.children].length
    } children)`,
  );

  const files = elfinderCwdViewIcons.querySelectorAll(
    'div.element:not(.directory)',
  );

  if (files.length === 0) {
    console.warn(`[!!] Could not find any file with name '${image}'`);
    alert(`Nie znaleziono zdjecia '${image}'!`);
    return;
  }

  console.log(`[!!] Found a file for ${image} - double clicking`);

  clickThenDoubleClick(files[0]);

  // Wait for the photo to show up
  console.log(`[!!] Waiting for the photo to show up`);

  await waitForSelector('#photos_photos > div.element');

  console.log(`[!!] Done setting image`);
}

function readableName(name) {
  const names = {
    firstname: 'imię',
    lastname: 'nazwisko',
    image: 'zdjęcie',
    description: 'opis',
    linkedin_link: 'link do Linkedin',
    fb_link: 'link do Facebooka',
    url: 'link do strony z opisem',
    email: 'email',
    phone: 'telefon',
  };

  return names[name] || name;
}

async function checkPublishedApproved(firstname, lastname) {
  const changes = [];

  const approvedCheckbox = document.querySelector(
    'input#approved[type=checkbox]',
  );
  if (approvedCheckbox && !approvedCheckbox.checked) {
    approvedCheckbox.checked = true;
    changes.push(`Zatwierdzone dla ${firstname} ${lastname}`);
  }

  const publishedCheckbox = document.querySelector(
    'input#published[type=checkbox]',
  );
  if (publishedCheckbox && !publishedCheckbox.checked) {
    publishedCheckbox.checked = true;
    changes.push(`Opublikowane dla ${firstname} ${lastname}`);
  }

  if (changes.length > 0) {
    await log(changes.join(', '));
    return true;
  } else {
    return false;
  }
}

async function pageEmployeesAdd() {
  const person = state.toAdd.pop();
  const inputs = Array.from(
    document.querySelectorAll('textarea.pwr-textarea, input.pwr-input'),
  );

  await log(`Dodano ${person.firstname} ${person.lastname}`);

  for (const input of inputs) {
    const { id } = input;
    input.value = person[id] || '';

    if (input.value && !['firstname', 'lastname'].includes(id)) {
      await log(
        `Dla ${person.firstname} ${person.lastname} ustawiono ${readableName(
          id,
        )} o wartości "${value}"`,
      );
    }
  }

  await checkPublishedApproved(person.firstname, person.lastname);
  await pageEmployeesSetImage(person.image);

  await state.save();

  await log(
    `Dla ${person.firstname} ${person.lastname} ustawiono zdjęcie "${person.image}"`,
  );

  document.querySelector('input.pwr-btn-submit').click();
}

async function pageEmployeesEdit() {
  if (
    !document.location.href.startsWith(state.toCheck[state.toCheck.length - 1])
  ) {
    console.warn(
      `[!!] Wrong location! '${document.location.href}' does not start with ` +
        `'${state.toCheck[state.toCheck.length - 1]}'`,
    );

    return;
  }

  let origUrl = state.toCheck.pop();
  //await state.save();
  // ^^^ DON'T SAVE YET - we might need to reload here if there's a wrong image already set

  let firstname = document.querySelector('#firstname.pwr-input').value;
  let lastname = document.querySelector('#lastname.pwr-input').value;

  //console.log(`Searching for ${firstname} ${lastname} in `, state.toAdd);
  const person = state.toAdd.filter(
    (person) => person.firstname == firstname && person.lastname == lastname,
  )[0];

  if (!person) {
    state.toDelete.push(origUrl);

    await state.save(); // save this and previous state.toCheck.pop() (!)

    let firstname = (
      document.querySelector('input#firstname.pwr-input') || { value: '???' }
    ).value;
    let lastname = (
      document.querySelector('input#lastname.pwr-input') || { value: '???' }
    ).value;

    await log(`Przeniesiono do kosza ${firstname} ${lastname}`);

    nextPageInFlow();

    return;
  }

  const oldImage = (
    document.querySelector('input[name="photos[0][name]"') || {}
  ).value;

  if (oldImage && oldImage != person.image) {
    // THIS IS A BIG HACK
    // NOT SAVING STATE DELIBERATERY - RETRY AGAIN BUT WITH THE ERROR AND NO IMAGE
    console.log(
      `[!!] detected a change in image - deleting the image and submitting to get an error`,
    );
    document.querySelector('#photos_photos span.delete').click();

    await wait(100);

    document.querySelector('input.pwr-btn-submit').click();

    return;
  }

  state.toAdd = state.toAdd.filter((p) => p != person);

  await state.save();
  // ^^^^^^^^^^^^^^  also saves state.toCheck.pop() from before

  let somethingChanged = false;

  let inputs = document.querySelectorAll(
    'textarea.pwr-textarea, input.pwr-input',
  );

  for (let input of inputs) {
    if (input.id == 'publisher') continue;

    let newValue = person[input.id] || '';

    if (newValue != input.value) {
      console.log(
        `[!!] detected a change in ${input.id} - from '${input.value}' to '${newValue}'`,
      );

      somethingChanged = true;
      await log(
        `Dla ${person.firstname} ${person.lastname} zmieniono ${readableName(
          input.id,
        )} z "${input.value}" na "${newValue}"`,
      );
      input.value = newValue;
    }
  }

  if (await checkPublishedApproved(person.firstname, person.lastname)) {
    console.log(`[!!] checked 'published' and/or 'approved'`);
    somethingChanged = true;
  }

  if (!oldImage /*(|| oldImage != person.image*/) {
    console.log(`[!!] detected a change in image - setting new image`);
    somethingChanged = true;
    // delete old photo
    //document.querySelector('#photos_photos span.delete').click()

    await wait(100);
    await pageEmployeesSetImage(person.image);
    await wait(100);

    console.log(`[!!] image set successfully`);

    await log(
      `Zmieniono zdjęcie ${person.firstname} ${person.lastname} na plik "${person.image}"`,
    );
  }

  //await state.save();

  if (somethingChanged) {
    const trySubmit = () => {
      console.log(
        `[!!] pressing the submit button repeatedly until the page lets us`,
      );
      document.querySelector('input.pwr-btn-submit').click();
    };

    trySubmit();
    setInterval(trySubmit, 200);
  } else {
    console.log(`[!!] going to the next page in flow`);
    nextPageInFlow();
  }
}

function pageEmployeesIndexAddButton() {
  let x = document.querySelector('#grid-form-grid_employers > div.grid-top');

  if (x != null) {
    console.log('[!!] inserting button');

    let button = document.createElement('a');

    button.classList = 'grid-button right tooltip';
    button.id = 'grease-grid-button-add-multiple';
    button.innerHTML =
      '<img src="/dashboard/themes/default/images/ico16x16' +
      '/plus.png" border="0" class="grid-ico" />Synchronizuj z bazą (userscript)';
    button.href = '#';
    button.onclick = addMultipleClicked;

    x.insertBefore(button, x.children[3]);
  }
}

function tryParseJsonArray(json, defaultValue) {
  try {
    let arr = JSON.parse(json);

    if (!Array.isArray(arr)) {
      return defaultValue;
    }

    return arr;
  } catch {
    return defaultValue;
  }
}

function goToNextToCheck() {
  const newLocation = state.toCheck[state.toCheck.length - 1];

  document.location = `${newLocation}?seq`;
}

function nextPageInFlow() {
  const workingOn = state.workingOn();

  // let queueToAdd = tryParseJsonArray(await GM.getValue('opticms-to-add'), []);

  if (workingOn == 'checking') {
    goToNextToCheck();
  } else if (workingOn == 'adding') {
    // continue adding people
    document.location = `/panel/employers/add/page_id/${config.pageId}/?seq`;
  } else if (
    workingOn == 'deleting' ||
    workingOn == 'setting-order' ||
    workingOn == 'displaying-log' ||
    workingOn == 'idle'
  ) {
    document.location = `/panel/employers/index/page_id/${config.pageId}/`;
  }
}

async function deleteStage() {
  let rowsToDelete = [
    ...document.querySelectorAll('table#grid_employers.grid > tbody > tr'),
  ].filter((row) =>
    [...row.querySelectorAll('a')].some((a) => state.toDelete.includes(a.href)),
  );

  rowsToDelete.forEach(
    (rowToDelete) =>
      (rowToDelete.querySelector('input[name="check[]"]').checked = true),
  );

  console.log(`[!!] Deleting - checked ${rowsToDelete.length} checkboxes`);

  if (rowsToDelete.length == 0) {
    state.toDelete = [];
    await state.save();

    return;
  }

  document.querySelector('#grid-button-delete-all').click();

  let buttonSet = await waitForSelector('.ui-dialog-buttonset');
  let noAndYesButtons = [...buttonSet.querySelectorAll('button.ui-button')];

  if (noAndYesButtons.length != 2) {
    console.warn(
      `Amount of noAndYesButtons different from expected 2 (${noAndYesButtons.length})`,
    );
  }

  noAndYesButtons[1].click();

  state.toDelete = [];
  await state.save();

  await wait(300);
}

async function pageEmployeesIndexSetOrder() {
  let namesToId = [
    ...document.querySelectorAll('table#grid_employers.grid > tbody > tr'),
  ]
    .filter((row) => row.id.startsWith('grid-item-'))
    .map((row) => ({
      id: parseInt(row.id.replace(/^grid-item-/, ''), 10),
      lastname: row.children[1].innerText,
      firstname: row.children[2].innerText,
    }));

  console.log('[!!] namesToId ', JSON.stringify(namesToId, true, 2));

  let getId = (first, last) =>
    namesToId.filter(
      ({ id, lastname, firstname }) => lastname == last && firstname == first,
    )[0].id;

  let order;

  try {
    order = state.order
      .map(({ firstname, lastname }) => getId(firstname, lastname))
      .map((id) => `#${id}`)
      .join('');
  } catch (e) {
    console.warn(`[!!] Name/surname does not match with results on site`);

    throw e;
  }

  console.log(`[!!] Setting order by sending '${order}'`);

  let form = document.createElement('form');

  form.method = 'post';
  form.action = `https://samorzad.pwr.edu.pl/panel/employers/sort/page_id/${config.pageId}/`;

  let positions = document.createElement('input');

  positions.type = 'hidden';
  positions.name = 'positions';
  positions.value = order;

  form.append(positions);
  document.body.append(form);

  state.goBackFromNextSort = true;
  state.order = [];

  await state.save();

  form.submit();
}

async function pageEmployeesIndex() {
  pageEmployeesIndexAddButton();

  if (document.querySelector('#grid-select-perpage').value != '150') {
    console.log(`[!!] Setting perPage to 150`);
    document.location.pathname =
      document.location.pathname
        .replace(/\/perPage\/.*/, '')
        .replace(/\/*$/, '') + '/perPage/150';

    return;
  }

  if (state.setToCheck) {
    state.toCheck = initToCheck();
    state.setToCheck = false;
    console.log(
      `[!!] Initialised toCheck with ${state.toCheck.length} entries`,
    );

    await state.save();
  }

  if (['checking', 'adding'].includes(state.workingOn())) {
    nextPageInFlow();
  }

  if (state.workingOn() == 'deleting') {
    console.log(`[!!] Left to delete: ${state.toDelete}`);

    await deleteStage();
  }

  // deleting can go immediately to setting-order

  if (state.workingOn() == 'setting-order') {
    console.log(`[!!] Setting order`);

    await pageEmployeesIndexSetOrder();
    // will redirect to a different page - so return to not do anything else as it loads

    return;
  }

  if (state.workingOn() == 'displaying-log') {
    await displayLog();
  }
}

async function pageEmployeesSort() {
  if (state.goBackFromNextSort) {
    state.goBackFromNextSort = false;
    await state.save();
    await log(`Posortowano osoby w odpowiedniej kolejności`);

    nextPageInFlow();
  }
}

function addOverlay() {
  const d = document.createElement('div');

  d.style =
    'position:absolute; top:0; left:0; width:100%; height:100%; background-color:rgba(0, 0, 0, 0.5); z-index:10000000; margin-top: 0 auto';
  d.innerHTML =
    '<div style="display: flex;justify-content:center;align-items:center;width: 100%;color: white;height: 100%;font-size: 3em;"><span>Proszę czekać, trwa działanie skryptu</span></div>';
  document.body.append(d);
}

async function greasePageFullyLoaded() {
  if (document.location.hash.startsWith('#opticms-automation=')) {
    state = new State('{}');

    const decoded_toAdd_string = decodeURIComponent(
      document.location.hash.replace(/^#opticms-automation=/, ''),
    );

    console.log('[!!] loading state from URL hash:', decoded_toAdd_string);

    document.location.hash = '';

    await addMultipleClickedValues(decoded_toAdd_string);

    return;
  } else {
    state = new State(await getValue('grease-opticms-state', '{}'));
  }

  const hasSeqQuery = document.location.search
    .substring(1)
    .split('&')
    .includes('seq');

  if (document.location.pathname.startsWith('/panel/employers/')) {
    let [_0, _1, _2, pageName, stringPageId, pageId] =
      document.location.pathname.split('/');

    console.log(`pageName=${pageName}, pageId=${pageId}`);

    if (stringPageId != 'page_id') {
      console.warn("[!!] no 'page_id'");

      return;
    }

    config.pageId = pageId;

    if (
      !(state.workingOn() == 'displaying-log' || state.workingOn() == 'idle')
    ) {
      addOverlay();
    }

    if (pageName == 'index') {
      await pageEmployeesIndex();
    } else if (pageName == 'add' && hasSeqQuery) {
      await pageEmployeesAdd();
    } else if (pageName == 'edit' && hasSeqQuery) {
      await pageEmployeesEdit();
    } else if (pageName == 'sort') {
      await pageEmployeesSort();
    } else {
      console.warn('[!!] unknown path');
    }
  }
}

window.addEventListener('load', greasePageFullyLoaded, { once: true });
