import express from 'express';
import { createServer } from 'http';
import { Server } from 'ws';
import Groq from 'groq-sdk';
import { randomUUID } from 'crypto';
import { Body, Div, H1, Head, Html, Input, Link, Script, Style } from './htmx';
import { bottleneck } from './bottleneck';


const app = express();
const server = createServer(app);
const wss = new Server({ server });
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});



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

                ws.send(JSON.stringify({ type: 'data', content: content, message_nonce: message_nonce })); // Send data chunk
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


app.get('/test', (req, res) => {


    function client_script() {
        window.addEventListener("load", () => { 
            console.log('client script loaded');
            let hello = document.getElementById('hello');
            if (!hello) return;
            hello.addEventListener('click', () => {
                if (!hello) return;
                hello.innerText = 'Hello, World! (clicked)';
            });
        }
        );

    }


    function client_ws() {
        let messages = {};
        window.addEventListener("load", () => { 
            console.log('client ws loaded');
            // JavaScript to handle WebSocket communication
            const ws = new WebSocket('ws://localhost:3000/');


            ws.onmessage = function (event) {
                const message = JSON.parse(event.data);
                const message_nonce = message.message_nonce;

                if (message.type === 'data') {
                    // console.log(Object.values(message.content))
                    // const data = Uint8Array.from(Object.values(message.content));
                    // const textDecoder = new TextDecoder('utf-8');
                    // const string = textDecoder.decode(data);
                    // const json = JSON.parse(string);
                    // const choices = json.choices;
                    const choices = message.content.choices;

                    const message_data = choices[0].delta.content;

                    if (!message_data) return;
                    if (!messages[message_nonce]) messages[message_nonce] = '';

                    messages[message_nonce] += message_data;

                    // check to see if nonce div exists or create it
                    if (document.getElementById(`message_nonce-${message_nonce}`)) {
                        const message_container = document.getElementById(`message_nonce-${message_nonce}`);
                        if (!message_container) return;
                        message_container.innerHTML = marked.parse(messages[message_nonce]);
                    } else {
                        const message_container = document.createElement('content');
                        message_container.className = 'p-4 m-4 whitespace-pre-wrap	';
                        message_container.id = `message_nonce-${message_nonce}`;
                        message_container.innerHTML  = marked.parse(messages[message_nonce]);
                       
                        let container = document.getElementById('data-container');
                        if (!container) return;
                        container.appendChild(message_container);
                    }

                    const code_blocks = document.querySelectorAll('pre code');
                    code_blocks.forEach((block) => {
                        Prism.highlightElement(block);
                    });

                }
            };

            // send "message"
            //         ws.send(JSON.stringify({ content: 'Hello, WebSocket!', role: 'assistant', name: 'John Doe' }));

            function sendMessage() {
                let message_input = document.getElementById('message-input') as HTMLInputElement;
                if (!message_input) return;
                const message = message_input.value;
                console.log(message)
                ws.send(JSON.stringify({ content: message, role: 'assistant', name: 'John Doe' }));
            }

            document.getElementById('message-input')?.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    sendMessage();
                }
            }
            );
        })
    }

    function drag_drop_zone() {
        window.addEventListener("load", () => { 
            console.log('drag drop zone loaded');
            const dropZone = document.getElementById('drop-zone');
            if (!dropZone) return;
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
            Script({ src: 'https://cdn.jsdelivr.net/npm/marked/marked.min.js' }),

            // prism.js
            Link({ rel: 'stylesheet', href: './prism.css' }),
            Script({ src: './prism.js' }),

            // client scripts
            Script({defer: undefined }, client_script),
            Script({defer: undefined }, drag_drop_zone),
            Script({defer: undefined }, client_ws),

        ),
        Body(
            {
                class: 'p-4'
            },
            Div({ id: 'hello' }, 'Hello, World!'),
            Div({ id: 'counter' }, `${count}`),
            Div({ 'hx-get': '/test/increment', 'hx-trigger': 'click', 'hx-target': '#counter' }, 'Increment'),
            Div({ id: 'drop-zone', class: 'border-2 border-dashed border-gray-300 rounded-md p-4 m-4' }, 'Drop files here'),
            Div({ id: 'data-container', class: 'text-wrap' }),
            Input({ id: 'message-input',
             type: 'text-area',
             placeholder: 'Type a message',
             class: 'border-2 border-gray-300 rounded-md p-4 m-4' 
            }),
        )
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
