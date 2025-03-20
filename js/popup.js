'use strict';

const b64re = RegExp(
  '^\\s*([A-Za-z0-9+/]{4})*'
    + '([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)\\s*$');

async function rebuild(inVal, skipElem) {
  let diag = document.getElementById("diagnostic");
  {
    let cNode = diag.cloneNode(false);
    diag.parentNode.replaceChild(cNode, diag);
    diag = cNode;
  }
  let uninames = [];
  let blocks = new Set([]);
  // Preload query list
  for (let c of inVal) {
    getNameBlock(c.codePointAt(0));
  }
  for (let c of inVal) {
    let cp = c.codePointAt(0);
    let uniname = cp.toString(16).toUpperCase().padStart(4, '0');
    let info = await getNameBlock(cp);
    let block = info[2];
    uniname = "U+" + uniname + ": " + info[0];
    uninames.push(uniname);
    let blockClass = info[1];
    blocks.add(block);
    let spanE = document.createElement('span');
    spanE.appendChild(document.createTextNode(c));
    spanE.setAttribute("class", "diagnostic " + blockClass);
    let spanTT = document.createElement('span');
    spanTT.setAttribute("class", "tooltiptext");
    let spanF = document.createElement('span');
    spanF.appendChild(document.createTextNode(uniname));
    spanTT.appendChild(spanF);
    spanTT.setAttribute("widthStyle", `max-width: 50ch; `);
    spanTT.setAttribute("style", `left: -2px; max-width: 50ch;`);
    spanE.appendChild(spanTT);
    diag.appendChild(spanE);
  }
  diag.addEventListener("mouseover", (e) => {
    let spanTT = e.target.firstElementChild;
    if (!spanTT || spanTT.getAttribute('class') != 'tooltiptext') {
      return;
    }
    let bodyRect = document.body.getBoundingClientRect();
    let ttRect = spanTT.getBoundingClientRect();
    let parentRect = spanTT.parentElement.getBoundingClientRect();
    let curStyle = window.getComputedStyle(spanTT);

    if ((ttRect.right <= bodyRect.right) &&
        (ttRect.left > bodyRect.left) &&
        (parseFloat(curStyle['width'])
         <= 1+spanTT.firstElementChild.offsetWidth)) {
      return;
    } else {
      let newStyle = '';
      let dealLeft = ttRect.left;
      let dealRight = ttRect.right;
      let changedStyle = false;
      if (ttRect.width > bodyRect.width) {
        // 12 for border
        let widthStyle = `max-width: ${bodyRect.width - 12}px; `;
        newStyle += widthStyle;
        dealRight = dealLeft + bodyRect.width;
        spanTT.setAttribute("widthStyle", widthStyle);
        changedStyle = true;
      } else if (parseFloat(curStyle['width'])
                 > 1+spanTT.firstElementChild.offsetWidth) {
        let widthStyle = `width: ${Math.ceil(spanTT.firstElementChild.offsetWidth)}px; `;
        newStyle += widthStyle;
        dealRight = dealLeft + spanTT.firstElementChild.offsetWidth + 12;
        spanTT.setAttribute("widthStyle", widthStyle);
        changedStyle = true;
      } else {
        newStyle += spanTT.getAttribute("widthStyle");
      }
      let oldCssLeft = parseFloat(parseFloat(curStyle['left']).toFixed(3));
      let cssLeft = oldCssLeft;
      let baseAdjust = parentRect.left - dealLeft - 10;
      dealLeft += baseAdjust;
      dealRight += baseAdjust;
      cssLeft += baseAdjust;
      if (dealRight > bodyRect.right) {
        cssLeft = cssLeft - (dealRight - bodyRect.right);
      } else if (dealLeft < bodyRect.left) {
        cssLeft = cssLeft + (bodyRect.left - dealLeft);
      }
      cssLeft = cssLeft.toFixed(3);
      if ((oldCssLeft.toFixed(3) != cssLeft) || changedStyle) {
        newStyle += `left: ${cssLeft}px;`;
        changedStyle = true;
      }

      let oldCssTop = parseFloat(parseFloat(curStyle['top']).toFixed(3));
      let cssTop = oldCssTop;
      baseAdjust = parentRect.bottom + 2 - ttRect.top;
      cssTop += baseAdjust;
      cssTop = cssTop.toFixed(3);
      if ((oldCssTop.toFixed(3) != cssTop) || changedStyle) {
        newStyle += `top: ${cssTop}px;`;
        changedStyle = true;
      }
      if (changedStyle) {
        spanTT.setAttribute("style", newStyle);
      }
    }
  }, true);
  let diagSummary = document.getElementById("diagsummary");
  let diagHolder = diagSummary.parentNode;
  {
    let cNode = diagSummary.cloneNode(false);
    diagHolder.replaceChild(cNode, diagSummary);
    diagSummary = cNode;
  }
  let pElem = document.createElement('p');
  pElem.appendChild(document.createTextNode('Blocks found:'));
  diagSummary.appendChild(pElem);
  pElem = document.createElement('p');
  var lockedBlockHl = false;
  for (let block of blocks) {
    let blockClass = block.replace(/ *\(.*/, '').replace(/ /g, '_');
    let sElem = document.createElement('span');
    sElem.setAttribute("class", blockClass);
    sElem.appendChild(document.createTextNode(block));
    sElem.addEventListener("mouseout", function(){
      if (!lockedBlockHl) {
        diagHolder.setAttribute('class', '');
      }
    });
    sElem.addEventListener("mouseover", function(){
      if (!lockedBlockHl) {
        diagHolder.setAttribute('class', 'hl_' + blockClass);
      };
    });
    sElem.addEventListener("click", function(){
      lockedBlockHl = ! lockedBlockHl;
      if (lockedBlockHl) {
        pElem.setAttribute('class', 'locked');
      } else {
        pElem.setAttribute('class', '');
      }
      diagHolder.setAttribute('class', 'hl_' + blockClass);
    });
    sElem.setAttribute("style", "min-width: 20em; display: inline-block");
    pElem.appendChild(sElem);
    pElem.appendChild(document.createElement('br'));
  }
  diagSummary.appendChild(pElem);
  let v = document.getElementById("haystack");
  if (v !== skipElem) {
    v.value = inVal;
  }
  let UTF16cp = [];
  let UTF16bytes = '';
  let JSONic = '\u0022';
  let JSONmap = new Map([[92, '\\\\'],
                         [60, '\\u003C'],
                         [62, '\\u003E'],
                         [38, '\\u0026'],
                         [34, '\\\u0022'],
                         [8232, '\\u2028'],
                         [8233, '\\u2029'],
                         [8, '\\b'],
                         [10, '\\n'],
                         [13, '\\r'],
                         [9, '\\t']]);
  for (let i=0; i < inVal.length; i++) {
    let ch = inVal.charCodeAt(i);
    UTF16cp.push(ch.toString(16).padStart(4, '0')
                 .replace(/(..)(..)/, '$2\u00A0$1'));
    UTF16bytes += String.fromCharCode(ch % 256, Math.floor(ch / 256));
    if (JSONmap.has(ch)) {
      JSONic += JSONmap.get(ch);
    } else if (ch < 0x20 || ch > 0x7e) {
      JSONic += '\\u' + ch.toString(16).padStart(4, '0');
    } else {
      JSONic += inVal[i];
    }
  }
  v = document.getElementById("haystackCode");
  if (v !== skipElem) {
    let codeSelect = document.getElementById("codeType").value;
    switch(codeSelect) {
    case "json": v.value = JSONic + '\u0022'; break;
    case "c16": v.value = toCodeC16(inVal); break;
    case "c8": v.value = toCodeC8(inVal); break;
    case "python": v.value = toCodePython(inVal); break;
    case "go": v.value = toCodeGo(inVal); break;
    case "haskell": v.value = toCodeHaskell(inVal); break;
    case "html": v.value = toCodeHTML(inVal); break;
    case "xml": v.value = toCodeXML(inVal); break;
    case "re2": v.value = toCodeRE2(inVal); break;
    case "rust": v.value = toCodeRust(inVal); break;
    case "uri": v.value = encodeURIComponent(inVal); break;
    }
  }
  v = document.getElementById("haystackUTF8")
  if (v !== skipElem) {
    let wtfEd = wtf8.encode(inVal);
    if (document.getElementById('base64_utf8').checked) {
      v.value = btoa(wtfEd);
    } else {
      v.value = [...wtfEd].map(
        x => x.charCodeAt(0).toString(16).padStart(2, '0')).join(" ");
    }
  }
  v = document.getElementById("haystackUTF16");
  if (v !== skipElem) {
    if (document.getElementById('base64_utf16').checked) {
      v.value = btoa(UTF16bytes);
    } else {
      v.value = UTF16cp.join(' ');
    }
  }
  v = document.getElementById("haystackUnicode");
  if (v !== skipElem) {
    v.value = uninames.join('\n');
  }
  if (b64re.test(inVal)) {
    let bytes = atob(inVal);
    if (bytes.length % 2) {
      document.body.classList.remove('showIB64UTF16');
    } else {
      document.body.classList.add('showIB64UTF16');
    }
    try {
      wtf8.decode(bytes);
      document.body.classList.add('showIB64UTF8');
    } catch (e) {
      document.body.classList.remove('showIB64UTF8');
    }
  } else {
    document.body.classList.remove('showIB64UTF8');
    document.body.classList.remove('showIB64UTF16');
  }
  if (inVal.match(/[^\x00-\x7F]/)) {
    if (inVal.match(/^[\x00-\xFF]+$/)) {
      try {
        wtf8.decode(inVal);
        document.body.classList.add('showIUTF8AS88591');
      } catch (e) {
        document.body.classList.remove('showIUTF8AS88591');
      }
    } else
      document.body.classList.remove('showIUTF8AS88591');
    try {
      let w = windows1252encode(inVal);
      if (inVal != w) {
        wtf8.decode(w);
        document.body.classList.add('showIUTF8ASWIN1252');
      } else {
        document.body.classList.remove('showIUTF8ASWIN1252');
      }
    } catch (e) {
      document.body.classList.remove('showIUTF8ASWIN1252');
    }
  } else {
    document.body.classList.remove('showIUTF8AS88591');
    document.body.classList.remove('showIUTF8ASWIN1252');
  }
  chrome.storage.local.set({ unistring: inVal });
}
async function runRebuild(valueMaker, skipElem, extraError) {
  let errh = document.getElementById("errors");
  errh.innerHTML = '';
  if (extraError) {
    errh.appendChild(document.createTextNode(extraError));
  }
  try {
    await rebuild(valueMaker(), skipElem);
  } catch (e) {
    errh.appendChild(document.createTextNode(e));
  }
}
var rebuildPromise = null;
function triggerRebuild(converter) {
  return function() {
    let e = this;
    if (!rebuildPromise) {
      rebuildPromise = Promise.resolve(1).then(
        () => {
          runRebuild(() => converter(e.value), e);
          rebuildPromise = null;
        });
    }
  };
}
function id(x) {return x;}

function fromCode(v) {
  let codeSelect = document.getElementById("codeType").value;
  switch(codeSelect) {
  case "json": return fromCodeJSON(v);
  case "c16": return fromCodeC16(v);
  case "c8": return fromCodeC8(v);
  case "python": return fromCodePython(v);
  case "go": return fromCodeGo(v);
  case "haskell": return fromCodeHaskell(v);
  case "re2": return fromCodeRE2(v);
  case "rust": return fromCodeRust(v);
  case "html": return fromCodeHTML(v);
  case "xml": return fromCodeHTML(v);
  case "uri": return decodeURIComponent(v);
  }
}

function fromCodeHTML(x) {
  let tdiv = document.createElement('span');
  x = x.replace(/</g, '&lt;');
  x = x.replace(/>/g, '&gt;');
  tdiv.innerHTML = x;
  return tdiv.textContent;
}

const ReverseHTMLEscapes = new Map(
  [[0x0021, "&exclamation;"],
   [0x0022, "&quot;"],
   [0x0025, "&percent;"],
   [0x0026, "&amp;"],
//   [0x0027, "&apos;"],  // not in HTML 4
   [0x002B, "&add;"],
   [0x003C, "&lt;"],
   [0x003D, "&equal;"],
   [0x003E, "&gt;"],
   [0x00A0, "&nbsp;"],
   [0x00A1, "&iexcl;"],
   [0x00A2, "&cent;"],
   [0x00A3, "&pound;"],
   [0x00A4, "&curren;"],
   [0x00A5, "&yen;"],
   [0x00A6, "&brvbar;"],
   [0x00A7, "&sect;"],
   [0x00A8, "&uml;"],
   [0x00A9, "&copy;"],
   [0x00AA, "&ordf;"],
   [0x00AB, "&laquo;"],
   [0x00AC, "&not;"],
   [0x00AD, "&shy;"],
   [0x00AE, "&reg;"],
   [0x00AF, "&macr;"],
   [0x00B0, "&deg;"],
   [0x00B1, "&plusmn;"],
   [0x00B2, "&sup2;"],
   [0x00B3, "&sup3;"],
   [0x00B4, "&acute;"],
   [0x00B5, "&micro;"],
   [0x00B6, "&para;"],
   [0x00B7, "&middot;"],
   [0x00B8, "&cedil;"],
   [0x00B9, "&sup1;"],
   [0x00BA, "&ordm;"],
   [0x00BB, "&raquo;"],
   [0x00BC, "&frac14;"],
   [0x00BD, "&frac12;"],
   [0x00BE, "&frac34;"],
   [0x00BF, "&iquest;"],
   [0x00C0, "&Agrave;"],
   [0x00C1, "&Aacute;"],
   [0x00C2, "&Acirc;"],
   [0x00C3, "&Atilde;"],
   [0x00C4, "&Auml;"],
   [0x00C5, "&Aring;"],
   [0x00C6, "&AElig;"],
   [0x00C7, "&Ccedil;"],
   [0x00C8, "&Egrave;"],
   [0x00C9, "&Eacute;"],
   [0x00CA, "&Ecirc;"],
   [0x00CB, "&Euml;"],
   [0x00CC, "&Igrave;"],
   [0x00CD, "&Iacute;"],
   [0x00CE, "&Icirc;"],
   [0x00CF, "&Iuml;"],
   [0x00D0, "&ETH;"],
   [0x00D1, "&Ntilde;"],
   [0x00D2, "&Ograve;"],
   [0x00D3, "&Oacute;"],
   [0x00D4, "&Ocirc;"],
   [0x00D5, "&Otilde;"],
   [0x00D6, "&Ouml;"],
   [0x00D7, "&times;"],
   [0x00D8, "&Oslash;"],
   [0x00D9, "&Ugrave;"],
   [0x00DA, "&Uacute;"],
   [0x00DB, "&Ucirc;"],
   [0x00DC, "&Uuml;"],
   [0x00DD, "&Yacute;"],
   [0x00DE, "&THORN;"],
   [0x00DF, "&szlig;"],
   [0x00E0, "&agrave;"],
   [0x00E1, "&aacute;"],
   [0x00E2, "&acirc;"],
   [0x00E3, "&atilde;"],
   [0x00E4, "&auml;"],
   [0x00E5, "&aring;"],
   [0x00E6, "&aelig;"],
   [0x00E7, "&ccedil;"],
   [0x00E8, "&egrave;"],
   [0x00E9, "&eacute;"],
   [0x00EA, "&ecirc;"],
   [0x00EB, "&euml;"],
   [0x00EC, "&igrave;"],
   [0x00ED, "&iacute;"],
   [0x00EE, "&icirc;"],
   [0x00EF, "&iuml;"],
   [0x00F0, "&eth;"],
   [0x00F1, "&ntilde;"],
   [0x00F2, "&ograve;"],
   [0x00F3, "&oacute;"],
   [0x00F4, "&ocirc;"],
   [0x00F5, "&otilde;"],
   [0x00F6, "&ouml;"],
   [0x00F7, "&divide;"],
   [0x00F8, "&oslash;"],
   [0x00F9, "&ugrave;"],
   [0x00FA, "&uacute;"],
   [0x00FB, "&ucirc;"],
   [0x00FC, "&uuml;"],
   [0x00FD, "&yacute;"],
   [0x00FE, "&thorn;"],
   [0x00FF, "&yuml;"],
   [0x0152, "&OElig;"],
   [0x0153, "&oelig;"],
   [0x0160, "&Scaron;"],
   [0x0161, "&scaron;"],
   [0x0178, "&Yuml;"],
   [0x0192, "&fnof;"],
   [0x02C6, "&circ;"],
   [0x02DC, "&tilde;"],
   [0x0391, "&Alpha;"],
   [0x0392, "&Beta;"],
   [0x0393, "&Gamma;"],
   [0x0394, "&Delta;"],
   [0x0395, "&Epsilon;"],
   [0x0396, "&Zeta;"],
   [0x0397, "&Eta;"],
   [0x0398, "&Theta;"],
   [0x0399, "&Iota;"],
   [0x039A, "&Kappa;"],
   [0x039B, "&Lambda;"],
   [0x039C, "&Mu;"],
   [0x039D, "&Nu;"],
   [0x039E, "&Xi;"],
   [0x039F, "&Omicron;"],
   [0x03A0, "&Pi;"],
   [0x03A1, "&Rho;"],
   [0x03A3, "&Sigma;"],
   [0x03A4, "&Tau;"],
   [0x03A5, "&Upsilon;"],
   [0x03A6, "&Phi;"],
   [0x03A7, "&Chi;"],
   [0x03A8, "&Psi;"],
   [0x03A9, "&Omega;"],
   [0x03B1, "&alpha;"],
   [0x03B2, "&beta;"],
   [0x03B3, "&gamma;"],
   [0x03B4, "&delta;"],
   [0x03B5, "&epsilon;"],
   [0x03B6, "&zeta;"],
   [0x03B7, "&eta;"],
   [0x03B8, "&theta;"],
   [0x03B9, "&iota;"],
   [0x03BA, "&kappa;"],
   [0x03BB, "&lambda;"],
   [0x03BC, "&mu;"],
   [0x03BD, "&nu;"],
   [0x03BE, "&xi;"],
   [0x03BF, "&omicron;"],
   [0x03C0, "&pi;"],
   [0x03C1, "&rho;"],
   [0x03C2, "&sigmaf;"],
   [0x03C3, "&sigma;"],
   [0x03C4, "&tau;"],
   [0x03C5, "&upsilon;"],
   [0x03C6, "&phi;"],
   [0x03C7, "&chi;"],
   [0x03C8, "&psi;"],
   [0x03C9, "&omega;"],
   [0x03D1, "&thetasym;"],
   [0x03D2, "&upsih;"],
   [0x03D6, "&piv;"],
   [0x2002, "&ensp;"],
   [0x2003, "&emsp;"],
   [0x2009, "&thinsp;"],
   [0x200C, "&zwnj;"],
   [0x200D, "&zwj;"],
   [0x200E, "&lrm;"],
   [0x200F, "&rlm;"],
   [0x2013, "&ndash;"],
   [0x2014, "&mdash;"],
   [0x2015, "&horbar;"],
   [0x2018, "&lsquo;"],
   [0x2019, "&rsquo;"],
   [0x201A, "&sbquo;"],
   [0x201C, "&ldquo;"],
   [0x201D, "&rdquo;"],
   [0x201E, "&bdquo;"],
   [0x2020, "&dagger;"],
   [0x2021, "&Dagger;"],
   [0x2022, "&bull;"],
   [0x2026, "&hellip;"],
   [0x2030, "&permil;"],
   [0x2032, "&prime;"],
   [0x2033, "&Prime;"],
   [0x2039, "&lsaquo;"],
   [0x203A, "&rsaquo;"],
   [0x203E, "&oline;"],
   [0x2044, "&frasl;"],
   [0x20AC, "&euro;"],
   [0x2111, "&image;"],
   [0x2118, "&weierp;"],
   [0x211C, "&real;"],
   [0x2122, "&trade;"],
   [0x2135, "&alefsym;"],
   [0x2190, "&larr;"],
   [0x2191, "&uarr;"],
   [0x2192, "&rarr;"],
   [0x2193, "&darr;"],
   [0x2194, "&harr;"],
   [0x21B5, "&crarr;"],
   [0x21D0, "&lArr;"],
   [0x21D1, "&uArr;"],
   [0x21D2, "&rArr;"],
   [0x21D3, "&dArr;"],
   [0x21D4, "&hArr;"],
   [0x2200, "&forall;"],
   [0x2202, "&part;"],
   [0x2203, "&exist;"],
   [0x2205, "&empty;"],
   [0x2207, "&nabla;"],
   [0x2208, "&isin;"],
   [0x2209, "&notin;"],
   [0x220B, "&ni;"],
   [0x220F, "&prod;"],
   [0x2211, "&sum;"],
   [0x2212, "&minus;"],
   [0x2217, "&lowast;"],
   [0x221A, "&radic;"],
   [0x221D, "&prop;"],
   [0x221E, "&infin;"],
   [0x2220, "&ang;"],
   [0x2227, "&and;"],
   [0x2228, "&or;"],
   [0x2229, "&cap;"],
   [0x222A, "&cup;"],
   [0x222B, "&int;"],
   [0x2234, "&there4;"],
   [0x223C, "&sim;"],
   [0x2245, "&cong;"],
   [0x2248, "&asymp;"],
   [0x2260, "&ne;"],
   [0x2261, "&equiv;"],
   [0x2264, "&le;"],
   [0x2265, "&ge;"],
   [0x2282, "&sub;"],
   [0x2283, "&sup;"],
   [0x2284, "&nsub;"],
   [0x2286, "&sube;"],
   [0x2287, "&supe;"],
   [0x2295, "&oplus;"],
   [0x2297, "&otimes;"],
   [0x22A5, "&perp;"],
   [0x22C5, "&sdot;"],
   [0x2308, "&lceil;"],
   [0x2309, "&rceil;"],
   [0x230A, "&lfloor;"],
   [0x230B, "&rfloor;"],
   // [0x2329, "&lang;"],  // Not for HTML5
   // [0x232A, "&rang;"],
   [0x25CA, "&loz;"],
   [0x2660, "&spades;"],
   [0x2663, "&clubs;"],
   [0x2665, "&hearts;"],
   [0x2666, "&diams;"]]);

function toCodeHTML(v) {
  let r = /((?:(?!['"<>&])[ -~])+)|([\uD800-\uDBFF][\uDC00-\uDFFF]|[^])/g;
  let ret = '';
  let m = null;
  while (m = r.exec(v)) {
    if (m[1]) {
      ret += m[1];
      continue;
    }
    let cp = m[2].codePointAt(0);
    if (ReverseHTMLEscapes.has(cp)) {
      ret += ReverseHTMLEscapes.get(cp);
      continue;
    }
    if (cp < 128) {
      ret += '&#' + Number(cp).toString(10) + ';';
      continue;
    }
    ret += '&#x' + Number(cp).toString(16).padStart(4, '0') + ';';
  }
  return ret;
}

const ReverseXMLEscapes = new Map([[0x22, '&quot;'],
                                   [0x26, '&amp;'],
                                   [0x27, '&apos;'],
                                   [0x3C, '&lt;'],
                                   [0x3E, '&gt;']]);

function toCodeXML(v) {
  let r = /((?:(?!['"<>&])[ -~])+)|([\uD800-\uDBFF][\uDC00-\uDFFF]|[^])/g;
  let ret = '';
  let m = null;
  while (m = r.exec(v)) {
    if (m[1]) {
      ret += m[1];
      continue;
    }
    let cp = m[2].codePointAt(0);
    if (ReverseXMLEscapes.has(cp)) {
      ret += ReverseXMLEscapes.get(cp);
      continue;
    }
    if (cp < 128) {
      ret += '&#' + Number(cp).toString(10) + ';';
      continue;
    }
    ret += '&#x' + Number(cp).toString(16).padStart(4, '0') + ';';
  }
  return ret;
}

function fromCodeJSON(x) {
  let s = JSON.parse(x);
  if (typeof s === 'string') {
    return s;
  }
  throw "JSON object not a string";
}

function fromU8(v) {
  let isB64 = document.getElementById("base64_utf8").checked;
  let bytes;
  if (isB64) {
    if (b64re.test(v)) {
      bytes = atob(v);
    } else {
      throw "Invalid base64";
    }
  } else {
    let re = /\S\S?/g;
    let cps = (v.match(re) || []).map((x) => {
      if (x.length < 2) {throw "Incomplete UTF-8 byte";}
      let s = parseInt(x, 16);
      if (Number.isNaN(s) || /[^a-fA-F0-9]/.test(x)) {
        throw ("Invalid byte '" + x + "' in UTF-8 input");
      }
      return s;
    });
    bytes = String.fromCharCode(...cps);
  }
  try {
    return wtf8.decode(bytes);
  } catch (e) {
    throw `UTF-8 decoding error: ${e}`;
  }
}
function fromU16LE(v) {
  let isB64 = document.getElementById("base64_utf16").checked;
  let cps = [];
  if (isB64) {
    let bytes;
    if (b64re.test(v)) {
      bytes = atob(v);
    } else {
      throw "Invalid base64";
    }
    if (bytes.length % 2) {
      throw "base64 decoded to an odd number of bytes";
    }
    for (let i=0; i < bytes.length; i += 2) {
      cps.push((bytes.charCodeAt(i+1) << 8) + bytes.charCodeAt(i));
    }
  } else {
    let re = /(\S\S?)(?:\s*(\S\S?))?/g;
    let m;
    while ((m = re.exec(v)) !== null) {
      if (m[1].length < 2) {throw "Incomplete UTF-16le low byte";}
      if (!m[2]) {throw "Incomplete ITF-16le WCHAR";}
      if (m[2].length < 2) {throw "Incomplete UTF-16le high byte";}
      let s1 = parseInt(m[1], 16);
      let s2 = parseInt(m[2], 16);
      if (Number.isNaN(s1) || /[^a-fA-F0-9]/.test(m[1])) {
        throw "Invalid UTF-16le low byte '" + m[1] + "'";
      }
      if (Number.isNaN(s2) || /[^a-fA-F0-9]/.test(m[2])) {
        throw "Invalid UTF-16le high byte '" + m[2] + "'";
      }
      cps.push((s2 << 8) + s1);
    }
  }
  return String.fromCharCode(...cps);
}
const windows1252mapping =
      [0x0000, 0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006, 0x0007,
       0x0008, 0x0009, 0x000a, 0x000b, 0x000c, 0x000d, 0x000e, 0x000f,
       0x0010, 0x0011, 0x0012, 0x0013, 0x0014, 0x0015, 0x0016, 0x0017,
       0x0018, 0x0019, 0x001a, 0x001b, 0x001c, 0x001d, 0x001e, 0x001f,
       0x0020, 0x0021, 0x0022, 0x0023, 0x0024, 0x0025, 0x0026, 0x0027,
       0x0028, 0x0029, 0x002a, 0x002b, 0x002c, 0x002d, 0x002e, 0x002f,
       0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037,
       0x0038, 0x0039, 0x003a, 0x003b, 0x003c, 0x003d, 0x003e, 0x003f,
       0x0040, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047,
       0x0048, 0x0049, 0x004a, 0x004b, 0x004c, 0x004d, 0x004e, 0x004f,
       0x0050, 0x0051, 0x0052, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057,
       0x0058, 0x0059, 0x005a, 0x005b, 0x005c, 0x005d, 0x005e, 0x005f,
       0x0060, 0x0061, 0x0062, 0x0063, 0x0064, 0x0065, 0x0066, 0x0067,
       0x0068, 0x0069, 0x006a, 0x006b, 0x006c, 0x006d, 0x006e, 0x006f,
       0x0070, 0x0071, 0x0072, 0x0073, 0x0074, 0x0075, 0x0076, 0x0077,
       0x0078, 0x0079, 0x007a, 0x007b, 0x007c, 0x007d, 0x007e, 0x007f,
       0x20ac, 0x0081, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021,
       0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x008d, 0x017d, 0x008f,
       0x0090, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
       0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x009d, 0x017e, 0x0178,
       0x00a0, 0x00a1, 0x00a2, 0x00a3, 0x00a4, 0x00a5, 0x00a6, 0x00a7,
       0x00a8, 0x00a9, 0x00aa, 0x00ab, 0x00ac, 0x00ad, 0x00ae, 0x00af,
       0x00b0, 0x00b1, 0x00b2, 0x00b3, 0x00b4, 0x00b5, 0x00b6, 0x00b7,
       0x00b8, 0x00b9, 0x00ba, 0x00bb, 0x00bc, 0x00bd, 0x00be, 0x00bf,
       0x00c0, 0x00c1, 0x00c2, 0x00c3, 0x00c4, 0x00c5, 0x00c6, 0x00c7,
       0x00c8, 0x00c9, 0x00ca, 0x00cb, 0x00cc, 0x00cd, 0x00ce, 0x00cf,
       0x00d0, 0x00d1, 0x00d2, 0x00d3, 0x00d4, 0x00d5, 0x00d6, 0x00d7,
       0x00d8, 0x00d9, 0x00da, 0x00db, 0x00dc, 0x00dd, 0x00de, 0x00df,
       0x00e0, 0x00e1, 0x00e2, 0x00e3, 0x00e4, 0x00e5, 0x00e6, 0x00e7,
       0x00e8, 0x00e9, 0x00ea, 0x00eb, 0x00ec, 0x00ed, 0x00ee, 0x00ef,
       0x00f0, 0x00f1, 0x00f2, 0x00f3, 0x00f4, 0x00f5, 0x00f6, 0x00f7,
       0x00f8, 0x00f9, 0x00fa, 0x00fb, 0x00fc, 0x00fd, 0x00fe, 0x00ff];
const windows1252ReverseMapping = (() => {
  let m = new Map();
  windows1252mapping.forEach(
    (val, i) => m.set(String.fromCodePoint(val), String.fromCodePoint(i)));
  return m;
})();

function windows1252encode(v) {
  if (!v) {
    return v;
  }
  let ch;
  let ret = '';
  for (ch of v) {
    if (windows1252ReverseMapping.has(ch)) {
      ret += windows1252ReverseMapping.get(ch);
    } else {
      throw `Can't represent character ${ch.codePointAt(0)} in windows-1252`;
    }
  }
  return ret;
}

function fromUnicodeCP(v) {
  let re = /U\+[A-Ta-z0-9V-Z]+/g;
  let re2 = /^U\+(10|0?[0-9a-fA-F])?[0-9a-fA-F]{4}$/;
  let cps = (v.match(re) || []).map((x) => {
    if ((x.length > 8) || (x.length < 6) ||
        (!re2.test(x))) {throw ("Invalid U+ codepoint: " + x);}
    return parseInt(x.substr(2), 16);
  });
  return String.fromCodePoint(...cps);
}
const CSimpleEscapeMap = new Map([['n', '\n'],
                                  ['t', '\t'],
                                  ['v', '\v'],
                                  ['b', '\b'],
                                  ['r', '\r'],
                                  ['f', '\f'],
                                  ['a', '\x07'],
                                  ['"', '"'],
                                  ["'", "'"],
                                  ['\\', '\\'],
                                  ['?', '?']]);
const ReverseCSimpleEscapeMap = new Map(
  Array.from(CSimpleEscapeMap.entries()).map(
    (x) => [x[1].charCodeAt(0), x[0]]));

function fromCodeCGeneric(v, startre, numlim, cfunc, nfunc) {
  v = v.trim();
  let ret = '';
  let initial = v.match(RegExp(`^(?:${startre})([^\n"\\\\]*)`));
  if (initial === null) {
    throw `values must begin with ${startre}`;
  }
  let m;
  let r = RegExp('(?:' + /(?:\\(?:(?<simple>[ntvbrfa\'\"\\?])|(?<octal>[0-7]{1,3})|(?<hex>x[0-9a-fA-F]+)|(?<unicode>u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})|(?<shortuni>u[0-9a-fA-F]{0,3}|U[0-9a-fA-F]{0,7})|(?<shorthex>x)|(?<esceol>\n)|(?<unknown>[^])|(?<unfinished>)))/.source + `|(?<restart>\\"\\s*(?:${startre})))` + /(?<remainder>[^\"\\\n]*)|(?<badeol>\n)|(?<endq>\")/.source, 'g');
  ret = cfunc(initial[1]);
  r.lastIndex = initial[0].length;
  let foundEnd = false;
  while (r.lastIndex < v.length) {
    let l = r.lastIndex;
    m = r.exec(v);
    if (!m || m.index != l) {
      throw `Internal error at index ${l} of "${v}"`;
    }
    let g = m.groups;
    if (g.simple) {
      ret += cfunc(CSimpleEscapeMap.get(g.simple));
    }
    if (g.badeol) {
      throw 'unescaped newline in string';
    }
    if (g.octal) {
      let ival = parseInt(g.octal, 8);
      if (ival > numlim) {
        throw `\\${g.octal}: octal escape sequence out of range`;
      }
      ret += nfunc(ival);
    }
    if (g.hex) {
      let ival = parseInt(g.hex.substr(1), 16);
      if (ival > numlim) {
        throw `\\${g.hex}: hex escape sequence out of range`;
      }
      ret += nfunc(ival);
    }
    if (g.unicode) {
      let ival = parseInt(g.unicode.substr(1), 16);
      if (ival > 0x10FFFF || (ival >= 0xD800 && ival < 0xE000)) {
        throw `\\${g.unicode}: a universal character name specifies an invalid character`;
      }
      ret += cfunc(String.fromCodePoint(ival));
    }
    if (g.shortuni) {
      throw `incomplete universal character name \\${g.shortuni}`;
    }
    if (g.shorthex) {
      throw `\\x used with no following hex digit`;
    }
    if (g.unknown) {
      throw `\\${g.unknown}: unrecognized character escape sequence`;
    }
    if (g.unfinished !== undefined) {
      throw `Unexpected EOF`;
    }
    if (g.remainder) {
      ret += cfunc(g.remainder);
    }
    if (g.endq) {
      foundEnd = true;
      break;
    }
  }
  if (r.lastIndex < v.length) {
    throw `Trailing garbage at the end of the string: '${v.substr(r.lastIndex)}'`;
  }
  if (!foundEnd) {
    throw "String not terminated";
  }
  return ret;
}

function fromCodeC16(v) {
  // v, startre, numlim, cfunc, nfunc
  return fromCodeCGeneric(v, 'L"|u16"|u"', 0xFFFF, (x)=>x, String.fromCharCode);
}

function fromCodeC8(v) {
  let utf8bytes = fromCodeCGeneric(v, '"|u8"', 0xFF, wtf8.encode, String.fromCharCode);
  return wtf8.decode(utf8bytes);
}

function toCodeCGeneric(v, start, hexlim) {
  let r = /((?:(?![\\"])[ -~])+)|([\uD800-\uDBFF][\uDC00-\uDFFF]|[^])/g;
  let ret = start;
  let m = null;
  while (m = r.exec(v)) {
    if (m[1]) {
      ret += m[1];
      continue;
    }
    let cp = m[2].codePointAt(0);
    if (ReverseCSimpleEscapeMap.has(cp)) {
      ret += '\\' + ReverseCSimpleEscapeMap.get(cp);
      continue;
    }
    if (cp == 0) {
      let nextCharIsOctDigit = false;
      if (r.lastIndex < v.length) {
        nextCharIsOctDigit = !!(v.charAt(r.lastIndex).match(/[0-7]/));
      }
      if (nextCharIsOctDigit) {
        ret += '\\000';
      } else {
        ret += '\\0';
      }
      continue;
    }
    if (cp <= hexlim) {
      let nextCharIsHexDigit = false;
      if (r.lastIndex < v.length) {
        nextCharIsHexDigit = !!(v.charAt(r.lastIndex).match(/[0-9a-fA-F]/));
      }
      if (nextCharIsHexDigit) {
        ret += '\\' + Number(cp).toString(8).padStart(3, '0');
      } else {
        ret += '\\x' + Number(cp).toString(16);
      }
      continue;
    }
    if (cp <= 0xFFFF) {
      ret += '\\u' + Number(cp).toString(16).padStart(4, '0');
      continue;
    }
    ret += '\\U' + Number(cp).toString(16).padStart(8, '0');
  }
  ret += '"';
  return ret;
}

function toCodeC16(v) {
  return toCodeCGeneric(v, 'L"', 255);
}

function toCodeC8(v) {
  return toCodeCGeneric(v, 'u8"', 127);
}

const RustSimpleEscapeMap = new Map([['n', '\n'],
                                     ['t', '\t'],
                                     ['r', '\r'],
                                     ['0', '\0'],
                                     ['"', '"'],
                                     ["'", "'"],
                                     ['\\', '\\']]);
const ReverseRustSimpleEscapeMap = new Map(
  Array.from(RustSimpleEscapeMap.entries()).map(
    (x) => [x[1].charCodeAt(0), x[0]]));

function fromCodeRust(v) {
  v = v.trim();
  let ret = '';
  let initial = v.match(/^"([^\"\\]*)/);
  if (initial === null) {
    throw 'values must begin with a quote (")';
  }
  let m;
  let r = /(?:\\(?:(?<simple>[ntr\'\"\\0])|(?<hex>x[0-9a-fA-F]{2})|(?<unicode>u\{(?:[0-9a-fA-F]_*){1,6}\})|(?<shortuni>u(?:\{[^\}]*\}?)?)|(?<shorthex>x[0-9a-fA-F]?)|(?<skip>\n\s*)|(?<unknown>[^])|(?<unfinished>)))(?<remainder>[^\"\\]*)|(?<endq>\")/g;
  ret = initial[1];
  r.lastIndex = initial[0].length;
  let foundEnd = false;
  while (r.lastIndex < v.length) {
    let l = r.lastIndex;
    m = r.exec(v);
    if (!m || m.index != l) {
      throw `Internal error at index ${l} of "${v}"`;
    }
    let g = m.groups;
    if (g.simple) {
      ret += CSimpleEscapeMap.get(g.simple);
    }
    if (g.hex) {
      let ival = parseInt(g.hex.substr(1), 16);
      if (ival > 0x7F) {
        throw `\\${g.hex}: hex escape sequence out of range`;
      }
      ret += ival;
    }
    if (g.unicode) {
      let ipart = g.unicode.substring(2, g.unicode.length - 1).replace(/_/g, '');
      let ival = parseInt(ipart, 16);
      if (ival > 0x10FFFF || (ival >= 0xD800 && ival < 0xE000)) {
        throw `\\${g.unicode}: invalid unicode character escape`;
      }
      ret += String.fromCodePoint(ival);
    }
    if (g.shortuni) {
      throw `\\${g.shortuni}: invalid unicode character escape`;
    }
    if (g.shorthex) {
      throw `\\${g.shorthex}: numeric character escape is too short`;
    }
    if (g.unknown) {
      throw `\\${g.unknown}: unrecognized character escape sequence`;
    }
    if (g.unfinished !== undefined) {
      throw `Unexpected EOF`;
    }
    if (g.remainder) {
      ret += g.remainder;
    }
    if (g.endq) {
      foundEnd = true;
      break;
    }
  }
  if (r.lastIndex < v.length) {
    throw `Trailing garbage at the end of the string: '${v.substr(r.lastIndex)}'`;
  }
  if (!foundEnd) {
    throw "String not terminated";
  }
  return ret;
}

function toCodeRust(v) {
  let r = /((?:(?![\\"])[ -~])+)|([\uD800-\uDBFF][\uDC00-\uDFFF]|[^])/g;
  let ret = '"';
  let m = null;
  while (m = r.exec(v)) {
    if (m[1]) {
      ret += m[1];
      continue;
    }
    let cp = m[2].codePointAt(0);
    if (ReverseRustSimpleEscapeMap.has(cp)) {
      ret += '\\' + ReverseRustSimpleEscapeMap.get(cp);
      continue;
    }
    if (cp < 128) {
      ret += '\\x' + Number(cp).toString(16).padStart(2, '0');
      continue;
    }
    ret += '\\u{' + Number(cp).toString(16) + '}';
  }
  ret += '"';
  return ret;
}

const GoSimpleEscapeMap = new Map(
  [...'ntvbrfa\"\\'].map((c) => [c, CSimpleEscapeMap.get(c)]));
const ReverseGoSimpleEscapeMap = new Map(
  Array.from(GoSimpleEscapeMap.entries()).map(
    (x) => [x[1].charCodeAt(0), x[0]]));

function fromCodeGo(v) {
  v = v.trim();
  let ret = '';
  let initial = v.match(/^"([^"\\\n]*)/);
  if (initial === null) {
    throw `values must begin with "`;
  }
  let m;
  let r = /(?:\\(?:(?<simple>[ntvbrfa\"\\])|(?<octal>[0-7]{3})|(?<hex>x[0-9a-fA-F]{2})|(?<unicode>u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})|(?<shortuni>u[0-9a-fA-F]{0,3}|U[0-9a-fA-F]{0,7})|(?<shorthex>x[0-9a-fA-F]*.?)|(?<shortoct>[0-7]+.?)|(?<unknown>[^])|(?<unfinished>)))(?<remainder>[^\"\\\n]*)|(?<badeol>\n)|(?<endq>\")/g;
  ret = wtf8.encode(initial[1]);
  r.lastIndex = initial[0].length;
  let foundEnd = false;
  while (r.lastIndex < v.length) {
    let l = r.lastIndex;
    m = r.exec(v);
    if (!m || m.index != l) {
      throw `Internal error at index ${l} of "${v}"`;
    }
    let g = m.groups;
    if (g.simple) {
      ret += wtf8.encode(CSimpleEscapeMap.get(g.simple));
    }
    if (g.badeol) {
      throw 'newline in string';
    }
    if (g.octal) {
      let ival = parseInt(g.octal, 8);
      if (ival > 255) {
        throw `\\${g.octal}: octal escape value > 255: ${ival}`;
      }
      ret += String.fromCharCode(ival);
    }
    if (g.hex) {
      let ival = parseInt(g.hex.substr(1), 16);
      ret += String.fromCharCode(ival);
    }
    if (g.unicode) {
      let ival = parseInt(g.unicode.substr(1), 16);
      if (ival > 0x10FFFF || (ival >= 0xD800 && ival < 0xE000)) {
        throw `\\${g.unicode}: escape sequence is invalid Unicode code point`;
      }
      ret += wtf8.encode(String.fromCodePoint(ival));
    }
    if (g.shortuni) {
      throw `\\${g.shortuni}: invalid unicode escape`;
    }
    if (g.shorthex || g.shortoct) {
      throw `\\${g.shorthex||g.shortoct}: invalid numeric escape`;
    }
    if (g.unknown) {
      throw `\\${g.unknown}: unknown escape sequence`;
    }
    if (g.unfinished !== undefined) {
      throw `Unexpected EOF`;
    }
    if (g.remainder) {
      ret += wtf8.encode(g.remainder);
    }
    if (g.endq) {
      foundEnd = true;
      break;
    }
  }
  if (r.lastIndex < v.length) {
    throw `Trailing garbage at the end of the string: '${v.substr(r.lastIndex)}'`;
  }
  if (!foundEnd) {
    throw "String not terminated";
  }
  return wtf8.decode(ret);
}

function toCodeGo(v) {
  let r = /((?:(?![\\"])[ -~])+)|([\uD800-\uDBFF][\uDC00-\uDFFF]|[^])/g;
  let ret = '"';
  let m = null;
  while (m = r.exec(v)) {
    if (m[1]) {
      ret += m[1];
      continue;
    }
    let cp = m[2].codePointAt(0);
    if (ReverseGoSimpleEscapeMap.has(cp)) {
      ret += '\\' + ReverseGoSimpleEscapeMap.get(cp);
      continue;
    }
    if (cp < 128) {
      ret += '\\x' + Number(cp).toString(16).padStart(2, '0');
      continue;
    }
    if (cp <= 0xFFFF) {
      ret += '\\u' + Number(cp).toString(16).padStart(4, '0');
      continue;
    }
    ret += '\\U' + Number(cp).toString(16).padStart(8, '0');
  }
  ret += '"';
  return ret;
}

const PythonSimpleEscapeMap = new Map(
  [...'ntvbrfa\"\'\\'].map((c) => [c, CSimpleEscapeMap.get(c)]));
const ReversePythonSimpleEscapeMap = new Map(
  Array.from(PythonSimpleEscapeMap.entries()).map(
    (x) => [x[1].charCodeAt(0), x[0]]));

function fromCodePython(v) {
  v = v.trim();
  let strStartRe = /\s*("""|'''|"|')|()/g;
  let ret = '';
  let mStart;
  while (mStart = strStartRe.exec(v)) {
    if (mStart[2] !== undefined) {
      // Didn't match string start where expected
      break;
    }
    let initial, strRe, initialRe, m;
    switch (mStart[1]) {
    case '"""':
      strRe = /(?:\\(?:(?<simple>[ntvbrfa\'\"\\])|(?<octal>[0-7]{1,3})|(?<hex>x[0-9a-fA-F]{2})|(?<unicode>u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})|(?<shortuni>u[0-9a-fA-F]{0,3}|U[0-9a-fA-F]{0,7})|(?<shorthex>x[0-9a-fA-F]?)|(?<esceol>\n)|(?<unknown>[^])|(?<unfinished>)))(?<remainder>(?:[^\"\\]+|\"(?!""))*)|(?<endq>\""")/g;
      initialRe = /(?<remainder>(?:[^\"\\]+|\"(?!""))*)/g;
      break;
    case "'''":
      strRe = /(?:\\(?:(?<simple>[ntvbrfa\'\"\\])|(?<octal>[0-7]{1,3})|(?<hex>x[0-9a-fA-F]{2})|(?<unicode>u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})|(?<shortuni>u[0-9a-fA-F]{0,3}|U[0-9a-fA-F]{0,7})|(?<shorthex>x[0-9a-fA-F]?)|(?<esceol>\n)|(?<unknown>[^])|(?<unfinished>)))(?<remainder>(?:[^\'\\]+|\'(?!''))*)|(?<endq>\''')/g;
      initialRe = /(?<remainder>(?:[^\'\\]+|\'(?!''))*)/g;
      break;
    case '"':
      strRe = /(?:\\(?:(?<simple>[ntvbrfa\'\"\\])|(?<octal>[0-7]{1,3})|(?<hex>x[0-9a-fA-F]{2})|(?<unicode>u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})|(?<shortuni>u[0-9a-fA-F]{0,3}|U[0-9a-fA-F]{0,7})|(?<shorthex>x[0-9a-fA-F]?)|(?<esceol>\n)|(?<unknown>[^])|(?<unfinished>)))(?<remainder>[^\"\\\n]*)|(?<endq>\")|(?<badeol>\n)/g;
      initialRe = /(?<remainder>[^\"\\\n]*)/g;
      break;
    case "'":
      strRe = /(?:\\(?:(?<simple>[ntvbrfa\'\"\\])|(?<octal>[0-7]{1,3})|(?<hex>x[0-9a-fA-F]{2})|(?<unicode>u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})|(?<shortuni>u[0-9a-fA-F]{0,3}|U[0-9a-fA-F]{0,7})|(?<shorthex>x[0-9a-fA-F]?)|(?<esceol>\n)|(?<unknown>[^])|(?<unfinished>)))(?<remainder>[^\'\\\n]*)|(?<endq>\')|(?<badeol>\n)/g;
      initialRe = /(?<remainder>[^\'\\\n]*)/g;
      break;
    }
    initialRe.lastIndex = strStartRe.lastIndex;
    m = initialRe.exec(v);
    ret += m.groups.remainder;
    strRe.lastIndex = initialRe.lastIndex;
    let foundEnd = false;
    while (strRe.lastIndex < v.length) {
      let l = strRe.lastIndex;
      m = strRe.exec(v);
      if (!m || m.index != l) {
        throw `Internal error at index ${l} of "${v}"`;
      }
      let g = m.groups;
      if (g.simple) {
        ret += PythonSimpleEscapeMap.get(g.simple);
      }
      if (g.badeol) {
        throw 'EOL while scanning string literal';
      }
      if (g.octal) {
        let ival = parseInt(g.octal, 8);
        ret += String.fromCodePoint(ival);
      }
      if (g.hex) {
        let ival = parseInt(g.hex.substr(1), 16);
        ret += String.fromCodePoint(ival);
      }
      if (g.unicode) {
        let ival = parseInt(g.unicode.substr(1), 16);
        if (ival > 0x10FFFF) {
          throw `\\${g.unicode}: illegal Unicode character`;
        }
        ret += String.fromCodePoint(ival);
      }
      if (g.shortuni) {
        throw `\\${g.shortuni}: truncated \\UXXXXXXXX or \\uXXXX escape`;
      }
      if (g.shorthex) {
        throw `\\${g.shorthex}: truncated \\xXX escape`;
      }
      if (g.unknown) {
        ret += '\\' + g.unknown;
      }
      if (g.unfinished !== undefined) {
        throw `Unexpected EOF`;
      }
      if (g.remainder) {
        ret += g.remainder;
      }
      if (g.endq) {
        foundEnd = true;
        break;
      }
    }
    if (!foundEnd) {
      throw "String not terminated";
    }
    strStartRe.lastIndex = strRe.lastIndex;
  }
  if (strStartRe.lastIndex < v.length) {
    throw `Trailing garbage at the end of the string: '${v.substr(strStartRe.lastIndex)}'`;
  }
  return ret;
}

function toCodePython(v) {
  let ret = '';
  let qchar, r;
  if (v.includes("'") && !v.includes('"')) {
    qchar = '"';
    r = /((?:(?![\\"])[ -~])+)|([\uD800-\uDBFF][\uDC00-\uDFFF]|[^])/g;
  } else {
    qchar = "'";
    r = /((?:(?![\\'])[ -~])+)|([\uD800-\uDBFF][\uDC00-\uDFFF]|[^])/g;
  }
  ret += qchar;
  let m = null;
  while (m = r.exec(v)) {
    if (m[1]) {
      ret += m[1];
      continue;
    }
    let cp = m[2].codePointAt(0);
    if (ReversePythonSimpleEscapeMap.has(cp)) {
      ret += '\\' + ReversePythonSimpleEscapeMap.get(cp);
      continue;
    }
    if (cp < 256) {
      ret += '\\x' + Number(cp).toString(16).padStart(2, '0');
      continue;
    }
    if (cp <= 0xFFFF) {
      ret += '\\u' + Number(cp).toString(16).padStart(4, '0');
      continue;
    }
    ret += '\\U' + Number(cp).toString(16).padStart(8, '0');
  }
  ret += qchar;
  return ret;
}

const HaskellSimpleEscapeMap = new Map(
  [...'ntvbrfa\"\\'].map((c) => [c, CSimpleEscapeMap.get(c)]));
const ReverseHaskellSimpleEscapeMap = new Map(
  Array.from(HaskellSimpleEscapeMap.entries()).map(
    (x) => [x[1].charCodeAt(0), x[0]]));
HaskellSimpleEscapeMap.set('0', '\0');
HaskellSimpleEscapeMap.set("'", "'");
const HaskellAscCodes = ["NUL", "SOH", "STX", "ETX", "EOT", "ENQ", "ACK",
                         "BEL", "BS", "HT", "LF", "VT", "FF", "CR", "SO",
                         "SI", "DLE", "DC1", "DC2", "DC3", "DC4", "NAK",
                         "SYN", "ETB", "CAN", "EM", "SUB", "ESC", "FS", "GS",
                         "RS", "US", "SP", "DEL"]

function fromCodeHaskell(v) {
  v = v.trim();
  let ret = '';
  let initial = v.match(/^"([^"\\\n]*)/);
  if (initial === null) {
    throw `values must begin with "`;
  }
  ret += initial[1];
  let m;

  let asc_codes_r = HaskellAscCodes.join('|');
  let asc_codes_map = new Map([]);
  HaskellAscCodes.forEach((nom, idx) => {
    if (nom != 'DEL') {
      asc_codes_map.set(nom, String.fromCharCode(idx));
    } else {
      asc_codes_map.set(nom, String.fromCharCode(0x7f));
    }
  });
  let bs_follows = [/(?<simple>[ntvbrfa\'\"\\0])/,
                    /(?<hex>x[0-9a-fA-F]+)|(?<dec>[0-9]+)|(?<oct>o[0-7]+)/,
                    /(?<ascctrl>\^[@-_])/,
                    /(?<skip>\&)|(?<skip2>\n\s*\\)/,
                    RegExp(`(?<asc_code>${asc_codes_r})`),
                    /(?:[xo]|\n\s*|)(?<bad>[^]?)/].map((x) => x.source).join('|');
  let bs_escape = RegExp(`(?:\\\\(?:${bs_follows}))`
                         + /(?<remainder>[^\"\\]*)/.source);
  let r = RegExp(bs_escape.source + '|(?<endq>\")|(?<badeol>\n)', 'g');
  r.lastIndex = initial[0].length;
  let foundEnd = false;
  while (r.lastIndex < v.length) {
    let l = r.lastIndex;
    m = r.exec(v);
    if (!m || m.index != l) {
      throw `Internal error at index ${l} of "${v}"`;
    }
    let g = m.groups;
    if (g.simple) {
      ret += HaskellSimpleEscapeMap.get(g.simple);
    }
    if (g.hex || g.dec || g.oct) {
      let ival;
      if (g.hex) ival = parseInt(g.hex.substr(1), "16");
      if (g.dec) ival = parseInt(g.dec, "10");
      if (g.oct) ival = parseInt(g.oct.substr(1), "8");
      if (ival > 0x10FFFF) {
        throw `\\${g.hex || g.dec || g.oct}: numeric escape sequence out of range`;
      }
      ret += String.fromCodePoint(ival);
    }
    if (g.ascctrl) {
      ret += String.fromCodePoint(g.ascctrl.charCodeAt(1) - 40);
    }
    if (g.asc_code) {
      ret += asc_codes_map.get(g.asc_code);
    }
    if (g.bad !== undefined) {
      if (g.bad) {
        throw `lexical error in string literal at character '${g.bad}'`;
      }
      throw 'unexpected end-of-file in string literal';
    }
    if (g.remainder) {
      ret += g.remainder;
    }
    if (g.endq) {
      foundEnd = true;
      break;
    }
  }
  if (!foundEnd) {
    throw "String not terminated";
  }
  if (r.lastIndex < v.length) {
    throw `Trailing garbage at the end of the string: '${v.substr(r.lastIndex)}'`;
  }
  return ret;
}

function toCodeHaskell(v) {
  let r = /((?:(?![\\"])[ -~])+)|([\uD800-\uDBFF][\uDC00-\uDFFF]|[^])/g;
  let ret = '"';
  let m = null;
  while (m = r.exec(v)) {
    if (m[1]) {
      ret += m[1];
      continue;
    }
    let cp = m[2].codePointAt(0);
    if (ReverseHaskellSimpleEscapeMap.has(cp)) {
      ret += '\\' + ReverseHaskellSimpleEscapeMap.get(cp);
      continue;
    }
    if (cp == 0x7f) {
      ret += '\\DEL';
      continue;
    }
    if (cp < 0x20) {
      ret += '\\' + HaskellAscCodes[cp];
      continue;
    }
    let nextCharIsDigit = false;
    if (r.lastIndex < v.length) {
      nextCharIsDigit = !!(v.charAt(r.lastIndex).match(/[0-9]/));
    }
    ret += '\\' + cp.toString();
    if (nextCharIsDigit) ret += '\\&';
  }
  ret += '"';
  return ret;
}

const RE2SimpleEscapeMap = new Map(
  [...'ntvbrfa\"\\'].map((c) => [c, CSimpleEscapeMap.get(c)]));
const ReverseRE2SimpleEscapeMap = new Map(
  Array.from(RE2SimpleEscapeMap.entries()).map(
    (x) => [x[1].charCodeAt(0), x[0]]));
function toCodeRE2(v) {
  let r = /((?:(?![\\\[\]{}.()?|&$^*+])[ -~])+)|([\uD800-\uDBFF][\uDC00-\uDFFF]|[^])/g;
  let ret = '';
  let m = null;
  while (m = r.exec(v)) {
    if (m[1]) {
      ret += m[1];
      continue;
    }
    let cp = m[2].codePointAt(0);
    if (ReverseRE2SimpleEscapeMap.has(cp)) {
      ret += '\\' + ReverseRE2SimpleEscapeMap.get(cp);
      continue;
    }
    if ((cp > 32) && (cp < 126)) {
      ret += '\\' + m[2];
      continue;
    }
    if (cp < 256) {
      ret += '\\x' + Number(cp).toString(16).padStart(2, '0');
      continue;
    }
    ret += '\\x{' + Number(cp).toString(16) + '}';
  }
  return ret;
}

function fromCodeRE2(v) {
  let ret = '';
  let initial = v.match(/^([^"\\]*)/);
  let m;
  let r = /(?:\\(?:(?<simple>[ntvbrfa\"\\])|(?<meta>\W)|(?<octal>[0-7]{1,3})|(?<shorthex>x[0-9a-fA-F]{2})|(?<longhex>x\{[0-9a-fA-F]+})|(?<unfinishedhex>x)|(?<unk>[^])))(?<remainder>[^\\]*)/g;
  ret = wtf8.encode(initial[1]);
  r.lastIndex = initial[0].length;
  while (r.lastIndex < v.length) {
    let l = r.lastIndex;
    m = r.exec(v);
    if (!m || m.index != l) {
      throw `Internal error at index ${l} of "${v}"`;
    }
    let g = m.groups;
    if (g.simple) {
      ret += wtf8.encode(RE2SimpleEscapeMap.get(g.simple));
    }
    if (g.meta) {
      ret += wtf8.encode(g.meta);
    }
    if (g.octal) {
      let ival = parseInt(g.octal, 8);
      if (ival > 255) {
        throw `\\${g.octal}: octal escape value > 255: ${ival}`;
      }
      ret += wtf8.encode(String.fromCharCode(ival));
    }
    if (g.shorthex) {
      let ival = parseInt(g.shorthex.substring(1), 16);
      ret += wtf8.encode(String.fromCharCode(ival));
    }
    if (g.longhex) {
      let ival = parseInt(g.longhex.substring(2, g.longhex.length-1), 16);
      if (ival > 0x10FFFF) {
        throw `\\${g.longhex}: hex escape too large`
      }
      ret += wtf8.encode(String.fromCodePoint(ival));
    }
    if (g.unfinishedhex) {
      throw "Unfinished or short \\x sequence";
    }
    if (g.unk) {
      throw `\\${g.unk}: unknown escape sequence`;
    }
    if (g.remainder) {
      ret += wtf8.encode(g.remainder);
    }
  }
  return wtf8.decode(ret);
}

function installHandlers() {
  function ancilary_changed(e) {
    let v = document.getElementById("haystack").value;
    runRebuild(() => v, null);
  }
  document.getElementById("haystack")
    .addEventListener("input", triggerRebuild(id), false);
  document.getElementById("haystackCode")
    .addEventListener("input", triggerRebuild(fromCode), false);
  document.getElementById("haystackUTF8")
    .addEventListener("input", triggerRebuild(fromU8), false);
  document.getElementById("haystackUTF16")
    .addEventListener("input", triggerRebuild(fromU16LE), false);
  document.getElementById("haystackUnicode")
    .addEventListener("input", triggerRebuild(fromUnicodeCP), false);
  document.getElementById("base64_utf8")
    .addEventListener("input", ancilary_changed, false);
  document.getElementById("base64_utf16")
    .addEventListener("input", ancilary_changed, false);
  document.getElementById("codeType")
    .addEventListener("input", ancilary_changed, false);
  document.getElementById("IB64UTF8")
    .addEventListener("click", (e) => {
      let inVal = document.getElementById("haystack").value;
      let t = document.getElementById("haystackUTF8");
      t.value = inVal;
      document.getElementById("base64_utf8").checked = true;
      triggerRebuild(fromU8).call(t);
    }, false);
  document.getElementById("IB64UTF16")
    .addEventListener("click", (e) => {
      let inVal = document.getElementById("haystack").value;
      let t = document.getElementById("haystackUTF16");
      t.value = inVal;
      document.getElementById("base64_utf16").checked = true;
      triggerRebuild(fromU16LE).call(t);
    }, false);
  document.getElementById("IUTF8AS88591")
    .addEventListener("click", (e) => {
      let haystack = document.getElementById("haystack");
      haystack.value = wtf8.decode(haystack.value);
      triggerRebuild(id).call(haystack);
    });
  document.getElementById("IUTF8ASWIN1252")
    .addEventListener("click", (e) => {
      let haystack = document.getElementById("haystack");
      haystack.value = wtf8.decode(windows1252encode(haystack.value));
      triggerRebuild(id).call(haystack);
    });
  document.getElementById("diagevents")
    .addEventListener("dblclick", (e) => {
      if (e.target.firstChild &&
          e.target.firstChild.nodeType == Node.TEXT_NODE) {
        openForChar(e.target.firstChild.nodeValue);
        e.preventDefault();
        window.getSelection().removeAllRanges();
      }
    }, true);
  let srch = window.location.search.substring(1);
  if (srch.search('popup=true') >= 0) {
    document.getElementById("openButton")
      .addEventListener("click", (e) => {
        chrome.storage.local.set(
          {justStorage: true},
          function () {
            window.open(chrome.runtime.getURL("popup.html"), '_blank');
          });
      });
    document.body.setAttribute('class', 'popup');
  }
  document.getElementById("prefsButton")
    .addEventListener('click', (e) => {chrome.runtime.openOptionsPage()});
  document.getElementById("showHelpButton")
    .addEventListener('click', (e) => {document.body.classList.add('help')});
  document.getElementById("hideHelpButton")
    .addEventListener('click', (e) => {document.body.classList.remove('help')});
}
document.addEventListener("DOMContentLoaded", function(event) {
  installHandlers();
});
window.addEventListener("load", function(event) {
  chrome.runtime.sendMessage({ type: 'GetTargetf' }, function(resp) {
    if (typeof resp.data === 'string') {
      let data = resp.data;
      runRebuild(() => data, null, resp.e);
    } else {
      console.error("Got weird response: " + JSON.stringify(resp));
    }
  });
});

var knownCPs = new Map();
var waitingCPPromises = new Map();
var port = null;
var disconnectTimeout = null;

async function connectPort() {
  if (port === null) {
    await chrome.runtime.sendMessage({type: 'EnsureGetBlock'});
    port = chrome.runtime.connect({name: "namechannel"});
    // console.info("Got port, I think: " + port + " at " + new Date());
    port.onMessage.addListener(function(msg) {
      // console.info("Got port message in popup");
      if (msg.answers !== undefined) {
        for (let query in msg.answers) {
          let realquery = parseInt(query);
          let ans = msg.answers[query];
          knownCPs.set(realquery, ans);
          if (waitingCPPromises.has(realquery)) {
            (waitingCPPromises.get(realquery)).resolve(ans);
            waitingCPPromises.delete(realquery);
          }
        }
      }
    });
    port.onDisconnect.addListener(() => {
      // console.info("Port disconnected in popup at " + new Date());
      port = null;
    });
  }
}

function disconnectPort() {
  if (port !== null) {
    // console.info("About to disconnect port in popup at " + new Date());
    port.disconnect();
    port = null;
  }
}

async function keepPortAlive() {
  let p = connectPort();
  if (disconnectTimeout) {
    window.clearTimeout(disconnectTimeout);
    disconnectTimeout = null;
  }
  disconnectTimeout = window.setTimeout(() => {
    disconnectPort();
    disconnectTimeout = null;
  }, 60 * 1000);
  await p;
  return port;
}

var scheduledQueryRun = null;

function scheduleQuery() {
  if (!scheduledQueryRun) {
    scheduledQueryRun = Promise.resolve(1).then(
      () => {
        try {
          let queries = Array.from(waitingCPPromises.keys());
          if (queries) {
            keepPortAlive().then((p) => p.postMessage({queries: queries}));
          }
        } finally {
          scheduledQueryRun = null;
        }
      }
    );
  }
}

function getNameBlock(cp) {
  if (knownCPs.has(cp)) {
    return Promise.resolve(knownCPs.get(cp));
  }
  if (waitingCPPromises.has(cp)) {
    return (waitingCPPromises.get(cp)).promise;
  }
  let resolve;
  let promise = new Promise((rsv) => {resolve = rsv;});
  waitingCPPromises.set(cp, {promise: promise, resolve: resolve});
  scheduleQuery();
  return promise;
}

window.addEventListener('resize', () => {
  var x;
  for (x of document.getElementsByClassName('tooltiptext')) {
    x.style = "left: -1px; max-width: 50ch;";
    x.setAttribute("widthStyle", 'max-width: 50ch; ');
  }
});
