// ==UserScript==
// @name        opti_employee
// @namespace   Komisja ds. Informatyzacji
// @description OptiCMS employee list automation
// @author      Komisja ds. Informatyzacji
// @version     0.0.9
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
        try { obj = JSON.parse(gmValue); } catch {}
        this.toAdd = obj.toAdd || [];
        this.toCheck = obj.toCheck || [];
        this.toDelete = obj.toDelete || [];
        this.order = obj.order || [];
        this.goBackFromNextSort = obj.goBackFromNextSort || false;
        this.setToCheck = obj.setToCheck || false;
        this.log = obj.log || [];
    }

    workingOn() {
        return this.toCheck.length  > 0 ? 'checking' :
               this.toAdd.length    > 0 ? 'adding' :
               this.toDelete.length > 0 ? 'deleting' :
               this.order.length    > 0 ? 'setting-order' :
               this.log.length      > 0 ? 'displaying-log' :
               'idle';
    }

    async save() {
        console.log("Saving state: ", JSON.stringify(this, true, 2));
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
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

async function displayLog() {
    let d = document.createElement('div');
    d.classList = 'module-body corner-all';
    d.style = 'margin-top: 1em; margin-bottom: 1em';
    d.innerHTML = `
        <div class="module-content">
            <h3 class="grid-header">Raport: zmiany wprowadzone przez skrypt</h3>
            ${state.log.map(escapeHtml).map(text => `<li>${text}</li>`).join('\n')}
        </div>`;
    let container = document.querySelector('#dashboard > .wrap-fluid > .container-fluid');
    container.insertBefore(d, container.children[2]);

    state.log = [];
    await state.save();
}

function waitForSelector(sel) {
    return new Promise((resolve, reject) => {
        let firstTryEl = document.querySelector(sel);
        if(firstTryEl != null) {
            resolve(firstTryEl);
            return;
        }

        let intervalId = setInterval(function() {
            let el = document.querySelector(sel);
            if(el != null) {
                resolve(el);
                clearInterval(intervalId);
            }
        }, 75);
    });
}

function waitNotNull(something) {
    return new Promise((resolve, reject) => {
        let firstTry = something();
        if(firstTry != null) {
            resolve(firstTry);
            return;
        }

        let intervalId = setInterval(function() {
            let res = something();
            if(res != null) {
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
    var ev = document.createEvent('Event');
    ev.initEvent('keydown');
    ev.which = ev.keyCode = 13;
    element.dispatchEvent(ev);
}

function initToCheck() {
    return [...new Set([...document.querySelectorAll('a[href^="/panel/employers/edit/page_id/"]')].map(el=>el.href))];
}

async function addMultipleClickedValues(toAdd) {
    let arr = [];

    try {
        arr = JSON.parse(toAdd);
        if(!Array.isArray(arr))
            throw new Error();

        state.order = arr.map(({firstname, lastname}) => ({firstname, lastname}));

        // Reverse so .pop() returns elements from the begging
        arr.reverse();
    } catch {
        alert('[!!] not a valid JSON');
        return;
    }

    addOverlay();

    state.toAdd = arr;
    state.setToCheck = true;
    //state.toCheck = [...new Set([...document.querySelectorAll('a[href^="/panel/employers/edit/page_id/"]')].map(el=>el.href))];
    state.toDelete = [];
    await state.save();

    // reset search first
    document.querySelector('.module-content input.grid-reset[type=button]').click() // redirects
    //nextPageInFlow();
    //document.location = `/panel/employers/add/page_id/${config.pageId}/?seq`;
}

async function addMultipleClicked() {
    let toAdd = prompt('json with people');
    return await addMultipleClickedValues(toAdd);
}

async function ensureNoListView() {
    let btn = await waitForSelector('span.elfinder-button-icon.elfinder-button-icon-view');

    if(![...btn.classList].includes('elfinder-button-icon-view-list')) {
        console.log('[!!] switching away from list view');
        btn.click();
        await wait(400);
    }
}

function clickThenDoubleclick(el) {
    el.click();

    let doubleCliekEvent = document.createEvent('MouseEvents');
    doubleCliekEvent.initEvent('dblclick', true, true);
    el.dispatchEvent(doubleCliekEvent);
}

async function pageEmployeesSetImage(image) {
    document.querySelector('#photos_open').click();

    // wait for file manager to open
    await waitForSelector('#filemanagerphotos_open .elfinder-navbar-wrapper');
    await wait(100);
    console.log("[!!] file manager window is open");

    await ensureNoListView();
  
    let searchBar = document.querySelector('.elfinder-button-search input[type=text]');
  
    searchBar.value = image;
    // For some weird reason the return key doesn't register in some situations - predominately on firefox on macos
    //pressEnter(searchBar);
    // try clicking the small looking glass icon instead
    document.querySelector('.elfinder-button-search .ui-icon-search').click()
  
    const statusWindowSelector = '.elfinder-dialog-icon.elfinder-dialog-icon-search';

    // wait for the "Searching..." window to come up
    console.log(`[!!] Searched for '${image}' - waiting for the "Searching..." window to come up`);

    await waitForSelector(statusWindowSelector);
  
    // wait for the window to disappear
    console.log(`[!!] Searched for '${image}' - waiting for the "Searching..." window to close`);
    await waitNotNull(() => document.querySelector(statusWindowSelector) ? null : true);

    console.log(`[!!] Window closed - waiting for the results view`);
    let elfinder_cwd_view_icons = await waitForSelector('.elfinder-cwd-view-icons');

    console.log(`[!!] Results view obtained (with ${[...elfinder_cwd_view_icons.children].length} children)`);

    let file = [...elfinder_cwd_view_icons.children]
        .filter(c => ![...c.classList].includes('directory'))[0];

    if(file == null) {
        console.warn(`[!!] Could not find any file with name '${image}'`);
        alert(`Nie znaleziono zdjecia '${image}'!`);
        return;
    }

    console.log(`[!!] Found a file for ${image} - double clicking`)
    clickThenDoubleclick(file);

    // Wait for the photo to show up
    console.log(`[!!] Waiting for the photo to show up`);
    await waitForSelector('#photos_photos > div.element');

    console.log(`[!!] Done setting image`);
}

function readableName(name) {
    let names = {
        firstname: "imię",
        lastname: "nazwisko",
        image: "zdjęcie",
        description: "opis",
        linkedin_link: "link do Linkedin",
        fb_link: "link do Facebooka",
        url: "link do strony z opisem",
        email: "email",
        phone: "telefon",
    }
    return names[name] || name;
}

async function checkPublishedApproved(firstname, lastname) {
    let somethingChanged = false;

    let approved = document.querySelector('input#approved[type=checkbox]');
    if(approved && !approved.checked) {
        somethingChanged = true;
        await log(`Dla ${firstname} ${lastname} zaznaczono "Zatwierdzone"`);
        approved.checked = true;
    }

    let published = document.querySelector('input#published[type=checkbox]');
    if(published && !published.checked) {
        somethingChanged = true;
        await log(`Dla ${firstname} ${lastname} zaznaczono "Opublikowane"`);
        published.checked = true;
    }

    return somethingChanged;
}

async function pageEmployeesAdd() {
    let person = state.toAdd.pop();
    await log(`Dodano ${person.firstname} ${person.lastname}`);

    let inputs = document.querySelectorAll('textarea.pwr-textarea, input.pwr-input');
    for(let input of inputs) {
        input.value = person[input.id] || '';
        if(input.value && input.id != 'firstname' && input.id != 'lastname')
            await log(`Dla ${person.firstname} ${person.lastname} ustawiono ${readableName(input.id)} o wartości "${input.value}"`);
    }

    await checkPublishedApproved(person.firstname, person.lastname);

    await pageEmployeesSetImage(person.image);
    await log(`Dla ${person.firstname} ${person.lastname} ustawiono zdjęcie "${person.image}"`);

    await state.save();
    document.querySelector('input.pwr-btn-submit').click()
}

async function pageEmployeesEdit() {
    if(!document.location.href.startsWith(state.toCheck[state.toCheck.length - 1])) {
        console.warn(`[!!] Wrong location! '${document.location.href}' does not start with `
                + `'${state.toCheck[state.toCheck.length - 1]}'`);
        return;
    }

    let origUrl = state.toCheck.pop();
    //await state.save();
    // ^^^ DON'T SAVE YET - we might need to reload here if there's a wrong image already set

    let firstname = document.querySelector('#firstname.pwr-input').value;
    let lastname = document.querySelector('#lastname.pwr-input').value;

    //console.log(`Searching for ${firstname} ${lastname} in `, state.toAdd);
    var person = state.toAdd.filter(person => person.firstname == firstname
                                           && person.lastname == lastname)[0];

    if(!person) {
        state.toDelete.push(origUrl);
        await state.save(); // save this and previous state.toCheck.pop() (!)
        let firstname = (document.querySelector('input#firstname.pwr-input') || {value: '???'}).value;
        let lastname = (document.querySelector('input#lastname.pwr-input') || {value: '???'}).value;
        await log(`Przeniesiono do kosza ${firstname} ${lastname}`);
        nextPageInFlow();
        return;
    }

    let oldImage = (document.querySelector('input[name="photos[0][name]"') || {}).value;
    if(oldImage && oldImage != person.image) {
        // THIS IS A BIG HACK
        // NOT SAVING STATE DELIBERATERY - RETRY AGAIN BUT WITH THE ERROR AND NO IMAGE
        console.log(`[!!] detected a change in image - deleting the image and submitting to get an error`);
        document.querySelector('#photos_photos span.delete').click()
        await wait(100);
        document.querySelector('input.pwr-btn-submit').click();
        return;
    }

    state.toAdd = state.toAdd.filter(p => p != person);
    await state.save();
    // ^^^^^^^^^^^^^^  also saves state.toCheck.pop() from before

    let somethingChanged = false;

    let inputs = document.querySelectorAll('textarea.pwr-textarea, input.pwr-input');
    for(let input of inputs) {
        if(input.id == 'publisher')
            continue;

        let newValue = person[input.id] || '';
        if(newValue != input.value) {
            console.log(`[!!] detected a change in ${input.id} - from '${input.value}' to '${newValue}'`);
            somethingChanged = true;
            await log(`Dla ${person.firstname} ${person.lastname} zmieniono ${readableName(input.id)} z "${input.value}" na "${newValue}"`);
            input.value = newValue;
        }
    }

    if(await checkPublishedApproved(person.firstname, person.lastname)) {
        console.log(`[!!] checked 'published' and/or 'approved'`);
        somethingChanged = true;
    }

    if(!oldImage /*(|| oldImage != person.image*/) {
        console.log(`[!!] detected a change in image - setting new image`);
        somethingChanged = true;
        // delete old photo
        //document.querySelector('#photos_photos span.delete').click()
        await wait(100);
        await pageEmployeesSetImage(person.image);
        await wait(100);
        console.log(`[!!] image set successfully`);
        await log(`Zmieniono zdjęcie ${person.firstname} ${person.lastname} na plik "${person.image}"`);
    }

    //await state.save();

    if(somethingChanged) {
        const trySubmit = () => {
            console.log(`[!!] pressing the submit button repeatedly until the page lets us`);
            document.querySelector('input.pwr-btn-submit').click();
        }
        trySubmit();
        setInterval(trySubmit, 200);
    } else {
        console.log(`[!!] going to the next page in flow`);
        nextPageInFlow();
    }
}

function pageEmployeesIndexAddButton() {
    let x = document.querySelector('#grid-form-grid_employers > div.grid-top');
    if(x != null) {
        console.log("[!!] inserting button");

        let button = document.createElement('a');
        button.classList = 'grid-button right tooltip';
        button.id = 'grease-grid-button-add-multiple';
        button.innerHTML = '<img src="/dashboard/themes/default/images/ico16x16'
            + '/plus.png" border="0" class="grid-ico" />Synchronizuj z bazą (userscript)'
        button.href = '#';
        button.onclick = addMultipleClicked;

        x.insertBefore(button, x.children[3]);
    }
}

function tryParseJsonArray(json, defaultValue) {
    try {
        let arr = JSON.parse(json);
        if(!Array.isArray(arr)) {
            return defaultValue;
        }
        return arr;
    } catch {
        return defaultValue;
    }
}

function goToNextToCheck() {
    let newLocation = state.toCheck[state.toCheck.length - 1];
    document.location = `${newLocation}?seq`;
}

function nextPageInFlow() {
    const workingOn = state.workingOn();

    // let queueToAdd = tryParseJsonArray(await GM.getValue('opticms-to-add'), []);

    if(workingOn == 'checking') {
        goToNextToCheck();
    } else if(workingOn == 'adding') {
        // continue adding people
        document.location = `/panel/employers/add/page_id/${config.pageId}/?seq`;
    } else if(workingOn == 'deleting' || workingOn == 'setting-order' || workingOn == 'displaying-log' || workingOn == 'idle') {
        document.location = `/panel/employers/index/page_id/${config.pageId}/`;
    }
}

async function deleteStage() {
    let rowsToDelete = [...document.querySelectorAll('table#grid_employers.grid > tbody > tr')]
        .filter(row=>[...row.querySelectorAll('a')].some(a=>state.toDelete.includes(a.href)));

    rowsToDelete.forEach(rowToDelete=>rowToDelete.querySelector('input[name="check[]"]').checked = true)
    console.log(`[!!] Deleting - checked ${rowsToDelete.length} checkboxes`);

    if(rowsToDelete.length == 0) {
        state.toDelete = [];
        await state.save();
        return;
    }

    document.querySelector('#grid-button-delete-all').click();

    let buttonSet = await waitForSelector('.ui-dialog-buttonset');
    let noAndYesButtons = [...buttonSet.querySelectorAll('button.ui-button')];
    if(noAndYesButtons.length != 2) {
        console.warn(`Amount of noAndYesButtons different from expected 2 (${noAndYesButtons.length})`);
    }

    noAndYesButtons[1].click();

    state.toDelete = [];
    await state.save();

    await wait(300);
}

async function pageEmployeesIndexSetOrder() {
    let namesToId = [...document.querySelectorAll('table#grid_employers.grid > tbody > tr')]
        .filter(row=>row.id.startsWith('grid-item-'))
        .map(row=>({
            id: parseInt(row.id.replace(/^grid-item-/, ''), 10),
            lastname: row.children[1].innerText,
            firstname: row.children[2].innerText
        }));

    console.log('[!!] namesToId ', JSON.stringify(namesToId, true, 2));

    let getId = (first, last) => (namesToId.filter(({id, lastname, firstname}) => lastname == last && firstname == first)[0]).id;

    try {
        var order = state.order
            .map(({firstname, lastname}) => getId(firstname, lastname))
            .map(id => `#${id}`)
            .join('');
    } catch(e) {
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
  
    if(document.querySelector('#grid-select-perpage').value != "150") {
        console.log(`[!!] Setting perPage to 150`)
        document.location.pathname = document.location.pathname.replace(/\/perPage\/.*/, '').replace(/\/*$/, '') + '/perPage/150';
        return;
    }

    if(state.setToCheck) {
        state.toCheck = initToCheck();
        state.setToCheck = false;
        console.log(`[!!] Initialised toCheck with ${state.toCheck.length} entries`);
        await state.save();
    }

    if(['checking', 'adding'].includes(state.workingOn())) {
        nextPageInFlow();
    }

    if(state.workingOn() == 'deleting') {
        console.log(`[!!] Left to delete: ${state.toDelete}`);
        await deleteStage();
    }

    // deleting can go immediately to setting-order

    if(state.workingOn() == 'setting-order') {
        console.log(`[!!] Setting order`);
        await pageEmployeesIndexSetOrder();
        // will redirect to a different page - so return to not do anything else as it loads
        return;
    }

    if(state.workingOn() == 'displaying-log') {
        await displayLog();
    }
}

async function pageEmployeesSort() {
    if(state.goBackFromNextSort) {
        state.goBackFromNextSort = false;
        await state.save();
        await log(`Posortowano osoby w odpowiedniej kolejności`);

        nextPageInFlow();
    }
}

function addOverlay() {
    const d = document.createElement('div');
    d.style = 'position:absolute; top:0; left:0; width:100%; height:100%; background-color:rgba(0, 0, 0, 0.5); z-index:10000000; margin-top: 0 auto';
    d.innerHTML = '<div style="display: flex;justify-content:center;align-items:center;width: 100%;color: white;height: 100%;font-size: 3em;"><span>Proszę czekać, trwa działanie skryptu</span></div>';
    document.body.append(d);
}

async function greasePageFullyLoaded() {
    if(document.location.hash.startsWith("#opticms-automation=")) {
      	state = new State('{}');
      	
      	var decoded_toAdd_string = decodeURIComponent(document.location.hash.replace(/^#opticms-automation=/, ''));
      	
      	console.log('[!!] loading state from URL hash:', decoded_toAdd_string);
            	
      	document.location.hash = '';
      
      	await addMultipleClickedValues(decoded_toAdd_string);
      
      	return;
    } else {
      	state = new State(await getValue('grease-opticms-state', '{}'));
    }
      
    var hasSeqQuery = document.location.search.substring(1).split('&').includes('seq');

    if(document.location.pathname.startsWith('/panel/employers/')) {
        let [_0, _1, _2, pageName, stringPageId, pageId] =
            document.location.pathname.split('/');

        console.log(`pageName=${pageName}, pageId=${pageId}`);

        if(stringPageId != "page_id") {
            console.warn("[!!] no 'page_id'");
            return;
        }

        config.pageId = pageId;

        if(!(state.workingOn() == 'displaying-log' || state.workingOn() == 'idle')) {
            addOverlay();
        }

        if(pageName == "index") {
            await pageEmployeesIndex();
        } else if(pageName == "add" && hasSeqQuery) {
            await pageEmployeesAdd();
        } else if(pageName == "edit" && hasSeqQuery) {
            await pageEmployeesEdit();
        } else if(pageName == "sort") {
            await pageEmployeesSort();
        } else {
            console.warn('[!!] unknown path');
        }
    }
}

window.addEventListener("load", greasePageFullyLoaded, {once: true});
