#!/usr/bin/env python3

import argparse
import re
import json

parser = argparse.ArgumentParser(description='Make UNIDATA-derived files')
parser.add_argument('-d', dest='outdir', default='js')
parser.add_argument('--css', dest='css', type=argparse.FileType('w'),
                    default=None)
parser.add_argument('jamo', type=argparse.FileType('r'))
parser.add_argument('blocks', type=argparse.FileType('r'))
parser.add_argument('unidata', type=argparse.FileType('r'))

args = parser.parse_args()
block_lines = args.blocks.readlines()
block_comment = ''.join(x.strip() + '\n' for x in block_lines[0:3])
block_lines = [re.sub('#.*', '', x).strip() for x in block_lines]
block_lines = [x for x in block_lines if x]
jamo_lines = [re.sub('#.*', '', x).strip() for x in args.jamo.readlines()]
jamo_lines = [x for x in jamo_lines if x]
jamo = {}
for jamo_line in jamo_lines:
    (charhex, short_name) = jamo_line.split(';')
    short_name = short_name.strip()
    jamo[int(charhex, 16)] = short_name

chardata = {}
for unicode_data_line in args.unidata:
    data = unicode_data_line.strip().split(';')
    chardata[int(data[0], 16)] = data[1:]

blocks = []
for block_line in block_lines:
    (cprange, block_name) = block_line.split(';')
    (min_cp, max_cp) = cprange.split('..')
    block_name = block_name.strip()
    block_name_mangled = block_name.replace(' ', '_')
    blocks.append((block_name_mangled, block_name,
                   int(min_cp, 16), int(max_cp, 16)))

if args.css is not None:
    for block_spec in blocks + [('No_Block',)]:
        args.css.write('.hl_%s .%s { Background: #AFA; }\n' %
                       (block_spec[0], block_spec[0]))
        args.css.write(
            '.hl_%s .locked .%s { Background: #AFA;'
            ' background-repeat: no-repeat;'
            ' background-image: url(icons/anchor.gif);'
            ' background-position: right}\n' %
            (block_spec[0], block_spec[0]))
    args.css.close()

with open(args.outdir + '/get_block.js', 'w') as f:
    f.write("'use strict';\n")
    f.write("// Created from:\n")
    f.write(block_comment.replace('#', '//  '))
    f.write("// Files pulled from https://unicode.org/Public/UNIDATA/\n\n")
    f.write("function getBlock(cp) {")
    for block_spec in blocks:
        if block_spec[2] == 0:
            block_name += ' (ASCII)'
        elif block_spec[2] == 0x80:
            block_name += ' (ISO-8859-1)'
        f.write('  if ((cp >= 0x%04x) && (cp <= 0x%04x)) {return "%s";}\n'
                % (block_spec[2], block_spec[3], block_spec[1]))
    f.write('  return "No Block";\n}\n\n')
    f.write("function getMangledBlock(cp) {")
    for block_spec in blocks:
        f.write('  if ((cp >= 0x%04x) && (cp <= 0x%04x)) {return "%s";}\n'
                % (block_spec[2], block_spec[3], block_spec[0]))
    f.write('  return "No_Block";\n}\n')
    f.write('''
var loaded_blocks = new Map();
var loading_promises = new Map();

function getFuncFor(mblock) {
  if (loaded_blocks.has(mblock)) {
    return Promise.resolve(loaded_blocks.get(mblock));
  } else if (loading_promises.has(mblock)) {
    return loading_promises.get(mblock);
  } else {
    var newScript = document.createElement("script");
    var resolve, reject;
    var promise = new Promise((rsv, rjt) => {resolve = rsv; reject = rjt});
    function scriptLoadErr(oErr) {
      reject(oErr);
    }
    function scriptLoaded() {
      resolve(loaded_blocks.get(mblock));
      loading_promises.delete(mblock);
    }
    newScript.onerror = scriptLoadErr;
    newScript.onload = scriptLoaded;
    newScript.src = "js/" + mblock + ".js";
    document.head.appendChild(newScript);
    loading_promises.set(mblock, promise);
    return promise;
  }
}

function registerBlockFunc(name, f) {
  loaded_blocks.set(name, f);
}

registerBlockFunc('No_Block', (cp) => "Unassigned");

async function getNameBlock(cp) {
  var block = getBlock(cp);
  var mblock = getMangledBlock(cp);

  var namef = await getFuncFor(mblock);
  return [namef(cp), mblock, block];
}
''')

for block_spec in blocks:
    (block_name_mangled, block_name, min_cp, max_cp) = block_spec
    for cp in range(min_cp, max_cp + 1):
        if cp in chardata:
            first_name = chardata[cp][0]
            break
    else:
        first_name = 'Unassigned'
    pre_text = ''
    func_body = ''
    if first_name != '<control>' and first_name.startswith('<'):
        if first_name.startswith('<Hangul'):
            pre_text = 'var jamo = %s;\n' % json.dumps(jamo)
            func_body += 'var shifted_cp = cp - 44032;\n'
            func_body += 'var shifted_lowcp = shifted_cp % 28;\n'
            func_body += 'shifted_cp = (shifted_cp - shifted_lowcp)/28;\n'
            func_body += 'var shifted_midcp = shifted_cp % 21;\n'
            func_body += 'shifted_cp = (shifted_cp - shifted_midcp)/21;\n'
            func_body += 'var shifted_highcp = shifted_cp;\n'
            func_body += 'var sname = (jamo[shifted_highcp+0x1100]'
            func_body += '+jamo[shifted_midcp+0x1161]'
            func_body += '+(shifted_lowcp==0 ? "" :'
            func_body += ' jamo[shifted_lowcp+0x11A7]));\n'
            func_body += 'return ("HANGUL SYLLABLE " + sname);\n'
        elif first_name.startswith('<CJK'):
            func_body += 'return "CJK UNIFIED IDEOGRAPH-"'
            func_body += ' + Number(cp).toString(16)'
            func_body += '.padStart(4, "0").toUpperCase();\n'
        elif first_name.startswith('<Tangut Ideograph'):
            func_body += 'return "TANGUT IDEOGRAPH-"'
            func_body += ' + Number(cp).toString(16)'
            func_body += '.padStart(4, "0").toUpperCase();\n'
        elif ('Surrogate' in first_name) or ('Private Use' in first_name):
            stripped_name = re.sub('<(.*),.*', r'\1', first_name)
            func_body += 'return ' + json.dumps(stripped_name + '-')
            func_body += ' + Number(cp).toString(16)'
            func_body += '.padStart(4, "0").toUpperCase();\n'
        else:
            raise Exception("Unknown name pattern %s" % first_name)
    else:
        func_body += 'switch (cp) {\n'
        for cp in range(min_cp, max_cp+1):
            if cp in chardata:
                name = chardata[cp][0]
                if name == '<control>':
                    name = '%s (%s)' % (name, chardata[cp][9])
                func_body += ('  case 0x%04X: return %s;\n' %
                              (cp, json.dumps(name)))
        func_body += '  default: return %s;\n' % (
            json.dumps('Unassigned (block %s)' % (block_name,)),)
        func_body += '}\n'
    template = '''(function() {

%s
registerBlockFunc(%s, function(cp) {
%s
});

})();
'''
    with open('%s/%s.js' % (args.outdir, block_name_mangled), 'w') as f:
        f.write(template % (pre_text, json.dumps(block_name_mangled),
                            func_body))
