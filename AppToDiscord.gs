var POST_URL = "https://discordapp.com/api/webhooks/518190905581240380/FV5OtDq7H84dfuTyZLnQoKFFbGnliEGgDLoOUFtqXp52KntGYJLNIEgnVSPJ71Qiap4X"; //Discord web hook url

var LOGS_KEY = "f21582dff30a9758a84002a2436b0a52"; //Warcraft logs key, get from their website
var WARCRAFT_LOGS_URL = "https://www.warcraftlogs.com:443/v1/parses/character/";
var WARCRAFT_LOGS_QUERY = "?timeframe=historical&api_key=" + LOGS_KEY;

var LOGS_QUESTION = "Link to your Warcraftlogs page (https://www.warcraftlogs.com/)"; //Specified question
var RESPONSE_TITLE = "New Application";
var RESPONSE_FOOTER = "End Application";

var NAME_OFFSET = 1; //For url parsing
var SERVER_OFFSET = 2; //For url parsing
var LOCALE_OFFSET = 3; //For url parsing
var HEROIC_DIFFICULTY = 4; //ID of heroic fights, can be retrieved from warcraft logs
var MYTHIC_DIFFICULTY = 5; //ID of mythic fights


/**
* Contains boss data and damage parses
**/
function boss(name) { 
  this.name = name;
  this.best = 0;
  this.avg = 0;
  this.parses = [];
};

var bosses = {
  2265 : new boss("Champion"), //Get ID from warcraft logs
  2263 : new boss("Grong"),
  2266 : new boss("Jadefire"),
  2271 : new boss("Opulence"),
  2268 : new boss("Conclave"),
  2272 : new boss("Rasta"),
  2276 : new boss("Mekka"),
  2280 : new boss("Block"),
  2281 : new boss("Jaina")
};
/**
* Get all best parse/boss
**/
function getParses(warcraftLogsUrl) {
  var splitUrl = warcraftLogsUrl.split("/");
  
  var nameAndFluff = splitUrl[splitUrl.length - NAME_OFFSET];
  var hashIndex = nameAndFluff.indexOf("#"); //url always ends with a # after the name, can use this as a reference
  var name = (hashIndex == -1) ? nameAndFluff : nameAndFluff.substring(0, hashIndex);
  var server = splitUrl[splitUrl.length - SERVER_OFFSET];
  var locale = splitUrl[splitUrl.length - LOCALE_OFFSET];
  
  var url = WARCRAFT_LOGS_URL + name + "/" + 
    server + "/" + locale + WARCRAFT_LOGS_QUERY; //full logs url to post to
  try {
    var allParses = JSON.parse(UrlFetchApp.fetch(url).getContentText());
    for(var key in allParses) {
      var currParse = allParses[key];
      if(currParse.difficulty === HEROIC_DIFFICULTY) bosses[currParse.encounterID].parses.push(currParse.percentile);
    }
    var avgParses = formatBosses();
    var topAvg = avgParses[0];
    var avg = avgParses[1];
    return formatPrints(topAvg, avg);
  }
  catch(error) {
    return "Incorrect log url format provided";
  }
}

function formatBosses() {
  var bestAvgSum = 0;
  var avgSum = 0;
  var flexCount = Object.keys(bosses).length;
  for(var id in bosses) {
    var boss = bosses[id];
    if(boss.parses.length <= 0) {
      flexCount--;
      continue;
    }
    bestAvgSum += boss.best = Math.max.apply(null, boss.parses);
    avgSum += boss.avg = getMean(boss.parses);
  }
  return [bestAvgSum/flexCount, avgSum/flexCount];
}

function formatPrints(topAvg, avg) {
  var what = bosses;
  var printStatements = ["\n*Averages*: " + topAvg + "    " + avg];
  for(var boss in bosses) {
    var currBoss = bosses[boss];
    printStatements.push("\n" + currBoss.name + ": " + currBoss.best + "    " + currBoss.avg);
  }
  return printStatements;
}
  
/**
* Give mean of array
**/
function getMean(parses) {
  var sum = 0;
  var count = parses.length;
  for(var parse in parses) sum += parses[parse];
  return Math.floor(sum/count);
}

/**
* Post application response to discord
**/
function onSubmit(e) {
  var allResponses = FormApp.getActiveForm().getResponses();
  var response = allResponses[allResponses.length - 1].getItemResponses();
  var items = [];
  
  for (var i = 0; i < response.length; i++) {
    var question = response[i].getItem().getTitle();
    var parts = response[i].getResponse().match(/[\s\S]{1,1024}/g) || [];
    if(parts.length <= 0 || parts[0] == "") continue; //Empty answers or empty parts
    if(question === LOGS_QUESTION) parts[0] += getParses(parts[0]);
    items.push({"name": question, "value": parts[0], "inline": false})
  }  
  
  var options = {
    "method" : "post",
    "payload": JSON.stringify({
      "embeds": [
        {
          "title": RESPONSE_TITLE,
          "fields":items,
          "footer":{"text": RESPONSE_FOOTER}
        }
      ]
    }
   )
  };

  UrlFetchApp.fetch(POST_URL, options);
}
