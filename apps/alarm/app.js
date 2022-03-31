Bangle.loadWidgets();
Bangle.drawWidgets();

var alarms = require("Storage").readJSON("alarm.json",1)||[];
/*alarms = [
  { on : true,
    t : 23400000, // Time of day since midnight in ms
    msg : "Eat chocolate",
    last : 0, // last day of the month we alarmed on - so we don't alarm twice in one day!
    rp : true, // repeat
    as : false, // auto snooze
    timer : 5*60*1000, // OPTIONAL - if set, this is a timer and it's the time in ms
  }
];*/

// time in ms -> { hrs, mins }
function decodeTime(t) {
  t = 0|t; // sanitise
  var hrs = 0|(t/3600000);
  return { hrs : hrs, mins : Math.round((t-hrs*3600000)/60000) };
}

// time in { hrs, mins } -> ms
function encodeTime(o) {
  return o.hrs*3600000 + o.mins*60000;
}

function formatTime(t) {
  var o = decodeTime(t);
  return o.hrs+":"+("0"+o.mins).substr(-2);
}

function getCurrentTime() {
  var time = new Date();
  return (
    time.getHours() * 3600000 +
    time.getMinutes() * 60000 +
    time.getSeconds() * 1000
  );
}

function saveAndReload() {
  require("Storage").write("alarm.json",JSON.stringify(alarms));
  eval(require("Storage").read("alarm.boot.js"));
}

function showMainMenu() {
  // Timer img "\0"+atob("DhKBAP////MDDAwwMGGBzgPwB4AeAPwHOBhgwMMzDez////w")
  // Alarm img "\0"+atob("FBSBAABgA4YcMPDGP8Zn/mx/48//PP/zD/8A//AP/wD/8A//AP/wH/+D//w//8AAAADwAAYA")
  const menu = {
    '': { 'title': 'Alarm/Timer' },
    /*LANG*/'< Back' : ()=>{load();},
    /*LANG*/'New Alarm': ()=>editAlarm(-1),
    /*LANG*/'New Timer': ()=>editTimer(-1)
  };
  alarms.forEach((alarm,idx)=>{
    var txt; // a leading space is currently required (JS error in Espruino 2v12)
    if (alarm.timer)
      txt = /*LANG*/"Timer"+" "+formatTime(alarm.timer);
    else
      txt = /*LANG*/"Alarm"+" "+formatTime(alarm.t);
    if (alarm.rp) txt += "\0"+atob("FBaBAAABgAAcAAHn//////wAHsABzAAYwAAMAADAAAAAAwAAMAADGAAzgAN4AD//////54AAOAABgAA=");
    menu[txt] = {
      value : "\0"+atob(alarm.on?"EhKBAH//v/////////////5//x//j//H+eP+Mf/A//h//z//////////3//g":"EhKBAH//v//8AA8AA8AA8AA8AA8AA8AA8AA8AA8AA8AA8AA8AA8AA///3//g"),
      onchange : function() {
        if (alarm.timer) editTimer(idx, alarm);
        else editAlarm(idx, alarm);
      }
    };
  });
  if (WIDGETS["alarm"]) WIDGETS["alarm"].reload();
  return E.showMenu(menu);
}

function editDOW(dow, onchange) {
  const menu = {
    '': { 'title': /*LANG*/'Days of Week' },
    '< Back' : () => onchange(dow)
  };
  for (var i = 0; i < 7; i++) (i => {
    var dayOfWeek = require("locale").dow({ getDay: () => i });
    menu[dayOfWeek] = {
      value: !!(dow&(1<<i)),
      format: v => v ? "Yes" : "No",
      onchange: v => v ? dow |= 1<<i : dow &= ~(1<<i),
    };
  })(i);
  E.showMenu(menu);
}

function editAlarm(alarmIndex, alarm) {
  var newAlarm = alarmIndex<0;
  var a = {
    t : 12*3600000, // 12 o clock default
    on : true,
    rp : true,
    as : false,
    dow : 0b1111111,
    last : 0
  }
  if (!newAlarm) Object.assign(a, alarms[alarmIndex]);
  if (alarm) Object.assign(a,alarm);
  var t = decodeTime(a.t);

  const menu = {
    '': { 'title': /*LANG*/'Alarm' },
    '< Back' : () => showMainMenu(),
    /*LANG*/'Hours': {
      value: t.hrs, min : 0, max : 23, wrap : true,
      onchange: v => t.hrs=v
    },
    /*LANG*/'Minutes': {
      value: t.mins, min : 0, max : 59, wrap : true,
      onchange: v => t.mins=v
    },
    /*LANG*/'Enabled': {
      value: a.on,
      format: v=>v?"On":"Off",
      onchange: v=>a.on=v
    },
    /*LANG*/'Repeat': {
      value: a.rp,
      format: v=>v?"Yes":"No",
      onchange: v=>a.rp=v
    },
    /*LANG*/'Days': {
      value: "SMTWTFS".split("").map((d,n)=>a.dow&(1<<n)?d:".").join(""),
      onchange: () => editDOW(a.dow, d=>{a.dow=d;editAlarm(alarmIndex,a)})
    },
    /*LANG*/'Auto snooze': {
      value: a.as,
      format: v=>v?"Yes":"No",
      onchange: v=>a.as=v
    }
  };
  menu[/*LANG*/"Save"] = function() {
    a.t = encodeTime(t);
    if (a.t < getCurrentTime())
      a.day = (new Date()).getDate();
    if (newAlarm) alarms.push(a);
    else alarms[alarmIndex] = a;
    saveAndReload();
    showMainMenu();
  };
  if (!newAlarm) {
    menu[/*LANG*/"Delete"] = function() {
      alarms.splice(alarmIndex,1);
      saveAndReload();
      showMainMenu();
    };
  }
  return E.showMenu(menu);
}

function editTimer(alarmIndex, alarm) {
  var newAlarm = alarmIndex<0;
  var a = {
    timer : 5*60*1000, // 5 minutes
    on : true,
    rp : false,
    as : false,
    dow : 0b1111111,
    last : 0
  }
  if (!newAlarm) Object.assign(a, alarms[alarmIndex]);
  if (alarm) Object.assign(a,alarm);
  var t = decodeTime(a.timer);

  const menu = {
    '': { 'title': /*LANG*/'Timer' },
    '< Back' : () => showMainMenu(),
    /*LANG*/'Hours': {
      value: t.hrs, min : 0, max : 23, wrap : true,
      onchange: v => t.hrs=v
    },
    /*LANG*/'Minutes': {
      value: t.mins, min : 0, max : 59, wrap : true,
      onchange: v => t.mins=v
    },
    /*LANG*/'Enabled': {
      value: a.on,
      format: v=>v?"On":"Off",
      onchange: v=>a.on=v
    }
  };
  menu[/*LANG*/"Save"] = function() {
    a.timer = encodeTime(t);
    a.hr = getCurrentTime() + a.timer;
    if (newAlarm) alarms.push(a);
    else alarms[alarmIndex] = a;
    saveAndReload();
    showMainMenu();
  };
  if (!newAlarm) {
    menu[/*LANG*/"Delete"] = function() {
      alarms.splice(alarmIndex,1);
      saveAndReload();
      showMainMenu();
    };
  }
  return E.showMenu(menu);
}

showMainMenu();
