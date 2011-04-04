restless = (function() {

    var version = "0.1";

    function _resolve(parts, context) {
        var output = [];
        for (var index=0; index < parts.length; index++) {
            var part = parts[index];
            if (part.literal) {
                output.push(part.literal);
            } else {
                output.push((part['var'] && context[part['var']]) || part['default']);
            }
        }
        return output.join("");
    }

    function tokenize(string) {
        var replacement = /\{(\w+)(=(\w+))?\}/;
        var parts = [];
        while (string) {
            var index = string.search(replacement);
            if (index === 0) {
                var match = replacement.exec(string);
                parts.push({ 'var': match[1], 'default': match[3] });
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
