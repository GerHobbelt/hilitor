// Original JavaScript code by Chirp Internet: www.chirp.com.au
// Please acknowledge use of this code by including this header.
// 2/2013 jon: modified regex to display any match, not restricted to word boundaries.

// License at http://www.the-art-of-web.com/copyright.html

(function ( window, factory ) {

  if ( typeof module === "object" && typeof module.exports === "object" ) {
    // Expose a factory as module.exports in loaders that implement the Node
    // module pattern (including browserify).
    // This accentuates the need for a real window in the environment
    // e.g. var jQuery = require("jquery")(window);
    module.exports = function( w ) {
      w = w || window;
      if ( !w.document ) {
        throw new Error("Hilitor requires a window with a document");
      }
      return factory( w.document );
    };
  } else {
    if ( typeof define === "function" && define.amd ) {
      // AMD. Register as a named module.
      define( [], function() {
        return factory(document);
      });
    } else {
        // Browser globals
        window.Hilitor = factory(document);
    }
  }

// Pass this, window may not be defined yet
}(this, function ( document, undefined ) {


function Hilitor(id, tag, options)
{
  var targetNode = document.getElementById(id) || document.body;
  var hiliteTag = tag || "EM";
  var skipTags = new RegExp("^(?:" + hiliteTag + "|SCRIPT|FORM)$");
  var colors = ["#ff6", "#a0ffff", "#9f9", "#f99", "#f6f"];
  var wordColor = [];
  var colorIdx = 0;
  var matchRegex = "";
  var openLeft = true;
  var openRight = true;
  options = options || {};
  if (typeof options.onStart !== 'function') {
    options.onStart = function () { /* return FALSE when you want to abort */ };
  }
  if (typeof options.onFinish !== 'function') {
    options.onFinish = function () { /* What you return here is returned by Hilitor.apply() */ return true; };
  }
  if (typeof options.onDoOne !== 'function') {
    options.onDoOne = function (node) { /* return FALSE when you want to skip the highlighting change for this node */ };
  }

  this.setMatchType = function(type)
  {
    switch(type)
    {
    case "left":
      openLeft = false;
      openRight = true;
      break;
    case "right":
      openLeft = true;
      openRight = false;
      break;
    default:
    case "open":
      openLeft = openRight = true;
      break;
    case "complete":
      openLeft = openRight = false;
      break;
    }
  };

  function addAccents(input)
  {
    retval = input;
    retval = retval.replace(/([ao])e/ig, "$1");
    retval = retval.replace(/\\u00E[024]/ig, "a");
    retval = retval.replace(/\\u00E7/ig, "c");
    retval = retval.replace(/\\u00E[89AB]/ig, "e");
    retval = retval.replace(/\\u00E[EF]/ig, "i");
    retval = retval.replace(/\\u00F[46]/ig, "o");
    retval = retval.replace(/\\u00F[9BC]/ig, "u");
    retval = retval.replace(/\\u00FF/ig, "y");
    retval = retval.replace(/\\u00DF/ig, "s");
    retval = retval.replace(/a/ig, "([aàâä]|ae)");
    retval = retval.replace(/c/ig, "[cç]");
    retval = retval.replace(/e/ig, "[eèéêë]");
    retval = retval.replace(/i/ig, "[iîï]");
    retval = retval.replace(/o/ig, "([oôö]|oe)");
    retval = retval.replace(/u/ig, "[uùûü]");
    retval = retval.replace(/y/ig, "[yÿ]");
    retval = retval.replace(/s/ig, "(ss|[sß])");
    return retval;
  }

  this.setRegex = function (input)
  {
    input = input.replace(/\\([^u]|$)/g, "$1");
    input = input.replace(/[^\w\\\s']+/g, "").replace(/\s+/g, "|");
    input = input.replace(/^\||\|$/g, "");
    input = addAccents(input);
    if(input) {
      var re = "(" + input + ")";
      if(!openLeft) re = "(?:^|[\\b\\s])" + re;
      if(!openRight) re = re + "(?:[\\b\\s]|$)";
      matchRegex = new RegExp(re, "i");
      return true;
    }
    return false;
  };

  this.getRegex = function ()
  {
    var retval = matchRegex.toString();
    retval = retval.replace(/(^\/|\(\?:[^\)]+\)|\/i$)/g, "");
    return retval;
  };

  // recursively apply word highlighting
  this.hiliteWords = function (node)
  {
    var i;

    if(!node)
      return;
    if(!matchRegex)
      return;
    if(skipTags.test(node.nodeName))
      return;
    if(node.nodeName === hiliteTag && node.className === "hilitor")
      return;

    if(node.hasChildNodes()) {
      for(i = 0; i < node.childNodes.length; i++) {
        this.hiliteWords(node.childNodes[i]);
      }
    }
    if(node.nodeType === 3) { // NODE_TEXT
      if((nv = node.nodeValue) && (regs = matchRegex.exec(nv))) {
        if(!wordColor[regs[1].toLowerCase()]) {
          wordColor[regs[1].toLowerCase()] = colors[colorIdx++ % colors.length];
        }

        var match = document.createElement(hiliteTag);
        match.appendChild(document.createTextNode(regs[1]));
        match.style.backgroundColor = wordColor[regs[1].toLowerCase()];
        match.style.fontStyle = "inherit";
        match.style.color = "#000";

        var after;
        if(regs[0].match(/^\s/)) { // in case of leading whitespace
          after = node.splitText(regs.index + 1);
        } else {
          after = node.splitText(regs.index);
        }
        after.nodeValue = after.nodeValue.substring(regs[1].length);
        node.parentNode.insertBefore(match, after);
      }
    }
  };

  // remove highlighting
  this.remove = function ()
  {
    var arr = document.getElementsByTagName(hiliteTag);
    while(arr.length && (el = arr[0])) {
      var parent = el.parentNode;
      parent.replaceChild(el.firstChild, el);
      parent.normalize();
    }
  };

  // start highlighting at target node
  this.apply = function (input)
  {
    // always remove all highlight markers which have been done previously
    this.remove();
    if(input === undefined || !(input = input.replace(/(^\s+|\s+$)/g, ""))) return;
    input = convertCharStr2jEsc(input);
    if(this.setRegex(input)) {
      this.hiliteWords(targetNode);
    }
  };

  // added by Yanosh Kunsh to include utf-8 string comparison
  function dec2hex4(textString)
  {
    var hexequiv = new Array("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F");
    return hexequiv[(textString >> 12) & 0xF] + hexequiv[(textString >> 8) & 0xF] + hexequiv[(textString >> 4) & 0xF] + hexequiv[textString & 0xF];
  }

  function convertCharStr2jEsc(str, cstyle)
  {
    // Converts a string of characters to JavaScript escapes
    // str: sequence of Unicode characters
    var highsurrogate = 0;
    var suppCP;
    var pad;
    var n = 0;
    var outputString = '';
    for(var i=0; i < str.length; i++) {
      var cc = str.charCodeAt(i);
      if(cc < 0 || cc > 0xFFFF) {
        outputString += '!Error in convertCharStr2UTF16: unexpected charCodeAt result, cc=' + cc + '!';
      }
      if(highsurrogate != 0) { // this is a supp char, and cc contains the low surrogate
        if(0xDC00 <= cc && cc <= 0xDFFF) {
          suppCP = 0x10000 + ((highsurrogate - 0xD800) << 10) + (cc - 0xDC00);
          if(cstyle) {
            pad = suppCP.toString(16);
            while(pad.length < 8) {
              pad = '0' + pad;
            }
            outputString += '\\U' + pad;
          } else {
            suppCP -= 0x10000;
            outputString += '\\u' + dec2hex4(0xD800 | (suppCP >> 10)) + '\\u' + dec2hex4(0xDC00 | (suppCP & 0x3FF));
          }
          highsurrogate = 0;
          continue;
        } else {
          outputString += 'Error in convertCharStr2UTF16: low surrogate expected, cc=' + cc + '!';
          highsurrogate = 0;
        }
      }
      if(0xD800 <= cc && cc <= 0xDBFF) { // start of supplementary character
        highsurrogate = cc;
      } else { // this is a BMP character
        switch(cc)
        {
          case 0:
            outputString += '\\0';
            break;
          case 8:
            outputString += '\\b';
            break;
          case 9:
            outputString += '\\t';
            break;
          case 10:
            outputString += '\\n';
            break;
          case 13:
            outputString += '\\r';
            break;
          case 11:
            outputString += '\\v';
            break;
          case 12:
            outputString += '\\f';
            break;
          case 34:
            outputString += '\\\"';
            break;
          case 39:
            outputString += '\\\'';
            break;
          case 92:
            outputString += '\\\\';
            break;
          default:
            if(cc > 0x1f && cc < 0x7F) {
              outputString += String.fromCharCode(cc);
            } else {
              pad = cc.toString(16).toUpperCase();
              while(pad.length < 4) {
                pad = '0' + pad;
              }
              outputString += '\\u' + pad;
            }
        }
      }
    }
    return outputString;
  }

}


  return Hilitor;
}));
