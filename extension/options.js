
//basically loads the background.js file. Allows you to call background.js
// functions and variables using background.Function or background.Variable
var background = chrome.extension.getBackgroundPage();
// console.log(background)

var userExtensionList = []

// loads when the options page is loaded
// basically presets html stuff
function restore_options() {
  chrome.storage.local.get({
    mode: 'flexible',
  }, function(items) {
    document.getElementById("selectMode").value = items.mode;
  });

  listExtensions(background.extensionsList);
  document.getElementById("extensionList").addEventListener("click", modifyUserExtensionList);

}

// calls the background function to actually change mode when the user changes mode
function changeMode(mode) {
    console.log("changeMode");
    switch (mode) {
        case "sensitive":
            background.sensitiveMode();
            break;
        case "strict":
            background.strictMode();
            break;
        case "userset":
            background.userSetMode();
            break;
        default:
            background.flexibleMode();
    }
}

function resetMap(){
 background.resetMap();
}

// this is the messy function I made that lists the users installed Extensions
// with checkboxes for use in adding websites for user set mode
function listExtensions(extensions){
  // deep copy so the page can be refreshed - makes testing easier
  items = JSON.parse(JSON.stringify(extensions))
  // just get the extension names
  for(i=0; i < items.length; i++){
    items[i] = items[i]["name"]
  }
  // a bunch of code to create HTML elements. I don't understand it super well
  // because I just copied it from stack overflow
   // Make a container element for the list
    listContainer = document.createElement('div'),
    // Make the list
    listElement = document.createElement('ul');
    listElement.id = "extensionList";
    // listElement.type = "checkbox"
    // Set up a loop that goes through the items in listItems one at a time
    numberOfListItems = items.length,
    // listItem,
    // i;

    // Add it to the page - bottom i guess?
    document.getElementsByTagName('body')[0].appendChild(listContainer);
    listContainer.appendChild(listElement);
    // actual value creation for list population
    for (i = 0; i < numberOfListItems; ++i) {
      // used to set the value to the name of the extension
      // can't just set a value for a checkbox, it has to be given separately
        var description = document.createTextNode(items[i])
        // newline between extensions
        var brk = document.createElement("br")

        // create an item for each one - makes it a checkbox input
        listItem = document.createElement('input');
        listItem.type = "checkbox"

        // Add the item text
        listItem.name = items[i]
        listItem.value = items[i]
        listItem.id = items[i]
        // listItem.innerHTML = items[i];

        // Add listItem to the listElement
        // adds checkbox -> extension name -> newline
        listElement.appendChild(listItem);
        listElement.appendChild(description);
        listElement.appendChild(brk);
    }
}

function test(){
  // console.log("test")
  // console.log(userExtensionList)
  // console.log(document.getElementById("extensionList"));
  console.log(background.usersetWebsites);
  console.log(background.websiteMap);
  console.log(background.mode);
  // console.log(background.usersetWebsites[0]);
  // // background.usersetWebsites.push("test.com")
  // console.log(background.addToUserSetBlacklist("test.com"))
  // console.log(background.usersetWebsites)
}

// called when the user clicks on the extension list or one of the checkboxes
// NOTE: THIS IS ONLY USED TO KEEP TRACK OF WHICH EXTENSIONS ARE CURRENTLY
// CHECKED OR UNCHECKED. IT DOES NOT MODIFY THE SETTINGS OF THE WEBSITE AT ALL
function modifyUserExtensionList(){
  // console.log(event)
  // target is supposed to make it so it knows which box is being checked I think
  var target = event.target || event.srcElement;
  // if it's not "extensionList", then it's one lf the checkboxes
  if(event.target.id != "extensionList"){
    // gets the id of the checkbox (NOT EXTENSION) - same as name I'm pretty sure
    var item = document.getElementById(event.target.id)
    // gets the actual ID of the extension - the big long one that looks like
    //  a hash or something
    var extensionID = getExtensionID(event.target.id)
    // checks to see if this extension has been added to our user's list already
    // (this variable is local to this file)
    var extensionIndex = userExtensionList.indexOf(extensionID);
    // if the index is -1, it doesn't exist. add it to the list of checked extensions
    if(item.checked && extensionIndex == -1){
        userExtensionList.push(getExtensionID(event.target.id))
    }
    // if it is already in the list, remove it when it's unchcked
    else if(!item.checked && extensionIndex > -1){
      userExtensionList.splice(extensionIndex,1);
    }
  }
}

// returns the actual extension ID given the extension name
function getExtensionID(name){
  for(i=0; i < background.extensionsList.length; i++){
    if(background.extensionsList[i]['name'] == name){
      return background.extensionsList[i]['id'];
    }
  }
}

function addToUserSetBlacklist(){
  // get the value entered by the user when they click the add button
  url = document.getElementById("urlbox").value;
  // reset the box
  document.getElementById("urlbox").value = "";
  // console.log(url);
  // add the website and selected extensions to the user blacklist
  background.addToUserSetBlacklist(url, userExtensionList);
}

// same as previous function. Doesn't require user extension list because
// we delete based on url, so all we need is the url to delete
function removeFromUserSetBlacklist(){
  url = document.getElementById("urlbox").value;
  document.getElementById("urlbox").value = "";
  background.removeFromUserSetBlacklist(url);
}

function resetUserBlacklist(){
  background.resetUserBlacklist();
}


document.addEventListener('DOMContentLoaded', restore_options);

document.getElementById("reset").addEventListener("click", function( event ) {
 resetMap();
}, false);

// on click listeners for the add/remove/reset buttons
document.getElementById("addurl").addEventListener("click", addToUserSetBlacklist)
document.getElementById("removeurl").addEventListener("click", removeFromUserSetBlacklist)
document.getElementById("reseturl").addEventListener("click", resetUserBlacklist)

document.getElementById("selectMode").addEventListener("change", function( event ) {
 console.log("POUET");
 changeMode(event.target.value);
}, false);
