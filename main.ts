import express from 'express';
import { createServer } from 'http';
import { Server } from 'ws';
import Groq from 'groq-sdk';
import { randomUUID } from 'crypto';
import { Body, Div, H1, Head, Html, Input, Link, Script, Style, TextArea } from './htmx';
import { bottleneck } from './bottleneck';


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
                    {
                        content: `USE  ONLY ONE \`\`\` CODE BLOCK be sure tag it html;
                        Tailwind, 
                        wrap any javascript with window.addEventListner('load', ...), 
                        show all code,
                        CODE ONLY, NO TALKING`,
                        role: 'system',
                    },
                    message
                ],
                // model: "mixtral-8x7b-32768",
                model: "llama3-70b-8192",
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




type Block = {
    value: string;
    type: "xml" | "code" | "text";
}




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

            function xmlSanitize(s: string): String {
                let blocks: Block[] = [];
            
                let start = 0;
                let end = 0;
                while (end < s.length) {

                    // skip already back ticked code blocks 
                    if (s.startsWith("`", end)) {
                        // count number of backticks
                        let count = 0;
                        let match = "";
                        while (s.startsWith("`", end + count)) {
                            count++;
                            match += "`";
                        }

                        // find the end of the code block
                        end += count;
                        while (end < s.length && !s.startsWith(match, end)) {
                            end++;
                        }
                        end += count;
                        blocks.push({ value: s.substring(start, end), type: "code" });

                        // skip to end of code block
                        start = end;
                        continue;
                    }


                    // find xml blocks
                    if (s.startsWith("<", end)) {
                        // get tag
                        let tag = "";
                        end++;
                        while (end < s.length && !s.startsWith(">", end)) {
                            end++;
                        }
                        end++;
                        tag = s.substring(start, end);

                        // find end tag
                        let end_tag = "</" + tag.substring(1);
                        end = s.indexOf(end_tag, start);
                        end += end_tag.length;
                        blocks.push({ value: s.substring(start, end), type: "xml" });
                        start = end;
                        continue;

                    }

                    // find text blocks
                    while (end < s.length && !s.startsWith("<", end) && !s.startsWith("`", end)) {
                        end++;
                    }
                    blocks.push({ value: s.substring(start, end), type: "text" });
                    start = end;
                    continue;

                }


                let final = blocks.map(block => {
                    if (block.type === "code") {
                        return block.value;
                    }
                    if (block.type === "xml") {
                        return "```html" + block.value + "```\n";
                    }
                    return block.value;
                }).join('');
                // console.log("original", s);
                // console.log("blocks", blocks);
                // console.log("final", final);

                return final
            }
            

  

            let message_nonce = "";
            ws.onmessage = function (event) {
                const message = JSON.parse(event.data) as WebSocketMessage;
                if (message.message_nonce) {
                    message_nonce = message.message_nonce;
                }
                if (message.type === 'data') {
                    const choices = message.content.choices;
                    const message_data = choices[0].delta.content;
                    if (!message_data) return;

                    if (!messages[message_nonce]) messages[message_nonce] = '';

                    messages[message_nonce] += message_data;

                    let message_sanitized = marked.parse( xmlSanitize(messages[message_nonce]));
                    
                    // check to see if nonce div exists or create it
                    if (document.getElementById(`message-nonce-${message_nonce}`)) {
                        const message_container = document.getElementById(`message-nonce-${message_nonce}`);
                        if (!message_container) throw new Error("found null");

                        message_container.innerHTML = message_sanitized;
                    } else {
                        const message_container = document.createElement('content');
                        message_container.className = 'p-4 m-4 whitespace-pre-wrap border-b-1 border-gray-200';
                        message_container.id = `message-nonce-${message_nonce}`;
                        message_container.innerHTML = message_sanitized;

                        let container = document.getElementById('messages-container');
                        if (!container) throw new Error("found null");

                        container.appendChild(message_container);
                    }

                    // scroll to bottom
                    let container = document.getElementById('messages-container');
                    if (!container) throw new Error("found null");



                    container.scrollTop = container.scrollHeight;
                }
                if (message.type === 'end') {
                    let message_data = messages[message_nonce];
                    let message_sanitized = xmlSanitize(message_data)
                    messages[message_nonce+"-sanitized"] = message_sanitized
                }
            };

            function sendMessage() {
                let message_input = document.getElementById('message-input') as HTMLInputElement;
                if (!message_input) throw new Error("found null");

                const message = message_input.value;
                ws.send(JSON.stringify({ content: Object.values(messages).join(" ") + message, role: 'assistant', name: 'John Doe' }));

                // Get the current history from local storage or initialize it as an empty array
                let user_message_history = JSON.parse(localStorage.getItem('user_message_history') || '[]');

                // Add the new message to the history
                user_message_history.push({ content: message, role: 'user', name: 'John Doe' });

                // Store the updated history back in local storage
                localStorage.setItem('user_message_history', JSON.stringify(user_message_history));

                console.log('history', user_message_history);
            }

            let historyIndex = -1;
            function scrollHistory(up: boolean) {

                const messageHistory = JSON.parse(localStorage.getItem('user_message_history') || '[]');
                if (!messageHistory.length) return; // exit if no message history

                const messageInput = document.getElementById('message-input') as HTMLInputElement;
                if (!messageInput) throw new Error("found null");

                if (up) {
                    if (historyIndex < messageHistory.length - 1) {
                        historyIndex++;
                    }
                } else {
                    if (historyIndex > 0) {
                        historyIndex--;
                    }
                }

                messageInput.value = messageHistory[messageHistory.length - 1 - historyIndex].content;

                // Set the cursor to the end of the input
                messageInput.selectionStart = messageInput.selectionEnd = messageInput.value.length;

            }

            document.getElementById('message-input')?.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && event.ctrlKey) {
                    sendMessage();
                }

                if (event.key === 'ArrowUp' && event.shiftKey) {
                    event.preventDefault(); // prevent default scrolling behavior
                    scrollHistory(true);
                } else if (event.key === 'ArrowDown' && event.shiftKey) {
                    event.preventDefault(); // prevent default scrolling behavior
                    scrollHistory(false);
                }
            });


            // ctrl + r to visualize code

            document.addEventListener('keydown', function (event) {
                if (event.key === 'r' && event.ctrlKey) {
                    let message_id = Object.keys(messages)[Object.keys(messages).length - 1]
                    let message = messages[message_id] as string;
                    console.log("visualizing code, message:", message, message_id);
                    // match ```javascript or ```css or ```html anywhere in the message
                    const code_blocks = message.match(/```(js|javascript|css|html)?[\s\S]*?```/g) as string[] || [];
                    console.log("visualizing code", code_blocks);

                    if (code_blocks.length === 0) return;

                    let code = '';

                    for (let i = 0; i < code_blocks.length; i++) {
                        // if code block has class language-js or language-javascript then wrap in script tag
                        if (code_blocks[i].startsWith('```js')) {
                            code += "<script>" + code_blocks[i].substring(6, code_blocks[i].length - 4) + "</";
                            code += "script>";
                        } else if (code_blocks[i].startsWith('```javascript')) {
                            code += "<script>" + code_blocks[i].substring(13, code_blocks[i].length - 4) + "</";
                            code += "script>";
                        }
                        else if (code_blocks[i].startsWith('```html')) {
                            code += code_blocks[i].substring(7, code_blocks[i].length - 4);
                        }
                        else if (code_blocks[i].startsWith('```css')) {
                            code += "<style>" + code_blocks[i].substring(6, code_blocks[i].length - 4) + "</";
                            code += "style>";
                        } else {
                            code += code_blocks[i];
                        }
                    }


                    const code_container = document.getElementById('code-container');
                    if (!code_container) throw new Error("found null");

                    const iframe = document.createElement('iframe');
                    if (!iframe) throw new Error("found null");
                    iframe.className = 'flex flex-grow justify-between';
                    iframe.srcdoc = code

                    code_container.innerHTML = '';
                    code_container.appendChild(iframe);

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
                // dark like atom dark #282c34
                // class: 'p-4 text-white',
                // style: 'background-color: #121212'
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
                    class: 'p-4 m-4 border-2 border-gray-300 rounded-md',
                    style: "max-height: 300px; background: inherit"
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

