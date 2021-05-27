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
        this.width = width;
        this.height = height;
        let gameDiv = document.getElementById("game");
        gameDiv.appendChild(this.canvas);
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext("2d");
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
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
        let collideables = [this.game.horizontalPlatform]
        if(this.game.verticalEnabled) collideables.push(this.game.verticalPlatform);
        collideables = collideables.concat(this.game.blocks)

        this.x += this.vx * millis / 1000;
        for(let collideable of collideables) {
            if(this.collide(collideable)) {
                if(this.vx > 0) this.x = collideable.x - this.width;
                else this.x = collideable.x + collideable.width;
                this.vx *= -1;
                if(collideable instanceof Block)
                    this.game.hitBlock(collideable);
            }
        }


        this.y += this.vy * millis / 1000;
        for(let collideable of collideables) {
            if(this.collide(collideable)) {
                if(this.vy > 0) this.y = collideable.y - this.height;
                else this.y = collideable.y + collideable.height;
                this.vy *= -1;
                if(collideable instanceof Block)
                    this.game.hitBlock(collideable);
            }
        }

        if(this.x > this.game.screen.width - this.width) this.vx *= -1;
        if(this.y < 0) this.vy *= -1;
        if(!this.game.verticalEnabled && this.x < 0) this.vx *= -1;

        if(this.x < -this.width || this.y > this.game.screen.height) {
            const index = this.game.balls.indexOf(this);
            this.game.balls.splice(index, 1)
        }
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

    constructor(game, x, y, orientation, firstKey, secondKey) {
        if(orientation=='horizontal') super(x-Platform.WIDTH/2, y-Platform.THICKNESS/2, Platform.WIDTH, Platform.THICKNESS)
        else super(x-Platform.THICKNESS/2, y-Platform.WIDTH/2, Platform.THICKNESS, Platform.WIDTH)
        this.game = game;
        this.orientation = orientation;
        this.firstKey = firstKey;
        this.secondKey = secondKey;
    }

    update(millis) {
        let keyboard = this.game.keyboard;
        if(this.orientation == 'horizontal' && keyboard.isPressed(this.firstKey)) this.moveLeft(millis);
        if(this.orientation == 'horizontal' && keyboard.isPressed(this.secondKey)) this.moveRight(millis);
        if(this.orientation == 'vertical' && keyboard.isPressed(this.firstKey)) this.moveDown(millis);
        if(this.orientation == 'vertical' && keyboard.isPressed(this.secondKey)) this.moveUp(millis);
    }

    moveLeft(millis) {
        this.x -= Platform.SPEED * millis / 1000;
        if(this.x < 0) this.x = 0;

        for(let ball of this.game.balls) {
            if(this.collide(ball)) {
                ball.x = this.x - ball.width;
                ball.vx = -Platform.SPEED;
            }
        }
    }

    moveRight(millis) {
        this.x += Platform.SPEED * millis / 1000;
        if(this.x + Platform.WIDTH > this.game.screen.width) this.x = this.game.screen.width - Platform.WIDTH;

        for(let ball of this.game.balls) {
            if(this.collide(ball)) {
                ball.x = this.x + this.width;
                ball.vx = Platform.SPEED;
            }
        }
    }

    moveUp(millis) {
        this.y -= Platform.SPEED * millis / 1000;
        if(this.y < 0) this.y = 0;

        for(let ball of this.game.balls) {
            if(this.collide(ball)) {
                ball.y = this.y - ball.height;
                ball.vy = -Platform.SPEED;
            }
        }
    }

    moveDown(millis) {
        this.y += Platform.SPEED * millis / 1000;
        if(this.y + Platform.WIDTH > this.game.screen.height) this.y = this.game.screen.height - Platform.WIDTH;

        for(let ball of this.game.balls) {
            if(this.collide(ball)) {
                ball.y = this.y + this.height;
                ball.vy = Platform.SPEED;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = Platform.COLOR;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}


class Block extends Collideable {

    static POINTS = 10;
    static WIDTH = 40
    static HEIGHT = 20
    static COLOR = 'blue'

    constructor(game, x, y) {
        super(x, y, Block.WIDTH, Block.HEIGHT)
        this.game = game;
        this.points = Block.POINTS;
    }

    draw(ctx) {
        ctx.fillStyle = Block.COLOR;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}


class Game {

    constructor() {
        this.screen = new Screen(800, 500);
        this.keyboard = new Keyboard();
        this.paused = true;
        this.verticalEnabled = true;
        
        this.setVerticalPlatform(this.verticalEnabled);
        this.initLevel();
    }

    loop(millis) {
        this.update(millis)
        this.screen.clear();
        this.draw(this.screen.ctx);
    }

    update(millis) {
        this.balls.forEach(ball => ball.update(millis));
        this.horizontalPlatform.update(millis);
        if(this.verticalEnabled) this.verticalPlatform.update(millis);

        if(this.balls.length == 0) this.initLevel();
    }

    draw(ctx) {
        this.balls.forEach(ball => ball.draw(ctx));
        this.horizontalPlatform.draw(ctx);
        if(this.verticalEnabled) this.verticalPlatform.draw(ctx);
        this.blocks.forEach(block => block.draw(ctx));
        this.drawScore(ctx);
        this.drawTime(ctx);
    }

    drawScore(ctx) {
        ctx.font = "20px Comic Sans MS";
        ctx.fillStyle = "red";
        ctx.fillText("Score: " + this.score, 10, 25);
    }

    drawTime(ctx) {
        const elapsedSeconds = (new Date().getTime() - this.startTime.getTime()) / 1000;
        const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
        const seconds = String(Math.floor(elapsedSeconds % 60)).padStart(2, '0');
        const text = "Time: " + minutes + ":" + seconds;
        ctx.font = "20px Comic Sans MS";
        ctx.fillStyle = "red";
        ctx.fillText(text, this.screen.width-120, 25);
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

    setVerticalPlatform(enabled) {
        this.verticalEnabled = enabled;
        const button = document.getElementById("vertical-platform-button");
        if(enabled) button.classList.add("selected");
        else button.classList.remove("selected");
    }

    switchVerticalPlatform() {
        this.setVerticalPlatform(!this.verticalEnabled);
    }

    reset() {
        this.balls = [];
        this.blocks = [];
        this.score = 0;
        this.verticalPlatform = new Platform(this, 20, 300, "vertical", "ArrowDown", "ArrowUp")
        this.horizontalPlatform = new Platform(this, 400, 480, "horizontal", "ArrowLeft", "ArrowRight")
        this.startTime = new Date();
    }

    initLevel() {
        this.reset();
        this.balls.push(new Ball(this, 400, 100, 100, Math.PI/6));
        this.balls.push(new Ball(this, 200, 200, 150, Math.PI/3));
        this.addBlocks();
    }

    addBlocks() {
        let SPACE_BETWEEN = 5

        for(let i=0; i<5; i++) {
            for(let j=0; j<16; j++) {
                let block = new Block(this, 50+j*(Block.WIDTH+SPACE_BETWEEN), 50+i*(Block.HEIGHT+SPACE_BETWEEN))
                this.blocks.push(block);
            }
        }
    }

    hitBlock(block) {
        const index = this.blocks.indexOf(block);
        this.blocks.splice(index, 1);
        this.score += block.points;
    }
}
