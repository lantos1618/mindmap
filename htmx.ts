
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
                            .map(([key, value]) => `${key}="${value}"`)
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