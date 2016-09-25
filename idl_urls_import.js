/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

// NOTE: Only to be invoked from blink_idl_urls_import.sh.

const fs = require('fs');
const request = require('hyperquest');
const webidl2 = require('webidl2');
const parser = require('webidl2-js');
const stringify = require('ya-stdlib-js').stringify;
const _ = require('lodash');

['.urlcache', '.idlcache'].forEach(name => {
  try {
    let stat = fs.statSync(`./${name}`);
    console.assert(stat.isDirectory());
  } catch (e) {
    fs.mkdirSync(`./${name}`);
  }
});

function loadURL(url) {
  return new Promise((resolve, reject) => {
    let path = './.urlcache/' + url.replace(/[^a-zA-Z0-9]/g, '_');
    try {
      let stat = fs.statSync(path);
      console.assert(stat.isFile());
      console.log('Found cached', url);
      resolve({url, data: fs.readFileSync(path)});
    } catch (e) {
      console.log('Loading', url);
      request(
        {uri: url},
        (err, res) => {
          if (err) {
            console.error('Error loading', url, err);
            reject(err);
            return;
          }
          let data;
          res.on('data', chunk => data = data ? data + chunk : chunk);
          res.on('end', () => {
            console.log('Loaded', url);
            fs.writeFileSync(path, data);
            resolve({url, data});
          });
          res.on('error', err => {
            console.error('Error loading', url, err);
            reject(err);
          });
        }
      );
    }
  });
}

function tag(name, opt_close) {
  return '<' + (opt_close ? '/' : '') + name + '[^>]*>';
}
function opt(str) {
  return '(' + str + ')?';
}

function extractIDL({url, data}) {
  let path = './.idlcache/' + url.replace(/[^a-zA-Z0-9]/g, '_');
  try {
    let stat = fs.statSync(path);
    console.assert(stat.isFile());
    console.log('Found cached IDLs for', url);
    return {url, data: []};
  } catch (e) {
    console.log('Extracting IDLs from', url);
    // TODO: This RegExp does not appear to be working.
    let re = new RegExp(
      tag('pre') +
        opt(tag('code')) +
        '([^<]*)' +
        opt(tag('code', true)) +
        tag('pre', true),
      'g');
    let idls = [];
    let next = null;
    while (next = re.exec(data)) idls.push(next[2]);
    if (idls.length > 0) console.log('Found', idls.length, 'IDLs from', url);
    return {url, data: idls};
  }
}

let escapes = {
  '&#8482;': '™',
  '&euro;': '€',
  '&#32;': ' ',
  '&nbsp;': ' ',
  '&#33;': '!',
  '&#34;': '"',
  '&quot;': '"',
  '&#35;': '#',
  '&#36;': '$',
  '&#37;': '%',
  '&#38;': '&',
  '&amp;': '&',
  '#39;': "'",
  '&#40;': '(',
  '&#41;': ')',
  '&#42;': '*',
  '&#43;': '+',
  '&#44;': ',',
  '&#45;': '-',
  '&#46;': '.',
  '&#47;': '/',
  '&#48;': '0',
  '&#49;': '1',
  '&#50;': '2',
  '&#51;': '3',
  '&#52;': '4',
  '&#53;': '5',
  '&#54;': '6',
  '&#55;': '7',
  '&#56;': '8',
  '&#57;': '9',
  '&#58;': ':',
  '&#59;': ';',
  '&#60;': '<',
  '&lt;': '<',
  '&#61;': '=',
  '&#62;': '>',
  '&gt;': '>',
  '&#63;': '?',
  '&#64;': '@',
  '&#65;': 'A',
  '&#66;': 'B',
  '&#67;': 'C',
  '&#68;': 'D',
  '&#69;': 'E',
  '&#70;': 'F',
  '&#71;': 'G',
  '&#72;': 'H',
  '&#73;': 'I',
  '&#74;': 'J',
  '&#75;': 'K',
  '&#76;': 'L',
  '&#77;': 'M',
  '&#78;': 'N',
  '&#79;': 'O',
  '&#80;': 'P',
  '&#81;': 'Q',
  '&#82;': 'R',
  '&#83;': 'S',
  '&#84;': 'T',
  '&#85;': 'U',
  '&#86;': 'V',
  '&#87;': 'W',
  '&#88;': 'X',
  '&#89;': 'Y',
  '&#90;': 'Z',
  '&#91;': '[',
  '&#92;': '\\',
  '&#93;': ']',
  '&#94;': '^',
  '&#95;': '_',
  '&#96;': '`',
  '&#97;': 'a',
  '&#98;': 'b',
  '&#99;': 'c',
  '&#100;': 'd',
  '&#101;': 'e',
  '&#102;': 'f',
  '&#103;': 'g',
  '&#104;': 'h',
  '&#105;': 'i',
  '&#106;': 'j',
  '&#107;': 'k',
  '&#108;': 'l',
  '&#109;': 'm',
  '&#110;': 'n',
  '&#111;': 'o',
  '&#112;': 'p',
  '&#113;': 'q',
  '&#114;': 'r',
  '&#115;': 's',
  '&#116;': 't',
  '&#117;': 'u',
  '&#118;': 'v',
  '&#119;': 'w',
  '&#120;': 'x',
  '&#121;': 'y',
  '&#122;': 'z',
  '&#123;': '{',
  '&#124;': '|',
  '&#125;': '}',
  '&#126;': '~',
  '&#160;': ' ',
  '&#161;': '¡',
  '&iexcl;': '¡',
  '&#162;': '¢',
  '&cent;': '¢',
  '&#163;': '£',
  '&pound;': '£',
  '&#164;': '¤',
  '&curren;': '¤',
  '&#165;': '¥',
  '&yen;': '¥',
  '&#166;': '¦',
  '&brvbar;': '¦',
  '&#167;': '§',
  '&sect;': '§',
  '&#168;': '¨',
  '&uml;': '¨',
  '&#169;': '©',
  '&copy;': '©',
  '&#170;': 'ª',
  '&ordf;': 'ª',
  '&#171;': '«',
  '&#172;': '¬',
  '&not;': '¬',
  '&#173;': '',
  '&shy;': '',
  '&#174;': '®',
  '&reg;': '®',
  '&#175;': '¯',
  '&macr;': '¯',
  '&#176;': '°',
  '&deg;': '°',
  '&#177;': '±',
  '&plusmn;': '±',
  '&#178;': '²',
  '&sup2;': '²',
  '&#179;': '³',
  '&sup3;': '³',
  '&#180;': '´',
  '&acute;': '´',
  '&#181;': 'µ',
  '&micro;': 'µ',
  '&#182;': '¶',
  '&para;': '¶',
  '&#183;': '·',
  '&middot;': '·',
  '&#184;': '¸',
  '&cedil;': '¸',
  '&#185;': '¹',
  '&sup1;': '¹',
  '&#186;': 'º',
  '&ordm;': 'º',
  '&#187;': '»',
  '&raquo;': '»',
  '&#188;': '¼',
  '&frac14;': '¼',
  '&#189;': '½',
  '&frac12;': '½',
  '&#190;': '¾',
  '&frac34;': '¾',
  '&#191;': '¿',
  '&iquest;': '¿',
  '&#192;': 'À',
  '&Agrave;': 'À',
  '&#193;': 'Á',
  '&Aacute;': 'Á',
  '&#194;': 'Â',
  '&Acirc;': 'Â',
  '&#195;': 'Ã',
  '&Atilde;': 'Ã',
  '&#196;': 'Ä',
  '&Auml;': 'Ä',
  '&#197': 'Å',
  '&Aring;': 'Å',
  '&#198;': 'Æ',
  '&AElig;': 'Æ',
  '&#199;': 'Ç',
  '&Ccedil;': 'Ç',
  '&#200;': 'È',
  '&Egrave;': 'È',
  '&#201;': 'É',
  '&Eacute;': 'É',
  '&#202;': 'Ê',
  '&Ecirc;': 'Ê',
  '&#203;': 'Ë',
  '&Euml;': 'Ë',
  '&#204;': 'Ì',
  '&Igrave;': 'Ì',
  '&#205;': 'Í',
  '&Iacute;': 'Í',
  '&#206;': 'Î',
  '&Icirc;': 'Î',
  '&#207;': 'Ï',
  '&Iuml;': 'Ï',
  '&#208;': 'Ð',
  '&ETH;': 'Ð',
  '&#209;': 'Ñ',
  '&Ntilde;': 'Ñ',
  '&#210;': 'Ò',
  '&Ograve;': 'Ò',
  '&#211;': 'Ó',
  '&Oacute;': 'Ó',
  '&#212;': 'Ô',
  '&Ocirc;': 'Ô',
  '&#213;': 'Õ',
  '&Otilde;': 'Õ',
  '&#214;': 'Ö',
  '&Ouml;': 'Ö',
  '&#215;': '×',
  '&times;': '×',
  '&#216;': 'Ø',
  '&Oslash;': 'Ø',
  '&#217;': 'Ù',
  '&Ugrave;': 'Ù',
  '&#218;': 'Ú',
  '&Uacute;': 'Ú',
  '&#219;': 'Û',
  '&Ucirc;': 'Û',
  '&#220;': 'Ü',
  '&Uuml;': 'Ü',
  '&#221;': 'Ý',
  '&Yacute;': 'Ý',
  '&#222;': 'Þ',
  '&THORN;': 'Þ',
  '&#223;': 'ß',
  '&szlig;': 'ß',
  '&#224;': 'à',
  '&agrave;': 'à',
  '&#225;': 'á',
  '&aacute;': 'á',
  '&#226;': 'â',
  '&acirc;': 'â',
  '&#227;': 'ã',
  '&atilde;': 'ã',
  '&#228;': 'ä',
  '&auml;': 'ä',
  '&#229;': 'å',
  '&aring;': 'å',
  '&#230;': 'æ',
  '&aelig;': 'æ',
  '&#231;': 'ç',
  '&ccedil;': 'ç',
  '&#232;': 'è',
  '&egrave;': 'è',
  '&#233;': 'é',
  '&eacute;': 'é',
  '&#234;': 'ê',
  '&ecirc;': 'ê',
  '&#235;': 'ë',
  '&euml;': 'ë',
  '&#236;': 'ì',
  '&igrave;': 'ì',
  '&#237': 'í',
  '&iacute;': 'í',
  '&#238;': 'î',
  '&icirc;': 'î',
  '&#239;': 'ï',
  '&iuml;': 'ï',
  '&#240;': 'ð',
  '&eth;': 'ð',
  '&#241;': 'ñ',
  '&ntilde;': 'ñ',
  '&#242;': 'ò',
  '&ograve;': 'ò',
  '&#243;': 'ó',
  '&oacute;': 'ó',
  '&#244;': 'ô',
  '&ocirc;': 'ô',
  '&#245;': 'õ',
  '&otilde;': 'õ',
  '&#246;': 'ö',
  '&ouml;': 'ö',
  '&#247;': '÷',
  '&divide;': '÷',
  '&#248;': 'ø',
  '&oslash;': 'ø',
  '&#249;': 'ù',
  '&ugrave;': 'ù',
  '&#250;': 'ú',
  '&uacute;': 'ú',
  '&#251;': 'û',
  '&ucirc;': 'û',
  '&#252;': 'ü',
  '&uuml;': 'ü',
  '&#253;': 'ý',
  '&yacute;': 'ý',
  '&#254;': 'þ',
  '&thorn;': 'þ',
  '&#255;': 'ÿ',
  '&#256;': 'Ā',
  '&#257;': 'ā',
  '&#258;': 'Ă',
  '&#259;': 'ă',
  '&#260;': 'Ą',
  '&#261;': 'ą',
  '&#262;': 'Ć',
  '&#263;': 'ć',
  '&#264;': 'Ĉ',
  '&#265;': 'ĉ',
  '&#266;': 'Ċ',
  '&#267;': 'ċ',
  '&#268;': 'Č',
  '&#269;': 'č',
  '&#270;': 'Ď',
  '&#271;': 'ď',
  '&#272;': 'Đ',
  '&#273;': 'đ',
  '&#274;': 'Ē',
  '&#275;': 'ē',
  '&#276;': 'Ĕ',
  '&#277;': 'ĕ',
  '&#278;': 'Ė',
  '&#279;': 'ė',
  '&#280;': 'Ę',
  '&#281;': 'ę',
  '&#282;': 'Ě',
  '&#283;': 'ě',
  '&#284;': 'Ĝ',
  '&#285;': 'ĝ',
  '&#286;': 'Ğ',
  '&#287;': 'ğ',
  '&#288;': 'Ġ',
  '&#289;': 'ġ',
  '&#290;': 'Ģ',
  '&#291;': 'ģ',
  '&#292;': 'Ĥ',
  '&#293;': 'ĥ',
  '&#294;': 'Ħ',
  '&#295;': 'ħ',
  '&#296;': 'Ĩ',
  '&#297;': 'ĩ',
  '&#298;': 'Ī',
  '&#299;': 'ī',
  '&#300;': 'Ĭ',
  '&#301;': 'ĭ',
  '&#302;': 'Į',
  '&#303;': 'į',
  '&#304;': 'İ',
  '&#305;': 'ı',
  '&#306;': 'Ĳ',
  '&#307;': 'ĳ',
  '&#308;': 'Ĵ',
  '&#309;': 'ĵ',
  '&#310;': 'Ķ',
  '&#311;': 'ķ',
  '&#312;': 'ĸ',
  '&#313;': 'Ĺ',
  '&#314;': 'ĺ',
  '&#315;': 'Ļ',
  '&#316;': 'ļ',
  '&#317;': 'Ľ',
  '&#318;': 'ľ',
  '&#319;': 'Ŀ',
  '&#320;': 'ŀ',
  '&#321;': 'Ł',
  '&#322;': 'ł',
  '&#323;': 'Ń',
  '&#324;': 'ń',
  '&#325;': 'Ņ',
  '&#326;': 'ņ',
  '&#327;': 'Ň',
  '&#328;': 'ň',
  '&#329;': 'ŉ',
  '&#330;': 'Ŋ',
  '&#331;': 'ŋ',
  '&#332;': 'Ō',
  '&#333;': 'ō',
  '&#334;': 'Ŏ',
  '&#335;': 'ŏ',
  '&#336;': 'Ő',
  '&#337;': 'ő',
  '&#338;': 'Œ',
  '&#339;': 'œ',
  '&#340;': 'Ŕ',
  '&#341;': 'ŕ',
  '&#342;': 'Ŗ',
  '&#343;': 'ŗ',
  '&#344;': 'Ř',
  '&#345;': 'ř',
  '&#346;': 'Ś',
  '&#347;': 'ś',
  '&#348;': 'Ŝ',
  '&#349;': 'ŝ',
  '&#350;': 'Ş',
  '&#351;': 'ş',
  '&#352;': 'Š',
  '&#353;': 'š',
  '&#354;': 'Ţ',
  '&#355;': 'ţ',
  '&#356;': 'Ť',
  '&#357;': 'ť',
  '&#358;': 'Ŧ',
  '&#359;': 'ŧ',
  '&#360;': 'Ũ',
  '&#361;': 'ũ',
  '&#362;': 'Ū',
  '&#363;': 'ū',
  '&#364;': 'Ŭ',
  '&#365;': 'ŭ',
  '&#366;': 'Ů',
  '&#367;': 'ů',
  '&#368;': 'Ű',
  '&#369;': 'ű',
  '&#370;': 'Ų',
  '&#371;': 'ų',
  '&#372;': 'Ŵ',
  '&#373;': 'ŵ',
  '&#374;': 'Ŷ',
  '&#375;': 'ŷ',
  '&#376;': 'Ÿ',
  '&#377;': 'Ź',
  '&#378;': 'ź',
  '&#379;': 'Ż',
  '&#380;': 'ż',
  '&#381;': 'Ž',
  '&#382;': 'ž',
  '&#383;': 'ſ',
  '&#340;': 'Ŕ',
  '&#341;': 'ŕ',
  '&#342;': 'Ŗ',
  '&#343;': 'ŗ',
  '&#344;': 'Ř',
  '&#345;': 'ř',
  '&#346;': 'Ś',
  '&#347;': 'ś',
  '&#348;': 'Ŝ',
  '&#349;': 'ŝ',
  '&#350;': 'Ş',
  '&#351;': 'ş',
  '&#352;': 'Š',
  '&#353;': 'š',
  '&#354;': 'Ţ',
  '&#355;': 'ţ',
  '&#356;': 'Ť',
  '&#577;': 'ť',
  '&#358;': 'Ŧ',
  '&#359;': 'ŧ',
  '&#360;': 'Ũ',
  '&#361;': 'ũ',
  '&#362;': 'Ū',
  '&#363;': 'ū',
  '&#364;': 'Ŭ',
  '&#365;': 'ŭ',
  '&#366;': 'Ů',
  '&#367;': 'ů',
  '&#368;': 'Ű',
  '&#369;': 'ű',
  '&#370;': 'Ų',
  '&#371;': 'ų',
  '&#372;': 'Ŵ',
  '&#373;': 'ŵ',
  '&#374;': 'Ŷ',
  '&#375;': 'ŷ',
  '&#376;': 'Ÿ',
  '&#377;': 'Ź',
  '&#378;': 'ź',
  '&#379;': 'Ż',
  '&#380;': 'ż',
  '&#381;': 'Ž',
  '&#382;': 'ž',
  '&#383;': 'ſ',
};

function unescape({url, data}) {
  return {url, data: data.map(idl => {
    let re = /&#?[a-zA-Z0-9]+;/g;
    let next = null;
    while ((next = re.exec(idl)) !== null) {
      if (escapes[next[0]]) {
        console.log('Unescaping', next[0], 'as', escapes[next[0]]);
        idl = idl.replace(new RegExp(next[0], 'g'), escapes[next[0]]);
      } else {
        console.warn('Unknown escape sequence', next[0]);
      }
    }
    return idl;
  })};
}

function parse({url, data}) {
  if (!Array.isArray(data)) data = [data];
  let path = './.idlcache/' + url.replace(/[^a-zA-Z0-9]/g, '_');
  try {
    let stat = fs.statSync(path);
    console.assert(stat.isFile());
    console.log('Found cached IDLs for', url);
    return JSON.parse(fs.readFileSync(path).toString());
  } catch (e) {
    let parses = [];
    for (let idl of data) {
      if (typeof idl !== 'string') idl = idl.toString();
      let res = parser.parseString(idl);
      if (res[0]) {
        console.log('Storing parse from', url, ';', idl.length,
                    'length string');
        parses.push(res[1]);
        try {
          webidl2.parse(idl);
        } catch (e) {
          console.warn('webidl2 failed to parse good fragment from', url);
        }
      } else {
        console.warn(url, ':', idl.length, 'length string was not idl');
        try {
          webidl2.parse(idl);
          console.assert(false, 'webidl2 parsed');
        } catch (e) {}
      }
    }
    fs.writeFileSync(path, stringify({url, parses}));
    return {url, parses};
  }
}

module.exports = {
  importHTTP: function(urls, path) {
    urls = _.uniq(urls).sort();

    return Promise.all(
      urls.map(
        url => loadURL(url).then(extractIDL).then(unescape).then(parse).catch(e => {
        console.error('Parse error:', e);
        return {url, parses: []};
      }))).then(data => {
        fs.writeFileSync(path, stringify(data));
        const count = data.reduce(
          (acc, {url, parses}) => acc + parses.length, 0);
        console.log('Wrote', count, 'IDL fragments from', data.length,
                    'URLs to', path);
      });
  },
  importIDL: function(urls, path) {
    urls = _.uniq(urls).sort();

    return Promise.all(
      urls.map(url => loadURL(url).then(parse).catch(e => {
        console.error('Parse error:', e);
        return {url, parses: []};
      }))).then(data => {
        fs.writeFileSync(path, stringify(data));
        const count = data.reduce(
          (acc, {url, parses}) => acc + parses.length, 0);
        console.log('Wrote', count, 'IDL fragments from', data.length,
                    'URLs to', path);
      });
  },
};
