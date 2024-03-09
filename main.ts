import express from 'express';
import { createServer } from 'http';
import { Server } from 'ws';
import Groq from 'groq-sdk';
import { randomUUID } from 'crypto';
import { Body, Div, H1, Head, Html, Input, Link, Script, Style, TextArea } from './htmx';
import { bottleneck } from './bottleneck';
import { stream_listen, stream_publish, video_stream_listener, video_stream_publisher } from './webchat';


const app = express();
const server = createServer(app);
const wss = new Server({ server });
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


type WebSocketMessage = {
    type: string;
    content: any;
    message_nonce: string;
};


wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', async (message) => {

        message = JSON.parse(message.toString());
        const message_nonce = randomUUID();

        try {
            const groqStream = await groq.chat.completions.create({
                messages: [
                    message
                ],
                model: "mixtral-8x7b-32768",
                stream: true // Enable streaming
            });

            const readableStream = groqStream.toReadableStream();
            const reader = readableStream.getReader();

            async function pushData() {
                const { done, value } = await reader.read();

                if (done) {
                    ws.send(JSON.stringify({ type: 'end' })); // Signal end of data
                    return;
                }
                // decode Uint8Array to string
                const textDecoder = new TextDecoder('utf-8');
                const content_string = textDecoder.decode(value);
                const json = JSON.parse(content_string);
                const content = json;

                ws.send(JSON.stringify({ type: 'data', content: content, message_nonce: message_nonce } as WebSocketMessage)); // Send data chunk
                pushData(); // Continue reading
            }

            pushData().catch((err) => {
                ws.send(JSON.stringify({ type: 'error', error: err.message })); // Send error message
                console.error('Error streaming data:', err);
            });

        } catch (error) {
            ws.send(JSON.stringify({ type: 'error', error: 'Internal Server Error' })); // Send error message
            console.error('Request error:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

app.use(express.static('public'));

let count = 0;

app.get('/test/increment', (req, res) => {
    // increment counter
    let html_element = Div({ id: 'counter' }, `${++count}`);

    res.send(html_element.toString());

})

app.get('/bottleneck', bottleneck);


app.get('/stream_publish', stream_publish)
app.get('/stream_listen', stream_listen)

app.get('/video_stream_publisher', video_stream_publisher)
app.get('/video_stream_listener', video_stream_listener)


app.get('/test', (req, res) => {
    function client_script() {
        window.addEventListener("load", () => {
            console.log('client script loaded');
            let hello = document.getElementById('hello');
            if (!hello) throw new Error("found null");

            hello.addEventListener('click', () => {
                if (!hello) throw new Error("found null");

                hello.innerText = 'Hello, World! (clicked)';
            });
        }
        );

    }

    function client_ws() {

        window.addEventListener("load", () => {
            let messages = {};
            window.messages = messages;
            let lastMesssageRan = '';

            console.log('client ws loaded');
            // JavaScript to handle WebSocket communication
            const ws = new WebSocket('ws://localhost:3000/');


            const marked = new window.marked.Marked(
                window.markedHighlight.markedHighlight({
                    langPrefix: 'hljs language-',
                    highlight(code, lang, info) {

                        const language = lang || 'plaintext';
                        return hljs.highlight(code, { language }).value;
                        // return code
                    }
                })
            );

            function xmlSanitize(text: string): string {
                let result = '';
                let inCodeBlock = false;

                for (let i = 0; i < text.length; i++) {
                    if (text[i] === '`') {
                        // Toggle inCodeBlock state at the start of a code block (assuming matching backticks always enclose code blocks)
                        let start = i;
                        while (i + 1 < text.length && text[i + 1] === '`') i++;
                        inCodeBlock = !inCodeBlock;
                        // Append backticks directly, including those part of the code block syntax
                        result += text.substring(start, i + 1);
                        continue;
                    }

                    if (!inCodeBlock) {
                        switch (text[i]) {
                            case '<':
                                result += '&lt;';
                                break;
                            case '>':
                                result += '&gt;';
                                break;
                            default:
                                result += text[i];
                        }
                    } else {
                        result += text[i];
                    }
                }

                return result;
            }

            window.xmlSanitize = xmlSanitize;

            function marked_parse(dirty_text) {
                const clean_text = xmlSanitize(dirty_text);

                return marked.parse(clean_text);
            }


            ws.onmessage = function (event) {
                const message = JSON.parse(event.data) as WebSocketMessage;
                const message_nonce = message.message_nonce;

                if (message.type === 'data') {

                    const choices = message.content.choices;

                    const message_data = choices[0].delta.content;

                    if (!message_data) return;

                    if (!messages[message_nonce]) messages[message_nonce] = '';

                    messages[message_nonce] += message_data;


                    // check to see if nonce div exists or create it
                    if (document.getElementById(`message-nonce-${message_nonce}`)) {
                        const message_container = document.getElementById(`message-nonce-${message_nonce}`);
                        if (!message_container) throw new Error("found null");

                        message_container.innerHTML = marked_parse(messages[message_nonce]);
                    } else {
                        const message_container = document.createElement('content');
                        message_container.className = 'p-4 m-4 whitespace-pre-wrap border-b-1 border-gray-200';
                        message_container.id = `message-nonce-${message_nonce}`;
                        message_container.innerHTML = marked_parse(messages[message_nonce]);

                        let container = document.getElementById('messages-container');
                        if (!container) throw new Error("found null");

                        container.appendChild(message_container);
                    }

                    // scroll to bottom
                    let container = document.getElementById('messages-container');
                    if (!container) throw new Error("found null");

                    if (lastMesssageRan === '') {
                        lastMesssageRan = message_nonce;
                    }

                    container.scrollTop = container.scrollHeight;
                }

        

            };

            function sendMessage() {
                let message_input = document.getElementById('message-input') as HTMLInputElement;
                if (!message_input) throw new Error("found null");

                const message = message_input.value;
                console.log(message)
                ws.send(JSON.stringify({ content: message, role: 'assistant', name: 'John Doe' }));
            }

            document.getElementById('message-input')?.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && event.ctrlKey) {
                    sendMessage();
                }
            }


            );

            // ctrl + r to visualize code

            document.addEventListener('keydown', function (event) {
                if (event.key === 'r' && event.ctrlKey) {
                    console.log("visualizing code");

             
                    let query = "#message-nonce-" + lastMesssageRan + " pre code";
                    console.log(query);
                    const code_blocks = document.querySelectorAll(query);
                    if (!code_blocks) {
                        console.log('no code block found');
                        return;
                    }
                    const last_code_block = code_blocks[code_blocks.length - 1];

                    if (!last_code_block) {
                        console.log('no code block found');
                        return;
                    }

                    // if the last message was rerun then combine the code blocks

                    let code = '';

                    if (lastMesssageRan === Object.keys(messages)[Object.keys(messages).length - 1]) {
                        for (let i = 0; i < code_blocks.length; i++) {
                            // if code block has class language-js or language-javascript then wrap in script tag
                            if (code_blocks[i].classList.contains('language-js') || code_blocks[i].classList.contains('language-javascript')) {
                                code += "<script>"  + code_blocks[i].innerText + "</";
                                
                                code += "script>";
                            } else {
                                code += code_blocks[i].innerText;
                            }
                        }
                    } else {
                        code = last_code_block.innerText;
                    }


                    const code_container = document.getElementById('code-container');
                    if (!code_container) throw new Error("found null");

                    const iframe = document.createElement('iframe');
                    if (!iframe) throw new Error("found null");
                    iframe.className = 'flex flex-grow justify-between';
                    iframe.srcdoc = code

                    code_container.innerHTML = '';
                    code_container.appendChild(iframe);

                    lastMesssageRan = Object.keys(messages)[Object.keys(messages).length - 1];
                    console.log(lastMesssageRan, Object.keys(messages)[Object.keys(messages).length - 1]);
                }
            });

        })


    }

    function drag_drop_zone() {
        window.addEventListener("load", () => {
            console.log('drag drop zone loaded');
            const dropZone = document.getElementById('drop-zone');
            if (!dropZone) throw new Error("found null");

            const video = document.createElement('video') as HTMLVideoElement;

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                // set border color and background blue-500
                dropZone.classList.add('border-blue-500', 'bg-blue-100')
            });

            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-blue-500', 'bg-blue-100');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-blue-500', 'bg-blue-100');
                if (e.dataTransfer) {
                    console.log(e.dataTransfer.files);
                }
            });
        });
    }

    let html_root = Html(
        Head(
            // import htmx
            Script({ src: 'https://unpkg.com/htmx.org@1.9.10' }),
            // tailwind
            Link({ rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css' }),

            // marked.js
            // Script({ src: 'https://cdn.jsdelivr.net/npm/marked/marked.min.js' }),
            // Script({ src: 'https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.1/marked.min.js' }),


            Script({ src: "https://cdn.jsdelivr.net/npm/marked/lib/marked.umd.js" }),
            Script({ src: "https://cdn.jsdelivr.net/npm/marked-highlight/lib/index.umd.js" }),


            // prism.js
            // Link({ rel: 'stylesheet', href: './prism.css' }),
            // Script({ src: './prism.js' }),

            // highlight.js            
            // https://cdn.jsdelivr.net/npm/highlightjs@9.16.2/highlight.pack.js,
            Script({ src: 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.js' }),
            Link({ rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/atom-one-dark.css' }),

            // client scripts
            Script({ defer: undefined }, client_script),
            Script({ defer: undefined }, drag_drop_zone),
            Script({ defer: undefined }, client_ws),

        ),
        Body(
            {
                class: 'p-4'
            },
            Div({ id: 'hello' }, 'Hello, World!'),
            Div({ id: 'counter' }, `${count}`),
            Div({ 'hx-get': '/test/increment', 'hx-trigger': 'click', 'hx-target': '#counter' }, 'Increment'),
            Div({ id: 'drop-zone', class: 'border-2 border-dashed border-gray-300 rounded-md p-4 m-4' }, 'Drop files here'),

            Div({ class: 'flex flex-col justify-between ' },
                Div({ class: 'flex flex-row justify-between p-4 m-4' },
                    Div({ id: 'messages-container', class: 'text-wrap flex-grow overflow-y-auto p-4', style: 'max-width: 50vh; max-height: 70vh' }),
                    Div({ id: 'code-container', class: 'text-wrap flex flex-grow' }),
                ),
                TextArea({
                    id: 'message-input',
                    placeholder: 'Type a message',
                    class: 'border-2 border-gray-300 rounded-md p-4 m-4 flex-grow overflow-y-auto',
                    style: "max-height: 300px;"
                }),
            ),
        ),
    )
    res.send(html_root.toString());
})


server.listen(3000, () => {
    console.log(`
    Http Server started on http://localhost:3000
    WebSocket Server started on ws://localhost:3000
    Press Ctrl+C to quit
    `);
});
