restless = (function() {

    var version = "0.1";

    function _resolve(parts, context) {
        var output = [];
        for (var index=0; index < parts.length; index++) {
            var part = parts[index];
            if (part.literal) {
                output.push(part.literal);
            } else {
                var replacements = [];
                for (var i = 0; i < part.replacements.length; i++) {
                    var r = part.replacements[i];
                    replacements.push(r['var'] && context[r['var']] || r['default']);
                }
                output.push(replacements.join(','));
            }
        }
        return output.join("");
    }

    function tokenize(string) {
        var expression = /\{((\w+)(=(\w+))?(,(\w+)(=(\w+))?)*)\}/;
        var parts = [];
        while (string) {
            var index = string.search(expression);
            if (index === 0) {
                var match = expression.exec(string);
                var vars = match[1].split(',');
                var replacements = [];
                for (var i = 0; i < vars.length; i++) {
                    var varparts = vars[i].split('=');
                    replacements.push({ 'var': varparts[0], 'default': varparts[1] });
                }
                parts.push({ replacements: replacements });
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
