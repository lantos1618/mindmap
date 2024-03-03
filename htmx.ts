
export type Attributes = { [key: string]: string | undefined };

export class HtmlNode {
    tag: string;
    children: (string | HtmlNode)[];
    attributes: Attributes;

    constructor(tag: string, children: (string | HtmlNode)[], attributes: Attributes = {}) {
        this.tag = tag;
        this.children = children;
        this.attributes = attributes;

    }

    toString() {
        const attrs = Object.entries(this.attributes)
                            .map(([key, value]) => value ? `${key}="${value}"` : key)
                            .join(' ');
        const attrStr = attrs ? ` ${attrs}` : '';
        const children = this.children.map(child => typeof child === 'string' ? child : child.toString()).join('');
        return `<${this.tag}${attrStr}>${children}</${this.tag}>`;

    }
}

export function Html(...children: (string | HtmlNode)[]) {
    return new HtmlNode('html', children);
}

export function Head(...children: (string | HtmlNode)[]) {
    return new HtmlNode('head', children);
}

export function Meta(attributes: Attributes = {}) {
    return new HtmlNode('meta', [], attributes);
}

export function Link(attributes: Attributes = {}) {
    return new HtmlNode('link', [], attributes);
}

export function Script(attributes: Attributes = {}, ...children: (string | HtmlNode | Function)[]) {
    let temp_children = children.map(child => typeof child === 'function' ? `(` + child.toString() + `)` + `()` : child);
    return new HtmlNode('script', temp_children, attributes);
}

export function Style(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('style', children, attributes);
}


export function Title(...children: (string | HtmlNode)[]) {
    return new HtmlNode('title', children);
}

export function Body(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('body', children, attributes);
}

export function Div(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('div', children, attributes);
}

export function Span(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('span', children, attributes);
}

export function A(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('a', children, attributes);
}

export function H1(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('h1', children, attributes);
}

export function H2(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('h2', children, attributes);
}

export function H3(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('h3', children, attributes);
}

export function H4(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('h4', children, attributes);
}

export function H5(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('h5', children, attributes);
}

export function H6(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('h6', children, attributes);
}

export function P(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('p', children, attributes);
}


export function Input(attributes: Attributes = {}) {
    return new HtmlNode('input', [], attributes);
}

export function Button(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('button', children, attributes);
}

export function Form(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('form', children, attributes);
}

export function Label(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('label', children, attributes);
}

export function Select(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('select', children, attributes);
}

export function Option(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('option', children, attributes);
}

export function Ul(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('ul', children, attributes);
}

export function Ol(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('ol', children, attributes);
}

export function Li(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('li', children, attributes);
}

export function Table(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('table', children, attributes);
}

export function Tr(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('tr', children, attributes);
}

export function Th(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('th', children, attributes);
}

export function Td(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('td', children, attributes);
}

export function Tbody(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('tbody', children, attributes);
}

export function Thead(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('thead', children, attributes);
}

export function Tfoot(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('tfoot', children, attributes);
}

export function Canvas(attributes: Attributes = {}) {
    return new HtmlNode('canvas', [], attributes);
}


export function Svg(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('svg', children, attributes);
}

export function Img(attributes: Attributes = {}) {
    return new HtmlNode('img', [], attributes);
}


export function Video(attributes: Attributes = {}, ...children: (string | HtmlNode)[]) {
    return new HtmlNode('video', children, attributes);
}

export function Source(attributes: Attributes = {}) {
    return new HtmlNode('source', [], attributes);
}