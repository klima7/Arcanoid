let game = null;

disableScrollingWithKeys();

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

function disableScrollingWithKeys() {
    window.addEventListener("keydown", function(e) {
        if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
            e.preventDefault();
        }
    }, false);
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

    static BOUNCE_FACTOR = 100;
    static RADIUS = 5;
    static COLOR = 'red';

    constructor(game, x, y, speed, angle) {
        super(x-Ball.RADIUS, y-Ball.RADIUS, 2*Ball.RADIUS, 2*Ball.RADIUS)
        this.game = game;
        this.speed = speed;
        this.vx = speed * Math.sin(angle);
        this.vy = speed * Math.cos(angle);
        this.isSticked = false;
    }

    update(millis) {
        if(this.isSticked) 
            return;

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

                let shift = ((this.y + this.height/2) - (collideable.y + collideable.height/2)) / (collideable.height/2);
                this.setVelocityY(shift*Ball.BOUNCE_FACTOR);
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

                let shift = ((this.x + this.width/2) - (collideable.x + collideable.width/2)) / (collideable.width/2);
                this.setVelocityX(shift*Ball.BOUNCE_FACTOR);

                if(collideable instanceof Platform && this.game.pendingStick != 0) {
                    this.isSticked = true;
                    collideable.stickedBalls.push(this);
                    this.game.pendingStick -= 1;
                }
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

    setVelocityX(vx) {
        this.vx = vx;
        this.vy = Math.sqrt(this.speed*this.speed - vx*vx) * Math.sign(this.vy);
    }

    setVelocityY(vy) {
        this.vy = vy;
        this.vx = Math.sqrt(this.speed*this.speed - vy*vy) * Math.sign(this.vx);
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
        this.stickedBalls = [];
    }

    update(millis) {
        let oldX = this.x;
        let oldY = this.y;

        let keyboard = this.game.keyboard;
        if(this.orientation == 'horizontal' && keyboard.isPressed(this.firstKey)) this.moveLeft(millis);
        if(this.orientation == 'horizontal' && keyboard.isPressed(this.secondKey)) this.moveRight(millis);
        if(this.orientation == 'vertical' && keyboard.isPressed(this.firstKey)) this.moveDown(millis);
        if(this.orientation == 'vertical' && keyboard.isPressed(this.secondKey)) this.moveUp(millis);
        if(keyboard.isPressed("KeyS")) this.fire();

        let changeX = this.x - oldX;
        let changeY = this.y - oldY;

        this.moveStickedBalls(changeX, changeY);
    }

    fire() {
        this.stickedBalls.forEach(ball => ball.isSticked = false);
        this.stickedBalls = [];
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
        let oldX = this.x;
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

    moveStickedBalls(x, y) {
        this.stickedBalls.forEach(ball => {
            ball.x += x;
            ball.y += y;
        })
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
        this.color = Block.COLOR;
        this.boost = null;

        let rand = Math.floor(Math.random() * 10);
        if(rand < 2) {
            this.color = StickBoost.COLOR;
            this.boost = new StickBoost(this.game, this.x+this.width/2, this.y+this.height/2);
        }
        else if(rand < 4) {
            this.color = BallBoost.COLOR;
            this.boost = new BallBoost(this.game, this.x+this.width/2, this.y+this.height/2);
        }
        else if(rand < 5) {
            this.color = SpeedBoost.COLOR;
            this.boost = new SpeedBoost(this.game, this.x+this.width/2, this.y+this.height/2);
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    hit() {
        if(this.boost != null) {
            this.game.boosts.push(this.boost);
        }
    }
}


class Ranking {
    
    constructor(game, x, y) {
        this.table = document.getElementById("score-table");
        this.initDB();
    }

    initDB() {
        let openRequest = indexedDB.open('Arcanoid', 1);

        openRequest.onsuccess = () => {
            this.db = openRequest.result;
            this.refreshTable();
        };
        
        openRequest.onupgradeneeded = () => {
            this.db = openRequest.result;
            this.db.createObjectStore('Ranking', {autoIncrement: true});
        };

        openRequest.onerror = () => console.log("Error", openRequest.error);
    }

    setTableContent(scores) {
        this.clearTable();
        scores.sort((a, b) => b.score - a.score);
        for(let pos=0; pos<scores.length; pos++)
            this.insertTableRow(pos+1, scores[pos]);
    }

    insertTableRow(position, score) {
        let body = this.table.getElementsByTagName('tbody')[0];
        let row = body.insertRow(-1);

        let positionCell = row.insertCell();
        let nickCell = row.insertCell();
        let scoreCell = row.insertCell();
        let timeCell = row.insertCell();
        let dateCell = row.insertCell();

        let minutes = String(Math.floor(score.time/60)).padStart(2, '0');
        let seconds = String(score.time%60).padStart(2, '0');
        let timeText = minutes + ":" + seconds;

        let d = score.date;
        let time = new Date,
    format = [d.getMonth()+1,
               d.getDate(),
               d.getFullYear()].join('/')+' '+
              [d.getHours(),
               d.getMinutes(),
               d.getSeconds()].join(':');

        positionCell.appendChild(document.createTextNode(position))
        nickCell.appendChild(document.createTextNode(score.nick))
        dateCell.appendChild(document.createTextNode(format))
        scoreCell.appendChild(document.createTextNode(score.score))
        timeCell.appendChild(document.createTextNode(timeText))
    }

    clearTable() {
        let oldBody = this.table.getElementsByTagName('tbody')[0];
        let newBody = document.createElement('tbody');
        this.table.replaceChild(newBody, oldBody);
    }

    clearDatabase() {
        let transactoin = this.db.transaction(["Ranking"], "readwrite");
        let ranking = transactoin.objectStore("Ranking");
        let request = ranking.clear();
        request.onsuccess = () => this.refreshTable();
    }

    refreshTable() {
        let transactoin = this.db.transaction(["Ranking"], "readwrite");
        let ranking = transactoin.objectStore("Ranking");

        let request = ranking.getAll();
        request.onsuccess = () => this.setTableContent(request.result);
    }

    addRecord(record) {
        let request = this.db.transaction(["Ranking"], "readwrite")
        .objectStore("Ranking")
        .put(record);
        request.onsuccess = () => this.refreshTable();
    }
}


class Boost extends Collideable {

    static VELOCITY = 100;
    static RADIUS = 10;

    constructor(game, x, y, color, name) {
        super(x-Boost.RADIUS, y-Boost.RADIUS, 2*Boost.RADIUS, 2*Boost.RADIUS)
        this.game = game;
        this.points = Block.POINTS;
        this.color = color;
        this.name = name;
    }

    update(millis) {
        this.y += Boost.VELOCITY * millis / 1000;

        let platforms = [this.game.verticalPlatform, this.game.horizontalPlatform];
        platforms.forEach(platform => {
            if(this.collide(platform)) {
                this.action();
                const index = this.game.boosts.indexOf(this);
                this.game.boosts.splice(index, 1);
            }
        });
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x + Boost.RADIUS, this.y + Boost.RADIUS, Boost.RADIUS, 0, 2*Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.font = "13px Comic Sans MS";
        ctx.fillStyle = "black";
        ctx.fillText(this.name, this.x + Boost.RADIUS*2 + 5, this.y+15);
    }

    action() {}
}


class StickBoost extends Boost {

    static COLOR = 'pink';

    constructor(game, x, y) {
        super(game, x, y, StickBoost.COLOR, 'Sticky');
    }

    action() {
        this.game.pendingStick += 1;
    }
}

class BallBoost extends Boost {

    static COLOR = 'aqua';

    constructor(game, x, y) {
        super(game, x, y, BallBoost.COLOR, 'Ball');
    }

    action() {
        this.game.balls.push(new Ball(this.game, 200, 200, 150, Math.PI/3));
    }
}

class SpeedBoost extends Boost {

    static COLOR = 'red';
    static FACTOR = 2;

    constructor(game, x, y) {
        super(game, x, y, SpeedBoost.COLOR, 'Speed');
    }

    action() {
        let index = Math.floor(Math.random() * this.game.balls.length);
        let ball = this.game.balls[index];
        ball.vx *= SpeedBoost.FACTOR;
        ball.vy *= SpeedBoost.FACTOR;
        ball.speed = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
    }
}


class Game {

    constructor() {
        this.screen = new Screen(800, 500);
        this.keyboard = new Keyboard();
        this.ranking = new Ranking();
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
        this.boosts.forEach(boost => boost.update(millis));
        this.horizontalPlatform.update(millis);
        if(this.verticalEnabled) this.verticalPlatform.update(millis);

        if(this.balls.length == 0) this.finishGame();
    }

    draw(ctx) {
        this.balls.forEach(ball => ball.draw(ctx));
        this.horizontalPlatform.draw(ctx);
        if(this.verticalEnabled) this.verticalPlatform.draw(ctx);
        this.blocks.forEach(block => block.draw(ctx));
        this.boosts.forEach(boost => boost.draw(ctx));
        this.drawScore(ctx);
        this.drawTime(ctx);
    }

    drawScore(ctx) {
        ctx.font = "20px Comic Sans MS";
        ctx.fillStyle = "red";
        ctx.fillText("Score: " + this.score, 10, 25);
    }

    drawTime(ctx) {
        const elapsedSeconds = this.getTime() / 1000;
        const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
        const seconds = String(Math.floor(elapsedSeconds % 60)).padStart(2, '0');
        const text = "Time: " + minutes + ":" + seconds;
        ctx.font = "20px Comic Sans MS";
        ctx.fillStyle = "red";
        ctx.fillText(text, this.screen.width-120, 25);
    }

    getTime() {
        return this.gameTime + new Date().getTime() - this.startTime.getTime();
    }

    start(millis) {
        this.interval = setInterval(this.loop.bind(this, millis), millis);
        this.setPauseButtonText("Pause");
        this.paused = false;
        this.ranking.clearTable();
        this.startTime = new Date();
    }

    stop() {
        this.gameTime += new Date().getTime() - this.startTime.getTime();
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
        this.boosts = [];
        this.score = 0;
        this.pendingStick = 0;
        this.verticalPlatform = new Platform(this, 20, 300, "vertical", "ArrowDown", "ArrowUp")
        this.horizontalPlatform = new Platform(this, 400, 480, "horizontal", "ArrowLeft", "ArrowRight")
        this.startTime = new Date();
        this.gameTime = 0;
    }

    initLevel() {
        this.reset();
        this.balls.push(new Ball(this, 200, 200, 150, Math.PI/3));
        this.addBlocks();
    }

    finishGame() {
        const record = {
            nick: this.getNick(),
            date: new Date(),
            score: this.score,
            time: Math.floor(this.getTime() / 1000),
        }
        this.ranking.addRecord(record);
        this.initLevel();
    }

    getNick() {
        var nick = document.getElementById("nick-field").value;
        if(nick.length == 0) nick="You";
        return nick;
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
        block.hit();
        const index = this.blocks.indexOf(block);
        this.blocks.splice(index, 1);
        this.score += block.points;
    }
}
