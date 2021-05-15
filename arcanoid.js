let game = null;

function startGame() {
    game = new Game();
    game.start(20);
}

function push(key) {
    game.keyboard.keys[key] = true;
}

function release(key) {
    game.keyboard.keys[key] = false;
}

class Screen {

    constructor(width, height) {
        this.canvas = document.createElement("canvas");
        let gameDiv = document.getElementById("game");
        gameDiv.appendChild(this.canvas);
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext("2d");
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

class Keyboard {

    constructor() {

        this.keys = []

        window.addEventListener('keydown', function (e) {
            this.keys[e.code] = (e.type == "keydown");
        }.bind(this));

        window.addEventListener('keyup', function (e) {
            this.keys[e.code] = (e.type == "keydown");            
        }.bind(this));
    }

    isPressed(code) {
        return  this.keys[code];
    }
}

class Collideable {

    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    collide(other) {
        return (this.x < other.x + other.width &&
            this.x + this.width > other.x &&
            this.y < other.y + other.height &&
            this.y + this.height > other.y);
    }
}

class Ball extends Collideable {

    static RADIUS = 5;
    static COLOR = 'red';

    constructor(game, x, y, speed, angle) {
        super(x-Ball.RADIUS, y-Ball.RADIUS, 2*Ball.RADIUS, 2*Ball.RADIUS)
        this.game = game;
        this.vx = speed * Math.sin(angle);
        this.vy = speed * Math.cos(angle);
    }

    update(millis) {
        this.x += this.vx * millis / 1000;
        // for(let platform of this.game.platforms) {
        //     if(this.collide(platform)) {
        //         this.vx *= -1;
        //         if(this.vx > 0) this.x = platform.x - this.width - 1
        //         else this.x = platform.x + platform.width + 1;
        //         break;
        //     }
        // }


        this.y += this.vy * millis / 1000;
        for(let platform of this.game.platforms) {
            if(this.collide(platform)) {
                this.vy *= -1;
                if(this.vy > 0) this.y = platform.y + platform.height - 1
                else this.y = platform.y - this.height + 1;
                break;
            }
        }

        if(this.x < 0 || this.x > this.game.screen.canvas.width - this.width) this.vx *= -1;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x + Ball.RADIUS, this.y + Ball.RADIUS, Ball.RADIUS, 0, 2*Math.PI);
        ctx.fillStyle = Ball.COLOR;
        ctx.fill();
    }
}

class Platform extends Collideable {

    static THICKNESS = 20;
    static SPEED = 300;
    static WIDTH = 100;
    static COLOR = 'green';

    constructor(game, y, leftKey, rightKey) {
        super((game.screen.canvas.width - Platform.WIDTH) / 2, y - Platform.THICKNESS / 2, Platform.WIDTH, Platform.THICKNESS)
        this.game = game;
        this.leftKey = leftKey;
        this.rightKey = rightKey;
        
        this.vx = 0;
        this.vy = 0;
    }

    update(millis) {
        let keyboard = this.game.keyboard;
        if(keyboard.isPressed(this.leftKey)) this.moveLeft(millis);
        if(keyboard.isPressed(this.rightKey)) this.moveRight(millis);
    }

    moveLeft(millis) {
        this.x -= Platform.SPEED * millis / 1000;
        if(this.x < 0) this.x = 0;

        for(let ball of this.game.balls) {
            if(this.collide(ball)) {
                ball.x = this.x - ball.width;
            }
        }
    }

    moveRight(millis) {
        this.x += Platform.SPEED * millis / 1000;
        if(this.x + Platform.WIDTH > this.game.screen.canvas.width) this.x = this.game.screen.canvas.width - Platform.WIDTH;

        for(let ball of this.game.balls) {
            if(this.collide(ball)) {
                ball.x = this.x + this.width;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = Platform.COLOR;
        ctx.fillRect(this.x, this.y, Platform.WIDTH, Platform.THICKNESS);
    }
}

class Game {

    constructor() {
        this.screen = new Screen(800, 600);
        this.keyboard = new Keyboard();
        this.paused = true;

        this.balls = []
        this.platforms = []

        this.balls.push(new Ball(this, 400, 300, 100, 0))
        this.balls.push(new Ball(this, 500, 300, 100, Math.PI/3))
        this.platforms.push(new Platform(this, 580, "ArrowLeft", "ArrowRight"));
        this.platforms.push(new Platform(this, 20, "ArrowUp", "ArrowDown"));
    }

    loop(millis) {
        this.update(millis)
        this.screen.clear();
        this.draw(this.screen.ctx);
    }

    update(millis) {
        this.balls.forEach(ball => ball.update(millis));
        this.platforms.forEach(platform => platform.update(millis));
    }

    draw(ctx) {
        this.balls.forEach(ball => ball.draw(ctx));
        this.platforms.forEach(platform => platform.draw(ctx));
    }

    start(millis) {
        this.interval = setInterval(this.loop.bind(this, millis), millis);
        this.setPauseButtonText("Pause");
        this.paused = false;
    }

    stop() {
        clearInterval(this.interval);
        this.setPauseButtonText("Resume");
        this.paused = true;
    }

    setPauseButtonText(text) {
        let pauses = document.getElementsByClassName("pause");
        for(let pause of pauses) {
            pause.textContent = text;
        }
    }

    switchPaused() {
        if(this.paused) this.start(20);
        else this.stop();
    }

}
