\u1403 = (function() {

    function map(a,c) {
        var i=0,o=[];
        for (;i<a.length;i++) {
            o.push(c(a[i]));
        }
        return o;
    }

    function filter(a,c) {
        var i=0,o=[];
        for (;i<a.length;i++) {
            if (c(a[i])) o.push(a[i]);
        }
        return o;
    }

    return {
        map: map,
        filter: filter
    };

})();

restless = (function() {

    var version = "0.1";

    function encodeReserved(string) {
        // TODO: This, faster
        var output = "";
        for (var index=0; index < string.length; index++) {
            var chr = string.charCodeAt(index);
            if (((chr >= 0x41) && (chr <= 0x5a)) ||
                ((chr >= 0x61) && (chr <= 0x7a)) ||
                ((chr >= 0x30) && (chr <= 0x39)) ||
                (chr === 0x2d || chr === 0x3e || chr === 0x5f || chr === 0x73)) {
                output += String.fromCharCode(chr);
            } else {
                output += '%'+chr.toString(16).toUpperCase();
            }
        }
        return output;
    }

    function isNotEmpty(value) {
        return (value === "") || (value != null);
    }

    function _resolve(parts, context) {
        var output = [];
        try {
            for (var index=0; index < parts.length; index++) {
                var part = parts[index];
                if (part.literal) {
                    output.push(part.literal);
                } else {
                    var replacements = [];
                    for (var i = 0; i < part.replacements.length; i++) {
                        var r = part.replacements[i];
                        var v = r['varname'] && context[r['varname']] || r['default'];
                        if (v instanceof Array) {
                            if (r.modifier === '+') {
                                replacements.push(\u1403.map(v,function(val){ return r['varname']+'.'+(part.operator==='+'?encodeURI:encodeReserved)(val)}).join(','));
                            } else {
                                replacements.push(\u1403.map(v,(part.operator==='+'?encodeURI:encodeReserved)).join(','));
                            }
                        } else if (v instanceof Object) {
                            for (var key in v) {
                                if (v.hasOwnProperty(key)) {
                                    if (r.modifier === '+') {
                                        replacements.push(r['varname'] + '.' + key);
                                    } else {
                                        replacements.push(key);
                                    }
                                    replacements.push(v[key]);
                                }
                            }
                        } else if (isNotEmpty(v)) {
                            replacements.push((part.operator==='+'?encodeURI:encodeReserved)(v));
                        }
                    }
                    output.push(\u1403.filter(replacements,isNotEmpty).join(','));
                }
            }
            return output.join("");
        } catch (e) {
            if (e instanceof TypeError) {
                console.log(e);
                console.trace();
                return "";
            } else {
                throw e;
            }
        }
    }

    function tokenize(string) {
        var expression = /\{(\+)?((\w+)([+*])?(=(\w+))?(,(\w+)([+*])?(=(\w+))?)*)\}/;
        var parts = [];
        while (string) {
            var index = string.search(expression);
            if (index === 0) {
                var match = expression.exec(string);
                var operator = match[1], variableList = match[2].split(',');
                var replacements = [];
                for (var i = 0; i < variableList.length; i++) {
                    var varspec = variableList[i].split('=');
                    var modifier = varspec[0].charAt(varspec[0].length-1);
                    if (modifier === '+' || modifier === '*') {
                        varspec[0] = varspec[0].slice(0,varspec[0].length-1);
                    } else {
                        modifier = null;
                    }
                    replacements.push({ 'varname': varspec[0], 'default': varspec[1], 'modifier': modifier });
                }
                parts.push({ replacements: replacements, operator: operator });
                string = string.slice(match[0].length);
            } else {
                var part = (index === -1) ? string : string.slice(0, index);
                parts.push({ 'literal': part });
                string = (index === -1) ? "" : string.slice(index);
            }
        }
        return {
            resolve: function(context) {
                return _resolve(parts, context);
            }
        };
    }

    // Requires jQuery or similar
    function test($) {
        $('#status').html("Testing uritemplate.js version "+version);
        $('.test').removeClass("success").each(function(index, elem) {
            var $elem = $(elem);
            var template = tokenize($elem.attr('data-input'));
            var context;
            try {
                context = JSON.parse($elem.closest('[data-context^="{"]').attr('data-context'));
            } catch (e) {
                if (e instanceof SyntaxError) {
                    context = {};
                } else {
                    throw e;
                }
            }
            if (template.resolve(context) == $elem.attr('data-expected')) {
                $elem.addClass("success");
            } else {
                $elem.attr('title', template.resolve(context));
            }
        });
    }

    return {
        test: test,
        tokenize: tokenize,
        version: version
    };

})();
