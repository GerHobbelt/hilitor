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
  var skipTags = new RegExp("^(?:SCRIPT|FORM|INPUT|TEXTAREA|IFRAME|VIDEO|AUDIO)$");
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

  this.setRegex = function (input)
  {
    input = input.replace(/^[^\w]+|[^\w]+$/g, "").replace(/[^\w'\-]+/g, "|");
    var re = "(" + input + ")";
    if(!openLeft) re = "\\b" + re;
    if(!openRight) re = re + "\\b";
    matchRegex = new RegExp(re, "i");
  };

  this.getRegex = function ()
  {
    var retval = matchRegex.toString();
    retval = retval.replace(/^\/(\\b)?|(\\b)?\/i$/g, "");
    retval = retval.replace(/\|/g, " ");
    return retval;
  };

  function mergeTextNodes(textNode) {
    if (!textNode || !textNode.parentNode) {
      return textNode;
    }
    var leftSib = textNode;
    var count = 0;
    var node = leftSib;
    while (node && node.nodeType === 3) {
      leftSib = node;
      count++;
      node = node.previousSibling;
    }
    if (count < 2) {
      return leftSib;
    }
    // merge the texts stored by the text nodes, producing a single replacement text node:
    var text = [];
    node = leftSib;
    while (node && node.nodeType === 3) {
      text.push(node.nodeValue);
      node = node.nextSibling;
    }
    node = leftSib;
    node.nodeValue = text.join("");
    var n = node.nextSibling;
    while (n && n.nodeType === 3) {
      node = n.nextSibling;
      n.parentNode.removeChild(n);
      n = node;  
    }
    return leftSib;
  }

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
      node = mergeTextNodes(node);
      if((nv = node.nodeValue) && (regs = matchRegex.exec(nv))) {
        if (false !== options.onDoOne.call(this, node)) {
          if(!wordColor[regs[0].toLowerCase()]) {
            wordColor[regs[0].toLowerCase()] = colors[colorIdx++ % colors.length];
          }

          var match = document.createElement(hiliteTag);
          match.appendChild(document.createTextNode(regs[0]));
          match.className = "hilitor";
          match.style.backgroundColor = wordColor[regs[0].toLowerCase()];
          match.style.fontStyle = "inherit";
          match.style.color = "#000";

          var after = node.splitText(regs.index);
          after.nodeValue = after.nodeValue.substring(regs[0].length);
          node.parentNode.insertBefore(match, after);
        }
      }
    }
  };

  // remove highlighting
  this.remove = function ()
  {
    var arr;
    do {
      try {
        arr = document.querySelectorAll(hiliteTag + ".hilitor");
        while(arr.length && (el = arr[0])) {
          var prevSib = el.previousSibling;
          var nextSib = el.nextSibling;
          if (!el.parentNode) {
            break;
          }
          el.parentNode.replaceChild(el.firstChild, el);
          // and merge the text snippets back together again.
          //
          // Note that this stuff can crash (due to the parentNode being nuked) when multiple
          // snippets in the same text node sibling series are merged. That's what the
          // try/catch is for plus the parentNode check (which is a later fix, but we don't
          // have a will-never-crash guarantee with that one yet, so we keep the try/catch
          // in here as well. Ugly. Even while the .querySelectorAll() 'array' is updated
          // automatically, which would imply that this never occurs, yet: it does. :-(
          if (prevSib) {
            mergeTextNodes(prevSib.nextSibling);
          } else if (nextSib) {
            mergeTextNodes(nextSib.previousSibling);
          }
        }
      } catch (e) {
      }
    } while (arr.length > 0);
  };

  // start highlighting at target node
  this.apply = function (input)
  {
    // always remove all highlight markers which have been done previously
    this.remove();
    if(!input) {
      return false;
    }
    this.setRegex(input);
    var rv = options.onStart.call(this);
    if (rv === false) {
      return rv;
    }
    this.hiliteWords(targetNode);
    return options.onFinish.call(this);
  };
}


  return Hilitor;
}));
