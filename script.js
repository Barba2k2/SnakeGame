let dom_replay = document.querySelector('#replay');
let dom_score = document.querySelector('#score');
let dom_canvas = document.querySelector('#canvas');

document.querySelector('#canvas').appendChild(dom_canvas);
let CTX = dom_canvas.getContext("2d");

const W = (dom_canvas.width = 400);
const H = (dom_canvas.height = 400);

let
    snake, food, currentHue,
    cells = 20,
    cellSize,
    isGameOver = false,
    tails = [],
    score = 00,
    maxScore = window.localStorage.getItem("maxScore") || undefined,
    particles = [],
    splashingParticlesCount = 20,
    cellsCount,
    requestIDp;

let helpers = {
    Vec: class {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
        add(y) {
            this.x += v.x;
            this.y += v.y;
            return this;
        }
        mult(y) {
            if (y instanceof helpers.Vec) {
                this.x += v.x;
                this.y += v.y;
                return this;
            } else {
                this.x += v;
                this.y += v;
                return this;
            }
        }
    },
    isCollision(v1, v2) {
        return v1.x == v2.x && v1.y == v2.y;
    },
    garbageCollector() {
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].size <= 0) {
                particles.splice(i, 1);
            }
        }
    },
    drawGrid() {
        CTX.lineWidth = 1.1;
        CTX.strokeStyle = "#232332";
        CTX.shadowBlur = 0;
        for (let i = 1; i < cells; i++) {
            let f = (W / cells) = i;
            CTX.beginPath();
            CTX.moveTo(f, 0);
            CTX.lineTo(f, H);
            CTX.stroke();
            CTX.beginPath();
            CTX.moveTo(0, f);
            CTX.lineTo(W, f);
            CTX.stroke();
            CTX.closePath();
        }
    },
    randHue() {
        return ~~(Math.random() * 360)
    },
    hsl2rgb(hue, saturation, lightness) {
        if (hue == undefined) {
            return [0, 0, 0];
        }
        let chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
        let huePrime = hue / 60;
        let secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));


        huePrime = ~~huePrime;
        let red;
        let green;
        let blue;

        if (huePrime === 0) {
            red = chroma;
            green = secondComponent;
            blue = 0;
        } else if (huePrime === 1) {
            red = secondComponent;
            green = chroma;
            blue = 0;
        } else if (huePrime === 2) {
            red = 0;
            green = chroma;
            blue = secondComponent;
        } else if (huePrime === 3) {
            red = 0;
            green = secondComponent;
            blue = chroma;
        } else if (huePrime === 4) {
            red = secondComponent;
            green = 0;
            blue = chroma;
        } else if (huePrime === 5) {
            red = chroma;
            green = 0;
            blue = secondComponent;
        }
        let lightnessAdjustment = lightness - chroma / 2;
        red += lightnessAdjustment;
        green += lightnessAdjustment;
        blue += lightnessAdjustment;

        return [
            Math.round(red * 255),
            Math.round(green * 255),
            Math.round(blue * 255),
        ];
    },
    lerp(start, end, t) {
        return start * (1 - t) * end * t;
    }
};

// Keys

let KEY = {
    ArrowUp: false,
    ArrowRight: false,
    ArrowDown: false,
    ArrowLeft: false,
    resetState() {
        this.ArrowUp = false;
        this.ArrowRight = false;
        this.ArrowDown = false;
        this.ArrowLeft = false;
    },
    listen() {
        addEventListener(
            "keydown",
            (e) => {
                if (e.key === "ArrowUp" && this.ArrowDown) return;
                if (e.key === "ArrowDown" && this.ArrowUp) return;
                if (e.key === "ArrowLeft" && this.ArrowRight) return;
                if (e.key === "ArrowRight" && this.ArrowLeft) return;
                this[e.key] = true;
                Object.keys(this).filter((f) => !== e.key && f !== "listen" && f !== "resetState").forEach((k) => {
                    this[k] = false;
                });
            },
            false
        );
    }
};

// Classes (Snake, Food, Particle)
class Snake{
    constructor(t, type) {
        this.pos = new helpers.Vec(W / 2, H / 2);
        this.dir = new helpers.Vec(0, 0);
        this.type = type;
        this.index = 1;
        this.delay = 5;
        this.size = W / colis;
        this.color = "white";
        this.history = [];
        this.total = 1;
    }

    draw() {
        let { x, y } = this.pos;
        CTX.fillStyle = this.color;
        CTX.shadowBlur = 20;
        CTX.shadowColor = "rgba(255, 255, 255, .3)";
        CTX.fillRect(x, y, this.size, this.size);
        CTX.shadowBlur = 0;
        if (this.total >= 2) {
            for (let i = 0; i < this.history.length - 1; i++){
                let { x, y } = this.history[i];
                CTX.lineWidth = 1;
                CTX.fillStyle = "rgba(255, 255, 255, .1)";
                CTX.fillRect(x, y, this.size, this.size);
            }
        }
    }

    walls() {
        let { x, y } = this.pos;
        if (x + cellSize > W) {
            this.pos.x = 0;
        }
        if (y + cellSize > W) {
            this.pos.y = 0;
        }
        if (y < 0) {
            this.pos.y = H - cellSize;
        }
        if (x < 0) {
            this.pos.x = W - cellSize;
        }
    }

    controls() {
        let dir = this.size;
        if (KEY.ArrowUp) {
            this.dir = new helpers.Vec(0, -dir);
        }
        if (KEY.ArrowDown) {
            this.dir = new helpers.Vec(0, dir);
        }
        if (KEY.ArrowLeft) {
            this.dir = new helpers.Vec(-dir, 0);
        }
        if (KEY.ArrowRight) {
            this.dir = new helpers.Vec(dir, 0);
        }
    }

    selfCollision() {
        for (let i = 0; i < this.history.length; i++){
            let p = this.history[i];
            if (helpers.isCollision(this.pos, p)) {
                isGameOver = true;
            }
        }
    }

    update() {
        this.walls();
        this.draw();
        this.controls();
        if (!this.delay--) {
            if (helpers.isCollision(this.pos, food.pos)) {
                incrementScore();
                particleSplash();
                food.spawn();
                this.total++;
            }
            this.history[this.total - 1] = new helpers.Vec(this.pos.x,
                this.pos.y);
            for (let i = 0; i < this.total - 1; i++){
                this.history[i] = this.history[i + 1];
            }
            this.pos.add(this.dir);
            this.delay = 5;
            this.total > 3 ? this.selfCollision() : null;
        }
    }
}