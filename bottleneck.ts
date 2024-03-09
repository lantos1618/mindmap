import { Request, Response } from 'express';
import { Body, Canvas, Div, H1, Head, Html, Img, Input, Link, Script, Source, Style, Svg, Video, Title, Ul, Li } from './htmx';
import Groq from 'groq-sdk';


export function bottleneck(req: Request, res: Response) {

    // client script
    let client_script = function () {
        let calibrated = false;
        const window_box_enum = {
            top_left: 'top_left',
            top_right: 'top_right',
            bottom_right: 'bottom_right',
            bottom_left: 'bottom_left',
        }

        window.addEventListener('load', () => {
            // bounding positions of the window
            let window_bounds = {
                top_left: { x: 0, y: 0, positions: [] },
                top_right: { x: window.innerWidth, y: 0, positions: [] },
                bottom_right: { x: window.innerWidth, y: window.innerHeight, positions: [] },
                bottom_left: { x: 0, y: window.innerHeight, positions: [] },
            };
            const ctracker = new clm.tracker();

            let box = document.createElement('div');
            document.body.appendChild(box);


            let positions = [];


            // Define buffers for smoothing
            const positionBufferX = [];
            const positionBufferY = [];
            const bufferSize = 3; // Number of positions to keep for smoothing

            function addPositionToBuffer(x, y) {
                if (positionBufferX.length >= bufferSize) {
                    positionBufferX.shift();
                    positionBufferY.shift();
                }
                positionBufferX.push(x);
                positionBufferY.push(y);
            }

            function getSmoothedPosition() {
                const averageX = positionBufferX.reduce((acc, val) => acc + val, 0) / positionBufferX.length;
                const averageY = positionBufferY.reduce((acc, val) => acc + val, 0) / positionBufferY.length;
                return { x: averageX, y: averageY };
            }

            function drawBox(x: number, y: number, width: number, height: number) {
                box.style.position = 'absolute';
                box.style.top = y + 'px';
                box.style.left = x + 'px';
                box.style.width = width + 'px';
                box.style.height = height + 'px';
                box.style.borderRadius = '100px';
                box.style.backgroundColor = 'red';
            }


            function calibrate() {
                console.log('calibrating');
                // gets the clmtrackr eye points and sets the window bounds

                let window_box_pos = window_box_enum.top_left;
                console.log(window_box_pos);

                let index = 0;
                // display a box top left
                drawBox(window_bounds[window_box_pos].x - 50, window_bounds[window_box_pos].y - 50, 100, 100);

                // wait for user to click on the box
                // set clmtrackr eye points to the top left

                function clickHandler(event) {
                    box.style.backgroundColor = 'green';
                    setTimeout(() => {
                        window_bounds[window_box_pos].positions = ctracker.getCurrentPosition();
                        console.log(window_box_pos, window_bounds[window_box_pos].positions);
                        index++;
                        if (index == 4) {
                            // calibration complete
                            calibrated = true;
                            console.log('calibration complete');
                            console.log(window_bounds);

                            // remove the click handler
                            box.removeEventListener('click', clickHandler);
                            return;
                        }

                        window_box_pos = Object.values(window_box_enum)[index];
                        drawBox(window_bounds[window_box_pos].x - 50, window_bounds[window_box_pos].y - 50, 100, 100);
                    }, 100);
                }

                box.addEventListener('click', clickHandler);

            }

            navigator.mediaDevices.getUserMedia({ video: true })
                .then(function (stream) {
                    const video = document.getElementById('video') as HTMLVideoElement;
                    if (!video) return;
                    video.srcObject = stream;
                    video.play();
                    startTracking();
                    calibrate();
                })
                .catch(function (err) {
                    console.log("An error occurred: " + err);
                });

            function startTracking() {
                const video = document.getElementById('video') as HTMLVideoElement;
                const canvas = document.getElementById('canvas') as HTMLCanvasElement;
                if (!video || !canvas) return;
                const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
                if (!ctx) return;

                ctracker.init();
                ctracker.start(video);

                function drawLoop() {
                    requestAnimationFrame(drawLoop);

                    if (!ctx) return;
                    if (!canvas) return;

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctracker.draw(canvas);

                    if (calibrated) {
                        // Get current positions
                        let positions = ctracker.getCurrentPosition();
                        
                        // Assuming positions[27] is valid and contains the coordinates we're interested in
                        let x = positions[27][0];
                        let y = positions[27][1];
                    
                        // Add position to buffer
                        addPositionToBuffer(x, y);
                    
                        // Get smoothed position
                        let { x: smoothedX, y: smoothedY } = getSmoothedPosition();
                    
                        let { x: window_x, y: window_y } = map_eye_to_window_boundary(smoothedX, smoothedY);
                    
                        drawBox(window_x - 50, window_y - 50, 100, 100);
                    }
                }
                drawLoop();
            }

            function map_eye_to_window_boundary(eye_x: number, eye_y: number): { x: number, y: number } {

                // x lerp between  window_bounds.top_left.positions[27][0] and window_bounds.top_right.positions[27][0] then map to window_bounds.top_left.x and window_bounds.top_right.x
                // y lerp between window_bounds.top_left.positions[27][1] and window_bounds.bottom_left.positions[27][1] then map to window_bounds.top_left.y and window_bounds.bottom_left.y

                let eye_x_lerp = (eye_x - window_bounds.top_left.positions[27][0]) / (window_bounds.top_right.positions[27][0] - window_bounds.top_left.positions[27][0]);
                let eye_y_lerp = (eye_y - window_bounds.top_left.positions[27][1]) / (window_bounds.bottom_left.positions[27][1] - window_bounds.top_left.positions[27][1]);

                let x = window_bounds.top_left.x + eye_x_lerp * (window_bounds.top_right.x - window_bounds.top_left.x);
                let y = window_bounds.top_left.y + eye_y_lerp * (window_bounds.bottom_left.y - window_bounds.top_left.y);

                return { x, y };
            }
        })

    }

    let html_root = Html(

        Head(
            Title('CLMTrackr Example'),
            // tailwind css
            Link({ rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css' }),
            Script({ src: 'https://cdnjs.cloudflare.com/ajax/libs/clmtrackr/1.1.2/clmtrackr.min.js' }),
            Script({}, client_script),

            Style({}, `
            .mind-map {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            
            .node {
                border: 2px solid black;
                border-radius: 10px;
                padding: 10px;
                margin: 5px;
                text-align: center;
            }
            
            .central-node {
                font-weight: bold;
                background-color: yellow;
            }
            
            .branches, .sub-branches {
                list-style-type: none;
                padding: 0;
            }
            
            .branches > li, .sub-branches > li {
                margin: 10px;
                position: relative;
            }
            
            .branches > li::before, .sub-branches > li::before {
                content: '';
                position: absolute;
                left: 50%;
                border-left: 2px solid black;
            }
            
            .branches > li::before {
                top: -20px;
                height: 20px;
            }
            
            .sub-branches > li::before {
                top: -10px;
                height: 10px;
            }

            `),
            Script({}, () => {
                window.addEventListener('load', () => {
                    document.querySelectorAll('.node').forEach(node => {
                        node.addEventListener('click', function() {
                            const subBranches = this.nextElementSibling;
                            if(subBranches && subBranches.classList.contains('sub-branches')) {
                                subBranches.style.display = subBranches.style.display === 'none' ? 'block' : 'none';
                            }
                        });
                    });
                })
            })
        ),
        Body(
            {},
            Div({ id: 'container', class: 'relative' },

                Canvas({ id: 'canvas', width: "800", height: "600", class: 'absolute top-0 left-0' }),
                Video({ id: 'video', width: "800", height: "600", autoplay: "true" }),
            ),


            Div({ class: 'mind-map' },
                Div({ class: 'node central-node' }, 'Central Idea'),
                Ul({ class: 'branches'
                },
                    Li({},
                        Div({ class: 'node' }, 'Subtopic 1'),
                        Ul({ class: 'sub-branches' },
                            Li({}, Div({ class: 'node' }, 'Detail 1')),
                            Li({}, Div({ class: 'node' }, 'Detail 2')),
                        )
                    ),
                    Li({}, Div({ class: 'node' }, 'Subtopic 2')),
                    Li({}, Div({ class: 'node' }, 'Subtopic 3')),
                )
            )
                    
                

        )
    );
    res.send(html_root.toString());
}
