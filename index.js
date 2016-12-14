const vm = require('vm');
const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'example-app', 'dist', 'app.bundle.js');
const content = fs.readFileSync(file, 'utf8');

function noop() {
}

const baseElement = {
    insertBefore(node, ref) {
        const index = this.children.indexOf(ref);
        this.children.splice(index, 0, node);
        node.parentNode = this;
    },
    appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
    },
    addEventListener: noop,
    setAttribute(name, value) {
        this[name] = value;
    }
};


function render(components) {
    let returnSingular = !Array.isArray(components);
    if (returnSingular) {
        components = [components];
    }

    const mainElement = Object.assign({}, baseElement, {
        type: 'div',
        children: [],
    });

    const styles = {};

    const sandbox = {
        console: {
            log: noop
        },
        log: console.log.bind(console),
        exports: {},
        module: {},
        document: {
            head: {
                appendChild(style) {
                    if (styles[this.module]) {
                        styles[this.module] += style.textContent;
                    } else {
                        styles[this.module] = style.textContent;
                    }
                }
            },
            querySelector() {
                return mainElement;
            },
            createElement(type) {
                return Object.assign({}, baseElement, {
                    type,
                    children: []
                });
            },
            createTextNode(text) {
                return Object.assign({}, baseElement, {
                    type: 'text',
                    value: text,
                    children: []
                });
            },
            createComment(comment) {
                return {
                    type: 'comment',
                    comment
                };
            },
            createDocumentFragment() {
                return Object.assign({}, baseElement, {
                    type: 'fragment',
                    children: []
                });
            }
        }
    };
    sandbox.module.exports = sandbox.exports;

    const call = components.map((component, index) => `
document.head.module = '${component.name}${index}';
new module.exports.${component.name}({
    target: Rendered${component.name}${index},
    data: ${JSON.stringify(component.data || {})}
})`).join('\n');
    components.forEach((component, index) => {
        sandbox[`Rendered${component.name}${index}`] = Object.assign({}, baseElement, {
            type: 'div',
            children: [],
        });
    });
    vm.createContext(sandbox);

    vm.runInContext(content + call, sandbox, {
        filename: file
    });

    const toReturn = components.map((component, index) => {
        return {
            name: component.name,
            html: toHTML(sandbox[`Rendered${component.name}${index}`]),
            css: styles[`${component.name}${index}`] || null
        };
    });
    if (returnSingular) {
        return toReturn[0];
    }
    return toReturn;
}

function toHTML(element) {
    let value = '';
    switch (element.type) {
        case 'comment':
            value = `<!-- ${element.comment} -->`;
            break;
        case 'fragment':
            value = element.children.map(toHTML).join('');
            break;
        case 'text':
            value = element.value;
            break;
        default:
            let attributes = '';
            for (let property in element) {
                if (element.hasOwnProperty(property) &&
                    !baseElement.hasOwnProperty(property) &&
                    property !== 'children' &&
                    property !== 'parentNode' &&
                    property !== 'type' &&
                    property !== '__svelte') {
                    attributes += ` ${property}="${String(element[property])}"`;
                }
            }
            value = `<${element.type}${attributes}>${element.children.map(toHTML).join('')}</${element.type}>`;
    }
    return value;
}

console.log(render([
    {
        name: 'Component1',
        data: {
            list: [
                'Franny',
                'Millie',
                'Minnie'
            ]
        }
    },
    {
        name: 'Component2'
    },
    {
        name: 'Component2',
        data: {
            name: 'Paul'
        }
    },
    {
        name: 'Component3'
    }
]));

