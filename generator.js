paper.install(window);

const colors = [
    ['black', '#240038', '#440069', '#670295', '#B239FF'],
    ['black', '#12002F', '#2A005E', '#41008B', '#6800E7'],
    ['black', '#002A3A', '#025D84', '#0076A9', '#05B9EC']
];
const pixelSize = 85;
let currentColor = 0;
let pixels;
let overlay;
let textContent = 'rc3';
let dragging = false;

window.onload = function() {
	paper.setup('paperCanvas');

    //Helper Box on bottom left
    let helpButton = document.getElementById("helpbutton");
    let helpContent = document.getElementById("helpcontent");
    helpButton.onclick = function(){
        console.log('jo');
        helpContent.style.visibility= helpContent.style.visibility == 'visible' ? 'hidden' : 'visible';
        helpButton.innerHTML = helpButton.innerHTML == '?' ? 'Ok, thanks' : '?';
    }

    //generation process
    generatePixels();
    generateOverlay();
    setText("rc3");

    view.onClick = function(event){
        generatePixels();
    }
    view.onMouseUp = function(event){
        dragging = false;
    }
}

//Set one of 3 colors via radio buttons
function setColor(colNr){
    currentColor = colNr;

    pixels.children.forEach(pixel => {
        pixel.tweenTo({ fillColor: colors[currentColor][pixel.colStep]}, { duration:  _.random(200, 1000)});
    });
}

//generate text
function setText(text){
    opentype.load("Orbitron-Bold.ttf", function(err, font) {

        if (err) {
            console.log(err.toString());
            return;
        }

        //remove old text if it exists
        if(overlay.children[1]){
            overlay.children[1].remove();
            overlay.removeChildren(1);
        }

        //prepare text input
        textContent = text;
        text = text.substr(0,16).toUpperCase();
        text = text.split('').reverse().join('');

        //iterate through letters and set in grid
        let allLetters = new Group();
        for(let i = 0; i<text.length; i++){
            let fontPath = font.getPath(text[i],0,0,150);
            let paperPath = paper.project.importSVG(fontPath.toSVG());
            paperPath.fillColor = 'white';
            paperPath.strokeColor = null;
            paperPath.bounds.bottomCenter = new Point(300+ (4-(i%4))*120, 300+ (4-Math.floor(i/4))*120 );
            if(i>=4){

                //special case for umlauts
                let letterBelow = allLetters.children[i-4];
                if(letterBelow._class == "CompoundPath" && letterBelow.intersects(paperPath)){
                    letterBelow.children
                        .filter(path => path.position.y - letterBelow.bounds.topLeft.y < 25)
                        .forEach(path => path.scale(1.2));
                    let tmp = paperPath.subtract(letterBelow);
                    tmp.fillColor = 'white';
                    paperPath.remove();
                    paperPath = tmp;
                    letterBelow.children
                        .filter(path => path.position.y - letterBelow.bounds.topLeft.y < 25)
                        .forEach(path => path.remove());
                }
            }
            allLetters.addChild(paperPath);

        }

        allLetters.bounds.bottomRight = overlay.firstChild.bounds.bottomRight.subtract([25,25]);
        overlay.addChild(allLetters);
    });

}

//generate white box
function generateOverlay(){
    if(overlay){
        overlay.removeChildren();
    }
    overlay = new Group();

    let lineRect = new Path.Rectangle([203, 203], [pixelSize*7, pixelSize*7]);
    lineRect.strokeWidth = 6;
    lineRect.strokeColor = 'white';
    overlay.addChild(lineRect);

    overlay.position = project.view.bounds.center.add([-pixelSize/2, -pixelSize/2]);

    overlay.onClick = function(event) {
        event.stop();
    }

    overlay.onMouseDrag = function(event) {
        overlay.position.x += event.delta.x;
        overlay.position.x = clampValue(overlay.position.x, project.view.bounds.center.x-pixelSize/4, project.view.bounds.center.x+pixelSize/4);
        overlay.position.y += event.delta.y;
        overlay.position.y = clampValue(overlay.position.y, project.view.bounds.center.y-pixelSize/4, project.view.bounds.center.y+pixelSize/4);

        pixels.position.x -= event.delta.x / 2;
        pixels.position.x = clampValue(pixels.position.x, project.view.bounds.center.x-pixelSize/4, project.view.bounds.center.x+pixelSize/4);
        pixels.position.y -= event.delta.y / 2;
        pixels.position.y = clampValue(pixels.position.y, project.view.bounds.center.y-pixelSize/4, project.view.bounds.center.y+pixelSize/4);

        event.stop();
        dragging = true;
    }

}

//generate pixel grid using simplex noise
function generatePixels(){
    let oldPixelPos = null;
    if(pixels){
        oldPixelPos = pixels.position;
        pixels.removeChildren();
    }
    pixels = new Group();

    let simplex = new SimplexNoise();
    let values = [];

    for(let x = 0; x<7; x++){
        for(let y = 0; y<7; y++){
            values.push(simplex.noise2D(x/10, y/10));
        }
    }

    //scale noise to complete range
    let min = _.min( values ),
        max = _.max( values );

    let strechedValues = values.map( value => translateValue(value, min, max, -1, 1));
    strechedValues = strechedValues.map( val => val<0 ? 0 : Math.ceil(val / 0.25) )

    strechedValues.forEach(function(val, idx){
        let x = idx % 7;
        let y = Math.floor(idx / 7);
        let rect = new Path.Rectangle([pixelSize*x+203, pixelSize*y+203], [pixelSize, pixelSize]);
        rect.fillColor = colors[currentColor][val];
        rect.applyMatrix= false;
        rect.scaling = 1.01;
        rect.colStep = val;
        rect.strokeWidth = 3;
        rect.strokeCap = 'round';
        rect.dashArray = [4, 10];
        rect.tweenFrom({ scaling: 0.0001 }, { duration:  _.random(0, 203) + val*203});
        rect.onClick = function(event) {
            event.stop();
            this.colStep = (this.colStep+1) % 5;
            this.tweenTo({ fillColor: colors[currentColor][this.colStep] }, { duration:  _.random(0, 203) });
        }
        rect.onMouseEnter = function(event){
            if(!dragging){
                this.strokeColor = 'lightgrey';
                this.bringToFront();
            }

        }
        rect.onMouseLeave = function(event){
            this.strokeColor = undefined;
        }
        pixels.addChild(rect);

    });

    pixels.position = project.view.bounds.center;
    if(oldPixelPos){
        pixels.position = oldPixelPos;
    }
    pixels.sendToBack();
}

function clampValue(value, min, max){
    return Math.max(Math.min(value, max), min);
}

function translateValue(value, leftMin, leftMax, rightMin, rightMax){
    leftSpan = leftMax - leftMin;
    rightSpan = rightMax - rightMin;

    return rightMin + ( (value - leftMin) / (leftSpan) * rightSpan);
}

function removeBlackPixels(){
    pixels.children
        .filter(pixel => pixel.colStep == 0)
        .forEach(pixel => pixel.fillColor = null);
}

function restoreBlackPixels(){
    pixels.children
        .filter(pixel => pixel.fillColor == null)
        .forEach(pixel => pixel.fillColor = 'black');
}

//let user download canvas content as SVG
function downloadSVG(){
    removeBlackPixels();
    project.view.update();
    var svg = project.exportSVG({ asString: true, bounds: 'content' });
    var svgBlob = new Blob([svg], {type:"image/svg+xml;charset=utf-8"});
    var svgUrl = URL.createObjectURL(svgBlob);
    var downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = textContent+".svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    restoreBlackPixels();
}

//let user download canvas content as PNG
function downloadPNG(){
    removeBlackPixels();
    project.view.update();
    var canvas = document.getElementById("paperCanvas");
    var downloadLink = document.createElement("a");
    downloadLink.href = canvas.toDataURL("image/png;base64");
    downloadLink.download = textContent+'.png';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    restoreBlackPixels();
}
