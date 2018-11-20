UNIDATA = unidata/Jamo.txt unidata/Blocks.txt unidata/UnicodeData.txt
TOP_LEVEL_EXTENSION_CONTENTS = \
  block_hl.css manifest.json options.html popup.css popup.html README \
  LICENSE.txt

.PHONY: all

all: $(UNIDATA) js/get_block.js

$(UNIDATA):
	mkdir -p unidata
	cd unidata && wget https://unicode.org/Public/UNIDATA/$(notdir $@)

js/get_block.js js/[A-Z]*.js block_hl.css: makenamejs.py $(UNIDATA)
	python makenamejs.py --css block_hl.css $(UNIDATA)

unidebug.zip: js/get_block.js js/*.js unidebug.pem icons/* \
		$(TOP_LEVEL_EXTENSION_CONTENTS)
	rm -rf unidebug unidebug.zip
	mkdir unidebug unidebug/js unidebug/icons
	cp -a js icons $(TOP_LEVEL_EXTENSION_CONTENTS) unidebug
	cp unidebug.pem unidebug/key.pem
	zip -r unidebug.zip unidebug
	rm unidebug/key.pem

clean:
	rm -rf unidebug unidebug.zip js/[A-Z]*.js js/get_block.js unidata
