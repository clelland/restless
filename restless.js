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
        return (value === "") || (!!value);
    }

    function component(operator, varname, value, modifier) {
        if (operator === ';') {
            value = encodeURI(value);
        } else {
            if (operator === '+') {
                value = encodeURI(value);
            } else {
                value = encodeReserved(value);
            }
            if (modifier === '+') {
                value = varname + '.' + value;
            }
        }
        return value;
    }

    // Takes a variable name, a value for that variable, and an optional
    // modifier, and formats it for query-string interpolation
    function components_question(varname, value, modifier) {
        var out = [];
        if (value instanceof Array) {
            for (var i=0; i < value.length; i++) {
                if (modifier === '+') {
                    out.push(varname + '=' + component('?', varname, value[i], null));
                } else {
                    out.push(component('?', varname, value[i], modifier));
                }
            }
        } else if (value instanceof Object) {
            for (var key in value) {
                if (value.hasOwnProperty(key)) {
                    if (modifier === '*' || modifier === '+') {
                        out.push(component(null, varname, key, modifier) + '=' + component('?', null, value[key], null));
                    } else {
                        out.push(component(null, varname, key, modifier));
                        out.push(component('?', null, value[key], null));
                    }
                }
            }
        } else if (isNotEmpty(value)) {
            out.push(component('?', varname, value, modifier));
        }
        var separator = (modifier === '+' || modifier === '*') ? '&' : ',';
        if (modifier !== '*' && modifier !== '+') {
            if (isNotEmpty(value)) {
                return varname + '=' + out.join(separator);
            } else {
                return '';
            }
        }
        return out.join(separator);
    }

    function components(operator, varname, value, modifier) {
        var out = [];
        if (operator === '?') {
            return components_question(varname, value, modifier);
        }
        if (value instanceof Array) {
            for (var i=0; i < value.length; i++) {
                if (operator === ';' && modifier === '+') {
                    out.push(varname + '=' + component(operator, varname, value[i], null));
                } else {
                    out.push(component(operator, varname, value[i], modifier));
                }
            }
        } else if (value instanceof Object) {
            for (var key in value) {
                if (value.hasOwnProperty(key)) {
                    if (operator === ';' && (modifier === '*' || modifier === '+')) {
                        out.push(component(null, varname, key, modifier) + '=' + component(operator, null, value[key], null));
                    } else {
                        out.push(component(null, varname, key, modifier));
                        out.push(component(operator, null, value[key], null));
                    }
                }
            }
        } else if (isNotEmpty(value)) {
            if (operator === ';') {
                if (value) {
                    out.push(varname + '=' + component(operator, varname, value, modifier));
                } else {
                    out.push(varname);
                }
            } else {
                out.push(component(operator, varname, value, modifier));
            }
        }
        var separator = (modifier === '+' || modifier === '*') ? (operator === ';' ? ';' : ',') : ',';
        return out.join(separator);
    }

    function replacementValue(operator, replacements, context) {
        var componentList = [];
        for (var i=0; i < replacements.length; i++) {
            var r = replacements[i];
            var v = r.varname && (isNotEmpty(context[r.varname]) ? context[r.varname] : r['default']);
            var c = components(operator, r.varname, v, r.modifier);
            if (c) {
                componentList.push(c);
            }
        }
        var separator=',', prefix='';
        if (operator === ';') {
            separator = ';';
            prefix = ';';
        }
        else if (operator === '?') {
            separator = '&';
            prefix = '?';
        }
        else if (operator === '/') {
            separator = '/';
            prefix = '/';
        }
        else if (operator === '.') {
            separator = '.';
            prefix = '.';
        }
        return prefix + componentList.join(separator);
    }

    function _resolve(parts, context) {
        var output = [];
        try {
            for (var index=0; index < parts.length; index++) {
                var part = parts[index];
                if (part.literal) {
                    output.push(part.literal);
                } else {
                    output.push(replacementValue(part.operator, part.replacements, context));
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
        var expression = /\{([+;?\/.])?((\w+)([+*])?(=(\w+))?(,(\w+)([+*])?(=(\w+))?)*)\}/;
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
