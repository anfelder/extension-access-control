var websiteMap = {}; //Domains --> list of extensions that are blocked

// websiteMap serves as a nested dictionary {website : {[extensionID: true/false, extensionID: true/false ...]}}
// in this case, the primary key is the website. Each website then has a key
// for all extensions in the browser which have a value of true or false.
// true indicates that the extension is allowed, false indicates that the exetension is blocked.

// For example, I used the userset mode and blocked 3 extensions on paypal.com
// this is the resulting structure:

// {paypal.com: {…}}
//  -> paypal.com:
//      -> aapbdbdomjkkjkaonfhkkikfgjllcleb: false
//      -> bmnlcjabgnpnenekpadlanbbkooimhnj: false
//      -> cjpalhdlnbpafiamejdnhcphjbkeiagm: true
//      -> eekbbmglbfldjpgbmajenafphnfjonnc: false
//      -> eimadpbcbfnmbkopoojfekhnkhdbieeh: true

// the parent, {paypal.com: {...}} is just the object, it doesn't show any data
// expanding it shows the key 'paypal.com' which then has a list of sub items
// each item consists of the ID of an extension as well as whether or not it is
// blocked


var extensionsList;
var mode = "flexible";

//Top 50 banking websites - only used in Sensitive mode
var sensitiveWebsites = ["paypal.com", "chase.com", "bankofamerica.com", "wellsfargo.com", "americanexpress.com", "hdfcbank.com",
    "capitalone.com", "icicibank.com", "discover.com", "td.com", "usbank.com", "commbank.com.au", "axisbank.com", "scotiabank.com",
    "chase.com", "rbcroyalbank.com", "fnb.co.za", "hangseng.com", "bmo.com", "cibc.com", "tdbank.com", "anz.com", "nab.com.au",
    "westpac.com.au", "nbg.gr", "regions.com", "bbt.com", "icbc.com.cn", "sbi.co.in", "ubs.com", "bankrate.com", "canarabank.in",
    "eurobank.gr", "ziraatbank.com.tr", "isbank.com.tr", "creditonebank.com", "53.com", "bni.co.id", "desjardins.com",
    "bankofindia.com", "nwolb.com", "online.citibank.co.in", "anz.com.au", "absa.co.za", "yesbank.in", "hsbc.com", "bsi.ir",
    "aib.ie", "standardbank.co.za", "becu.org"];

//websites and their extensions defined by the user in user set mode
var usersetWebsites = {}


// var usersetBlockedExtensions = {}

function getExtensionInfo(){
    return extensionsList;
}

// checks to see if site is a key entry in websiteMap
function hasWebsiteSettings(site){
    return websiteMap.hasOwnProperty(site);
}

//returns the value corresponding the the given key for websiteMap
function getWebsiteSettings(site){
    return websiteMap[site];
}

// I believe this one is only used when you turn extensions on/off manually
// through their extension. Basically, it takes the new settings for the site
// (e.g., you're on youtube and turn off ad blocker, that setting is now false
// to symbolize the extension being blocked) and updates the existing settings

//chrome.storage.sync is an account wide storage so you can access it on
// multiple devices provided the same google account is logged in
// there's also chrome.storage.local which is specific to that device
function saveWebsiteSettings(site,settings){
    //Save the current policy to the map
    websiteMap[site] = settings;
    if(mode == "userset"){
      var blocked = []
      for (var i in settings){
        // if the extension is blocked
        if(settings[i] == false){
          blocked.push(i);
        }
      }
      // update the newly blocked or unblocked extensions
      usersetWebsites[site] = blocked;
    }
    //Refresh policies
    chrome.storage.sync.clear();
    chrome.storage.sync.set(mapToSettings());
}

// Function to transform the website map to ExtensionSettings
// this functions modifies the actual extensions' settings
function mapToSettings(){
    let settings = {};
    if(mode !== "strict") {
        // set all extensions to not have any blocked hosts by default
        // i.e. each extension's settings is given an empty array of blocked hosts
        for(let index in extensionsList) {
            settings[extensionsList[index].id] = {"runtime_blocked_hosts": []};
        }
        // for each website in the map and each extension
        // for each extension's id and whether or not it's allowed
        // block extensions which are not allowed by adding that website to
        // the extension's list of blocked hosts
        // this updates the settings of the extensions
        for (let [website, extensions] of Object.entries(websiteMap)) {
            for (let [id, allowed] of Object.entries(extensions)) {
                if (!allowed) {
                    settings[id]["runtime_blocked_hosts"].push("*://*." + website);
                }
            }
        }
    }
    // opposite if strict mode. Set blocked hosts to be everything and allowed
    // hosts to be empty. If the extension is allowed by the user (this has to
    // be manually turned on by the user while on that website) add it to allowed
    else {
        for(let index in extensionsList) {
            settings[extensionsList[index].id] = {"runtime_blocked_hosts": ["*://*"], "runtime_allowed_hosts": []};
        }
        for (let [website, extensions] of Object.entries(websiteMap)) {
            for (let [id, allowed] of Object.entries(extensions)) {
                if (allowed) {
                    settings[id]["runtime_allowed_hosts"].push("*://*." + website);
                }
            }
        }
    }
    return { "ExtensionSettings" : settings};
}

//Function to transform the stored ExtensionSettings to a website map
// this is the opposite of the above function. It takes the extensions' settings
// and populates the websiteMap variable.
function settingsToMap(settings){

    let ids = [];
    for(let extension in extensionsList){
        ids.push(extensionsList[extension].id);
    }

    let webMap = {};
    for(let extension in settings){

        //Adding the blocked website
        for(let index in settings[extension]["runtime_blocked_hosts"]){
            //Getting the url of the website
            let domain = settings[extension]["runtime_blocked_hosts"][index].substr(6);

            //If domain is not in webMap, we create it
            if(!webMap.hasOwnProperty(domain)){
                webMap[domain] = {};
                for(let index in ids){
                    webMap[domain][ids[index]] = true;
                }
            }

            //We put the domain in question as blocked
            webMap[domain][extension] = false;
        }

        //Adding the whitelisted website
        for(let index in settings[extension]["runtime_allowed_hosts"]){
            //Getting the url of the website
            let domain = settings[extension]["runtime_allowed_hosts"][index].substr(6);

            //If domain is not in webMap, we create it
            if(!webMap.hasOwnProperty(domain)){
                webMap[domain] = {};
                for(let index in ids){
                    webMap[domain][ids[index]] = true;
                }
            }

            //We put the domain in question as allowed
            webMap[domain][extension] = true;
        }


    }

    return webMap;
}

//Function to refresh the list of installed extensions
function refreshExtensionList() {
    chrome.management.getAll(function (extensions) {
        extensionsList = extensions;
        //Remove this extension from the list
        for(let index in extensionsList){
            if(extensionsList[index].id == chrome.runtime.id){
              // splice(i, x) removes x values from an array starting at index i
                extensionsList.splice( index, 1 );
            }
        }
        // get the user's extension settings and populate the websiteMap on startup
        chrome.storage.sync.get(['ExtensionSettings'], function(result) {
            websiteMap = settingsToMap(result['ExtensionSettings']);
        });

    });

    //  this should probably be moved elsewhere but it works well enough here for now
    chrome.storage.sync.get(['websites'], function(results){
      usersetWebsites = results.websites
    });
}

//Function to get the mode selected by the user
function getMode(){
    return mode;
}

//Function to save the mode selected by the user
function saveMode(m){
    mode = m;
    chrome.storage.local.set({"mode": m});

    //Refresh policies
    chrome.storage.sync.clear();
    chrome.storage.sync.set(mapToSettings());
}

//Function to initialize the current mode
function initMode() {
    chrome.storage.local.get({"mode": "flexible"}, function (items) {
        mode = items.mode;
    });
}

//Disable all extensions on the given URL
function disableExtensions(url) {
    let list = {};
    for(let index in extensionsList) {
        list[extensionsList[index].id] = false;
    }
    saveWebsiteSettings(url, list);
}

//Listen to messages from Content script
chrome.runtime.onMessage.addListener(
 function(request, sender, sendResponse) {
    disableExtensions(request.url);
});


//Functions to handle mode change
// flexible mode allows all extensions by default and requires the user to manually
// disable them on chosen websites
function flexibleMode(){
    //We reset the map
    //resetMap();

    //We remove the preloaded lists
    removePreloadListFromBlacklist();
    removeUserSet();

    //We save the new mode and we refresh the policy
    saveMode("flexible");
}

// sensitive mode blocks all extensions by default on the websites listed in the
// 'sensitiveWebsites' variable defined at the top. All other websites have all
// extensions enabled by default.
function sensitiveMode(){
    //We reset the map
    //resetMap();

    // remove the user set list and add the sensitive list to websiteMap
    removeUserSet();
    addPreloadListFromBlacklist();

    //We save the new mode and we refresh the policy
    saveMode("sensitive");
}

// strict mode blocks all extensions everywhere by default. Extensions must be
// manually turned on by the user
function strictMode(){
    //We reset the map
    //resetMap();

    //We remove the preloaded lists
    removeUserSet();
    removePreloadListFromBlacklist();

    //We save the new mode and we refresh the policy
    saveMode("strict");
}

// this is the one I made which is a middle point between flexible and strict
// where the user can kind of build their own website list and blocked extensions
// without having to visit those websites and do it manually
function userSetMode(){
  // remove the sensitive list and add the user list to websiteMap
  removePreloadListFromBlacklist();
  preloadUserSet();
  saveMode("userset")
}

// load all websites in from the sensitiveWebsites variable and set all extension
// ids to have a value of false
function addPreloadListFromBlacklist(){
    for(let i in sensitiveWebsites){

        //We create the list if it does not exist
        if(!websiteMap.hasOwnProperty(sensitiveWebsites[i])){
            websiteMap[sensitiveWebsites[i]] = {};
        }

        //We block all extensions
        for(let j in extensionsList) {
            websiteMap[sensitiveWebsites[i]][extensionsList[j].id] = false;
        }
    }
}


// clear the website map after switching from sensitive to another mode
function removePreloadListFromBlacklist(){
    for(let i in sensitiveWebsites){
        delete websiteMap[sensitiveWebsites[i]];
    }
}

// basically the same as the sensitive website loading function
function preloadUserSet(){
  for (var site in usersetWebsites){
    if(usersetWebsites.hasOwnProperty(site)){
      var value = usersetWebsites[site];
      // alert(value)
      if(!websiteMap.hasOwnProperty(site)){
          websiteMap[site] = {};
      }
      // set unblocked websites to be true so they show up as enabled if the user
      // clicks this extension's icon and brings up the dropdown on that website
      for( var ext in extensionsList){
        websiteMap[site][extensionsList[ext].id] = true;
      }
      for(var id in value){
        websiteMap[site][value[id]] = false;
      }
    }
  }
}

function removeUserSet(){
  for(let i in usersetWebsites){
    delete websiteMap[i]
  }
}

// used when the user adds a website to their blacklist for user set mode
function addToUserSetBlacklist(url, extensions){
  if(mode == "userset"){
    // start by clearing the set, but only if we're in userset mode
    // if we're not in user set mode, we want to leave the websiteMap alone
    // this function still works while not in userset mode
      removeUserSet();
  }
  // deep copy
  e = JSON.parse(JSON.stringify(extensions))
  // this function is called from options.js, so that majority of the work happens in
  // there. Here it just does assignment
  usersetWebsites[url] = e
  // store the new settings for whenever they need to be reloaded
  chrome.storage.sync.set({'websites': usersetWebsites})
  // if we're in userset mode currently, go ahead and reload the settings
  // preloadUserSet puts the user defined websites into websiteMap
  // chrome calls actually apply the settings
  if(mode == "userset"){
    preloadUserSet();
    //Refresh policies
    chrome.storage.sync.clear();
    chrome.storage.sync.set(mapToSettings());
  }
  // return usersetWebsites;
}

// same thing as previous function, but remove instead of add
function removeFromUserSetBlacklist(url){
  if(mode == "userset"){
      removeUserSet();
  }
  delete usersetWebsites[url];
  chrome.storage.sync.set({'websites': usersetWebsites})
  if(mode == "userset"){
    preloadUserSet();
    //Refresh policies
    chrome.storage.sync.clear();
    chrome.storage.sync.set(mapToSettings());
  }

}

// clears the user set
function resetUserBlacklist(){
  if(mode == "userset"){
    removeUserSet();
  }
  usersetWebsites = {};
  chrome.storage.sync.set({'websites': usersetWebsites})
}


// clears the website map
function resetMap(){
    websiteMap = {};
    chrome.storage.sync.clear();
    chrome.storage.sync.set(mapToSettings());
}


// Initialisation
// not sure what the listeners do, but the refreshExtensionList call should happen
// every time a page is loaded?
chrome.management.onInstalled.addListener(refreshExtensionList);
chrome.management.onUninstalled.addListener(refreshExtensionList);
refreshExtensionList();
initMode();
