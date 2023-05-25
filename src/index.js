


function setDivWidthHeight(object, width, height) {
    object.style.width = width.toString() + 'px';
    object.style.height = height.toString() + 'px';
}

/**
 * 
 * @param {any} object 
 * @param {Vector} dimensions 
 */
function setDivHeightWidthV(object, dimensions) {
    object.style.height = dimensions.row.toString() + 'px';
    object.style.width = dimensions.col.toString() + 'px';
}

/**
 * change the location by the top left of the div. 
 * 
 * @param {any} object 
 * @param {Vector} coordinates 
 */
function setDivTopLeft(object, coordinates) {
    object.style.top = coordinates.row.toString() + 'px';
    object.style.left = coordinates.col.toString() + 'px';
}

/**
 * checks if a tile is in bounds
 * @param {Vector} tile 
 * @param {World} world
 */
function inBounds(tile, world) {
    if (tile.row < 0 || tile.col < 0) return false;
    if (tile.row >= world.numRows || tile.col >= world.numCols) return false;
    return true;
}

let global = {};
global.player = 'human';
global.numRows = 15;
global.numCols = 20;
global.tileSize = 30;
global.width = global.numCols * global.tileSize;
global.height = global.numRows * global.tileSize;

window.onload = function() {
    let root = document.body;
    let topContainer = root.getElementsByClassName('topContainer')[0];
    let bottomContainer = root.getElementsByClassName('bottomContainer')[0];
    topContainer.style.width = `${global.width}px`;
    bottomContainer.style.width = `${global.width}px`;

    let world = new World(global.numRows, global.numCols, global.tileSize, '');
    root.insertBefore(world.canvas, bottomContainer);

    // controllers

    let toggleButton = new ToggleButtonController(() => {
        if (!world.player) return false;
        world.tileSelector.sprite.style.display = 'block';
        global.player = 'pathFinder'
        return true;
    }, 
    ()=>{
        if (world.tileSelector.doingMoves) return false;
        global.player = 'human'
        world.tileSelector.sprite.style.display = 'none';
        return true;
    });

    let tilePlacerController = new TilePlacerController(world)
    world.canvas.append(tilePlacerController.sprite)
}



class World {
    /**
     * @param {int} numRows number of rows
     * @param {int} numCols number of columns
     * @param {int} tileSize tile size for css display
     * @param {string[]} mapText array of lines representing the map
     */
    constructor(numRows, numCols, tileSize, mapText) {
        // general constants
        this.numRows = numRows;
        this.numCols = numCols;
        this.tileSize = tileSize;
        
        // for code
        this.board; // 2d array of symbols
        this.player = null;
        this.startCoords = null;
        
        // for html
        this.screenHeight = numRows * tileSize;
        this.screenWidth = numCols * tileSize;
        this.elements; // 2D array of HTML elements for drawing

        // create the canvas
        this.canvas = document.createElement('div'); // HTML element for background
        this.canvas.classList.add('canvas');
        setDivWidthHeight(this.canvas, this.screenWidth, this.screenHeight);

        // create the tile layer
        this.tileLayer = document.createElement('div'); // layer of tiles
        this.tileLayer.classList.add('layer');

        // initialise tile layer and place it on the board
        this.initialiseBoard();
        this.placeTiles(mapText)
        this.canvas.append(this.tileLayer);

        // add the tileSelector which shows itself when pathFinder mode is on
        this.tileSelector = new TileSelector(this);
        this.tileSelector.sprite.style.display = 'none';
        this.canvas.append(this.tileSelector.sprite);

    }

    /**
     * 
     * @param {Player} newPlayer pass in reference to player object
     */
    setPlayer(newPlayer) {
        if (this.player) {
            this.canvas.removeChild(this.player.sprite);
        }

        this.player = newPlayer;
        this.tileSelector.player = newPlayer;
        this.canvas.append(newPlayer.sprite);
    }

    /**
     * 
     * @param {Vector} startCoords respawn point of player
     */
    setStartCoords(startCoords) {
        this.startCoords = startCoords;
    }

    placeTiles(mapText) {
        for (let i = 0; i < this.numRows; i++) {
            let line = mapText[i];
            for (let j = 0; j < this.numCols; j++ ) {
                if (i >= mapText.length || j >= line.length) {
                    this.setBoardCell(new Vector(i, j), '-');
                    continue;
                }
                this.setBoardCell(new Vector(i, j), line[j]);
            }
        }
    }

    printBoard() {
        for (let r = 0; r < this.numRows; r++) {
            for (let c = 0; c < this.numCols; c++) {
                process.stdout.write(this.board[r][c].type)
            }
            process.stdout.write('\n')
        }
    }

    /**
     * Initialise the board and variables
     */
    initialiseBoard() {
        this.board = [];
        this.elements = [];
        for (let r = 0; r < this.numRows; r++) {
            let boardRow = [];
            let elementsRow = [];
            for (let c = 0; c < this.numCols; c++) {
                boardRow.push('-');
                elementsRow.push(null);
            }
            this.board.push(boardRow);
            this.elements.push(elementsRow);
        }
    }

    /**
     * 
     * @param {Vector} position of new tile element
     * @param {string} type solidTile or weakTile
     * @returns tile element
     */
    newTileDiv(position, type) {
        let row = position.row;
        let col = position.col;
        let tile = document.createElement("div");
        tile.id = row.toString() + '-' + col.toString();
        tile.classList.add("tile", type);
        setDivWidthHeight(tile, this.tileSize, this.tileSize);
        tile.style.top = (row * this.tileSize).toString() + 'px';
        tile.style.left = (col * this.tileSize).toString() + 'px';
        return tile;
    }

    /**
     * 
     * @param {Vector} position position of the cell being set
     * @param {string} type
     */
    setBoardCell(position, type) {
        //remove existing item on the canvas
        let row = position.row;
        let col = position.col;
        if (this.elements[row][col]) {
            this.tileLayer.removeChild(this.elements[row][col]);
        }
    
        let tile;
        switch (type) {
            case '-':
                this.elements[row][col] = null;
                break;
            case '#':
                tile = this.newTileDiv(position, 'solidTile');
                this.elements[row][col] = tile;
                this.tileLayer.appendChild(tile);
                break;
            case 'B':
                tile = this.newTileDiv(position, 'weakTile');
                this.elements[row][col] = tile;
                this.tileLayer.appendChild(tile);
                break;
            default:
        }

        this.board[row][col] = type;
        return true;
    }
}


class Vector {
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }

    /**
     * 
     * @param {Vector} v1 
     * @param {Vector} v2 
     * @returns 
     */
    static dot(v1, v2) {
        return v1.row * v2.row + v1.col * v2.col;
    }

    /**
     * 
     * @param {Vector} v1 
     * @param {Vector} v2 
     * @returns 
     */
    static add(v1, v2) {
        return new Vector(v1.row + v2.row, v1.col + v2.col);
    }

    /**
     * 
     * @param {Vector} v1 
     * @param {Vector} v2 
     * @returns 
     */
    static sub(v1, v2) {
        return new Vector(v1.row - v2.row, v1.col - v2.col);
    }

    /**
     * 
     * @param {int} alpha 
     * @param {Vector} v 
     * @returns 
     */
    static sMult(alpha, v) {
        return new Vector(alpha * v.row, alpha * v.col);
    }

    /**
     * 
     * @param {Vector[]} vectorList 
     */
    static minRow(vectorList) {
        let min = 69420;
        for (let v of vectorList) {
            if (v.row < min) {
                min = v.row;
            }
        }
        return min;
    }

    /**
     * 
     * @param {Vector[]} vectorList 
     */
    static minCol(vectorList) {
        let min = 69420;
        for (let v of vectorList) {
            if (v.col < min) {
                min = v.col;
            }
        }
        return min;
    }

    /**
     * 
     * @param {Vector[]} vectorList 
     */
    static maxRow(vectorList) {
        let max = -1;
        for (let v of vectorList) {
            if (v.row > max) {
                max = v.row;
            }
        }
        return max;
    }

    /**
     * 
     * @param {Vector[]} vectorList 
     */
    static maxCol(vectorList) {
        let max = -1;
        for (let v of vectorList) {
            if (v.col > max) {
                max = v.col;
            }
        }
        return max;
    }

    /**
     * 
     * @param {Vector} v1 
     * @param {Vector} v2 
     * @returns 
     */
    static equals(v1, v2) {
        if (v1.row == v2.row && v1.col == v2.col) {
            return true;
        } 
        return false;
    }

}

class Player {
    /**
     * 
     * @param {World} world 
     */
    constructor(world) {
        // for javascript
        this.topLeftPos = new Vector(world.startCoords.row, world.startCoords.col);
        this.occupiedTiles = [new Vector(world.startCoords.row, world.startCoords.col)];
        this.animating = false;
        this.dimensions = new Vector(1, 1);
        this.world = world;

        // for html display
        this.sprite = document.createElement('div');
        this.sprite.classList.add('player');
        this.spriteTopLeft = Vector.sMult(world.tileSize, world.startCoords);
        this.spriteDimensions = Vector.sMult(world.tileSize, this.dimensions);
        setDivTopLeft(this.sprite, this.spriteTopLeft);
        setDivHeightWidthV(this.sprite, this.spriteDimensions);

        // to process movement
        window.addEventListener('keydown', (e) => this.processPlayerMove(e, this.world, this))
    }


    static getNewTiles(occupiedTiles, direction) {
        let newTiles = [];
        if (occupiedTiles.length == 1) {
            newTiles.push(Vector.add(occupiedTiles[0], direction));
            newTiles.push(Vector.add(occupiedTiles[0], Vector.sMult(2, direction)));
        } else {

            let v = Vector.sub(occupiedTiles[1], occupiedTiles[0]);
            if (Vector.dot(direction, v) < 0) {
                newTiles.push(Vector.add(occupiedTiles[0], direction));
            } else if (Vector.dot(direction, v) > 0) {
                newTiles.push(Vector.add(occupiedTiles[1], direction));
            } else {
                newTiles.push(Vector.add(occupiedTiles[0], direction));
                newTiles.push(Vector.add(occupiedTiles[1], direction));
            }
        }
        return newTiles;
    }

    /**
     * changes the position of the player in the code. Sends a call to animate this change
     * 
     * @param {World} world 
     * @param {Vector} direction 
     */
    move(world, direction) {
        return new Promise(async (resolve) => {
            if (this.animating) return;
            let newTiles = Player.getNewTiles(this.occupiedTiles, direction);
            // change code coordinates
            this.occupiedTiles = newTiles;
            this.topLeftPos = new Vector(Vector.minRow(this.occupiedTiles), Vector.minCol(this.occupiedTiles));
            let bottomRightPos = new Vector(Vector.maxRow(this.occupiedTiles), Vector.maxCol(this.occupiedTiles));
            bottomRightPos = Vector.add(bottomRightPos, new Vector(1, 1));
            this.dimensions = Vector.sub(bottomRightPos, this.topLeftPos);
    
            let dead =  !Player.validPos(world, this.occupiedTiles);
            await this.animateMove(world, direction, dead);
            resolve();
        })
    }

    /**
     * Procedure to animate the move after a change to the position has been made
     * @param {World} world 
     * @param {Vector} direction direction of movement
     */
    animateMove(world, direction, death) {
        return new Promise((resolve) => {
            this.animating = true;
            let spriteNewTopLeft = Vector.sMult(world.tileSize, this.topLeftPos);
            let spriteNewDimensions = Vector.sMult(world.tileSize, this.dimensions);
            let scaleX, scaleY;
            scaleX = (spriteNewDimensions.col / this.spriteDimensions.col)
            scaleY = (spriteNewDimensions.row / this.spriteDimensions.row)
    
    
            // let trans = Vector.sub(spriteNewTopLeft, this.spriteTopLeft);
            // let transX = trans.col;
            // let transY = trans.row;
    
            let tOrigin, t;
            if (Vector.equals(direction, new Vector(1, 0))) {
                tOrigin = 'bottom'
                t = `scaleY(${-scaleY})`
            } else if (Vector.equals(direction, new Vector(-1, 0))) {
                tOrigin = 'top'
                t = `scaleY(${-scaleY})`
            } else if (Vector.equals(direction, new Vector(0, 1))) {
                tOrigin = 'right'
                t = `scaleX(${-scaleX})`
            } else if (Vector.equals(direction, new Vector(0, -1))) {
                tOrigin = 'left'
                t = `scaleX(${-scaleX})`
            }
    
            let animationDuration;
            if (death) {
                animationDuration = 300;
            } else {
                animationDuration = 300;
            }
    
            let settings = {
                duration: animationDuration,
                easing: "linear",
                iterations: 1
            }
    
            let finalColor = 'blueviolet';
            if (death) {
                finalColor = 'red'
            }
    
            let keyFrames = [
                { transformOrigin: tOrigin},
                { transform: t, transformOrigin: tOrigin, backgroundColor: finalColor}
    
            ]

            let animation = this.sprite.animate(keyFrames, settings);
            if (death) {
                animation.addEventListener('finish', () => {
                    this.topLeftPos = new Vector(world.startCoords.row, world.startCoords.col);
                    this.occupiedTiles = [new Vector(world.startCoords.row, world.startCoords.col)];
                    this.dimensions = new Vector(1, 1);
                    this.animating = false;
                    this.spriteTopLeft = Vector.sMult(world.tileSize, world.startCoords);
                    this.spriteDimensions = Vector.sMult(world.tileSize, this.dimensions);
                    setDivTopLeft(this.sprite, this.spriteTopLeft);
                    setDivHeightWidthV(this.sprite, this.spriteDimensions);
                    resolve();
                }) 
            } else {
                animation.addEventListener('finish', () => {
                    this.animating = false;
                    setDivTopLeft(this.sprite, spriteNewTopLeft);
                    setDivHeightWidthV(this.sprite, spriteNewDimensions);
                    this.spriteDimensions = spriteNewDimensions;
                    this.spriteTopLeft = spriteNewTopLeft;
                    resolve();
                }) 
            }
        })

    }

    processPlayerMove(event, world, player) {
        if (global.player != 'human') return;
        if (event.key == 'w') {
            player.move(world, new Vector(-1, 0));
        } else if (event.key == 'a') {
            player.move(world, new Vector(0, -1));
        } else if (event.key == 's') {
            player.move(world, new Vector(1, 0));
        } else if (event.key == 'd') {
            player.move(world, new Vector(0, 1));
        }
    }

    /**
     * check whether tiles occupied by player are valid
     * @param {World} world 
     * @param {Vector[]} occupiedTiles
     * @returns boolean
     */
    static validPos(world, occupiedTiles) {
        for (let tile of occupiedTiles) {
            if (!inBounds(tile, world)) return false;
        }
        if (occupiedTiles.length == 1) {
            if (world.board[occupiedTiles[0].row][occupiedTiles[0].col] != '#') {
                return false;
            }
        }

        for (let v of occupiedTiles) {
            if (world.board[v.row][v.col] == '-') {
                return false;
            }
        }
        return true;
    }
}

class ToggleButtonController {
    /**
     * 
     * @param {Function} offToOn 
     * @param {Function} onToOff 
     */
    constructor(offToOn, onToOff) {
        this.offToOn = offToOn;
        this.onToOff = onToOff;

        this.outline = document.querySelector(".toggleButton .outline");
        this.center = document.querySelector(".toggleButton .outline .center");

        this.outline.addEventListener('click', () => this.flip());
        
    }

    flip() {
        
        if (this.center.classList.contains('on')) {
            if (this.onToOff()) {
                // call the function and see if it returns true
                this.center.classList.remove('on');
            }
        } else {
            if (this.offToOn()) {
                this.center.classList.add('on');
            }
        }
    }
}

class TileSelector {

    /**
     * 
     * @param {World} world 
     */
    constructor(world) {
        this.doingMoves = false;
        this.onTile = false;
        this.sprite = document.createElement('div');
        this.sprite.classList.add('tileSelector');
        setDivHeightWidthV(this.sprite, new Vector(world.tileSize, world.tileSize));
        this.destTile;
        this.player = world.player;
        this.world = world;

        this.world.canvas.addEventListener('mousemove', (event) => {
            if (global.player != 'pathFinder') return;
            if (this.doingMoves) return;
            let rect = this.world.canvas.getBoundingClientRect();
            let mouseCoords = new Vector(event.clientY - rect.top, event.clientX - rect.left);
            let mouseCoordsSnapped = this.snapCoordsToGrid(mouseCoords, this.world.tileSize);
            setDivTopLeft(this.sprite, mouseCoordsSnapped);
            this.destTile = new Vector(parseInt(mouseCoordsSnapped.row / this.world.tileSize), parseInt(mouseCoordsSnapped.col / this.world.tileSize));
            
            if (!inBounds(this.destTile, this.world)) {
                this.sprite.style.display = 'none';
                return;
            } else {
                this.sprite.style.display = 'block';
            }

            if (this.world.board[this.destTile.row][this.destTile.col] == '#') {
                if (this.sprite.classList.contains('invalid')) {
                    this.sprite.classList.remove('invalid');
                }
                this.onTile = true;
            } else {
                this.sprite.classList.add('invalid');
                this.onTile = false;
            }
        })

        this.world.canvas.addEventListener('click', () => {
            if (global.player != 'pathFinder') return;
            if (!this.onTile) return;
            if (this.doingMoves) return;

            this.doingMoves = true;
            this.sprite.classList.add('placed');

            let start = this.convertToNode(this.player.occupiedTiles);
            let dest = this.convertToNode([new Vector(this.destTile.row, this.destTile.col)]); 
            this.performMoves(start, dest);
        })
    }

    /**
     * 
     * @param {Vector[]} tileList 
     */
    convertToNode(tileList) {
        return `${Vector.minRow(tileList)} ${Vector.minCol(tileList)} ${Vector.maxRow(tileList)} ${Vector.maxCol(tileList)}` 
    }

    snapCoordsToGrid(coords, tileSize) {
        return new Vector(parseInt(coords.row / tileSize) * tileSize, parseInt(coords.col / tileSize) * tileSize);
    }

    async performMoves(start, dest) {
        let moves = this.getMoves(this.world, start, dest);
        for (let move of moves) {
            await this.player.move(this.world, move);
            if (Vector.equals(move, new Vector(1, 0))) {
                console.log('down');
            } else if (Vector.equals(move, new Vector(-1, 0))) {
                console.log('up')
            } else if (Vector.equals(move, new Vector(0, 1))) {
                console.log('right')
            } else if (Vector.equals(move, new Vector(0, -1))) {
                console.log('left')
            }
        }
        console.log('--');
        this.doingMoves = false;
        this.sprite.classList.remove('placed');
    }

    /**
     * start and dest are strings representing the nodes
     * @param {World} world 
     * @param {string} start 
     * @param {string} dest 
     */
    getMoves(world, start, dest) {
        let q = []; // queue containing nodes
        let prevData = {}; //stores predecessor as well as move from predecessor to itself

        q.push(start);
        prevData[start] = {prevNode: null, move: null};

        while(q.length != 0) {
            let node = q.shift(); // node is string
            let possibleMoves = this.getPossibleMoves(node);
            // possibleMoves is array eg. [{direction: (1,0), destNode: (1,1)}]
            // direction is from CURRENT NODE to NEW NODE (not other way)

            for (let move of possibleMoves) {
                if (prevData[move.destNode]) {
                    continue;
                }
                q.push(move.destNode);
                prevData[move.destNode] = {prevNode: node, move: move.direction};
            }
        }
        
        let moves = [];
        let node = dest;
        while (prevData[node] && prevData[node].prevNode) {
            
            moves.push(prevData[node].move);
            node = prevData[node].prevNode;
        }

        moves = moves.reverse();
        return moves;
    }

    /**
     * 
     * @param {string} node string representing a certain position
     * @param {World} world
     * @returns a tuple containing the items {direction, destNode}
     */
    getPossibleMoves(node) {
        let data = (node.match(/\d+/g)).map(Number);
        let occupiedTiles = [new Vector(data[0], data[1]), new Vector(data[2], data[3])];
        if (Vector.equals(occupiedTiles[0], occupiedTiles[1])) {
            occupiedTiles.pop()
        }
        let moves = [];
        let directions = [new Vector(1, 0), new Vector(-1, 0), new Vector(0, 1), new Vector(0, -1)];
        for (let direction of directions) {
            let newTiles = Player.getNewTiles(occupiedTiles, direction);
            if (Player.validPos(this.world, newTiles)) {
                moves.push({direction: new Vector(direction.row, direction.col), destNode: this.convertToNode(newTiles)});
            }
        }
        return moves;

    }
}

class TilePlacerController {
    constructor(world) {
        this.world = world;

        this.outline = document.querySelector(".blockSelect");
        this.icons = Array.from(this.outline.querySelectorAll('div'));
        this.idToName = ['solidTile', 'weakTile', 'erase', 'playerTile'];
        this.allowChange = true;

        // change tile by keydown
        window.addEventListener('keydown', (event) => {
            if (global.player != 'human') return;
            if (!this.allowChange) return;
            // if player already placed but still attempts to select player tile
            if (event.key == this.icons.length.toString() && this.playerPlaced) return;

            for (let i = 0; i < this.icons.length; i++) {
                if (event.key == (i + 1).toString()) {
                    this.highlight(i);
                    break;
                }
            }
        })

        // change tile by mouseclick
        for (let i = 0; i < this.icons.length; i++) {
            this.icons[i].addEventListener('click', () => {
                if (global.player != 'human') return;
                if (!this.allowChange) return;
                this.highlight(i)
            });
        }

        this.sprite = document.createElement('div');
        setDivHeightWidthV(this.sprite, new Vector(this.world.tileSize, this.world.tileSize));
        this.sprite.style.opacity = '50%';
        this.sprite.style.position = 'absolute';
        this.sprite.style.border = '1px solid black';
        this.sprite.addEventListener('dragstart', function(event) {
            event.preventDefault();
          });

        this.highlight(0);

        this.destTile;
        window.addEventListener('mousemove', (event) => {
            if (global.player != 'human') return;
            let rect = this.world.canvas.getBoundingClientRect();
            let mouseCoords = new Vector(event.clientY - rect.top, event.clientX - rect.left);
            let mouseCoordsSnapped = this.snapCoordsToGrid(mouseCoords, this.world.tileSize);
            this.destTile = new Vector(parseInt(mouseCoordsSnapped.row / this.world.tileSize), parseInt(mouseCoordsSnapped.col / this.world.tileSize));
            if (!inBounds(this.destTile, this.world)) {
                this.sprite.style.display = 'none';
            } else {
                this.sprite.style.display = 'block';
                setDivTopLeft(this.sprite, mouseCoordsSnapped);
            }
        })

        this.mouseDown = false;
        window.addEventListener('mousedown', () => {
            if (global.player != 'human') return;
            this.allowChange = false;
            this.mouseDown = true;
        })

        window.addEventListener('mouseup', () => {
            if (global.player != 'human') return;
            this.allowChange = true;
            this.mouseDown = false;
        })

        setInterval(() => {
            if (global.player != 'human') return;
            if (!this.destTile) return;
            if (!inBounds(this.destTile, this.world)) return;
            if (this.world.player && this.world.player.animating) return;
            if (this.mouseDown) {
                if (this.currentIcon == 'solidTile') {
                    this.world.setBoardCell(this.destTile, '#');
                } else if (this.currentIcon == 'weakTile') {
                    this.world.setBoardCell(this.destTile, 'B');
                } else if (this.currentIcon == 'erase') {
                    this.world.setBoardCell(this.destTile, '-');
                }
            }
        }, 10);

        setInterval(() => {
            if (!this.world.player) return;
            if (this.world.player.animating) return;
            if (!Player.validPos(this.world, this.world.player.occupiedTiles)) {
                // we have deleted one of the tiles the player is on
                this.world.canvas.removeChild(this.world.player.sprite);
                this.world.player = null;
                this.playerPlaced = false;

                // bring back the icon
                this.icons[this.icons.length - 1].style.display = 'block';
            }
        }, 10)

        // check for placement of player
        this.playerPlaced = false;
        this.world.canvas.addEventListener('click', () => {
            if (global.player != 'human') return;
            if (!this.destTile) return;
            if (!inBounds(this.destTile, this.world)) return;
            if (this.playerPlaced) return;
            if (this.currentIcon != 'playerTile') return;

            this.world.setStartCoords(this.destTile);
            let player = new Player(this.world);
            this.world.setPlayer(player);
            
            this.playerPlaced = true;
            // change selection to default tile
            this.highlight(0);
            // hide the player tile
            this.icons[this.icons.length - 1].style.display = 'none';
        })
    }

    highlight(id) {
        this.resetHighlights();
        this.currentIcon = this.idToName[id];
        this.sprite.classList.add(this.currentIcon);
        this.icons[id].classList.add('highlight');

    }

    resetHighlights() {
        this.sprite.classList = [];
        for (let icon of this.icons) {
            icon.classList.remove("highlight");
        }
    }

    snapCoordsToGrid(coords, tileSize) {
        return new Vector(parseInt(coords.row / tileSize) * tileSize, parseInt(coords.col / tileSize) * tileSize);
    }
}