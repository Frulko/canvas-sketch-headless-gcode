const canvasSketch = require('canvas-sketch');
const { pathsToSVG, renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const math = require('canvas-sketch-util/math');
const {vec2} = require('gl-matrix')
const fs = require('fs');

class Agent {
    constructor(props) {
        this.width = props.width;
        this.height = props.height;
        this.context = props.context;
        this.posX = props.x;
        this.posY = props.y;
        this.p = vec2.fromValues(this.posX,this.posY);
        this.p01d = vec2.fromValues(this.p[0],this.p[1]);
        this.isOutside = false;

        this.alpha = 0;
        this.angle = 0;
    }

    update(step) {

        this.angle = Random.noise2D(this.p[0]/noiseScale, this.p[1]/noiseScale) * noiseStrength;
        this.p[0] += Math.cos(this.angle) * Math.cos(this.angle);
        this.p[1] += Math.sin(this.angle) * Math.sin(this.angle);


        if(this.p[0] < 1){
            this.isOutside = true;
        }else if(this.p[0] > this.width - 1){
            this.isOutside = true;
        }else if(this.p[1] < 1){
            this.isOutside = true;
        }else if(this.p[1] > this.height - 1){
            this.isOutside = true;
        }


        if(!this.isOutside){

            this.p01d = vec2.set(this.p01d, this.p[0], this.p[1]);
            particlesRef.push([this.p01d[0], this.p01d[1]]);

        } else {
          const p = Random.insideCircle(12);
          this.p[0] = Random.range(1, this.width-1);
          this.p[1] = Random.range(1, this.height - 1);
          this.p01d = vec2.set(this.p01d,this.p[0], this.p[1]);
        }

        this.isOutside = false;
    }
}

const GCodeFile = require('./GCodeFile');

const pWidth = 23;
const pHeight = 34;

let particles = [];
let particlesRef = [];
let circles = [];
const min = .1;
let max = 3;
const noiseScale = Random.range(100,5000.5);
const noiseStrength = Random.range(10,100.5);

// You can force a specific seed by replacing this with a string value
const defaultSeed = '';




const gCode = new GCodeFile({
    feedRate: 16000, // G1 movement (drawing speed)
    seekRate: 16000, // G0 movement (no drawing speed)
    onCommand: 'M03S90',
    offCommand: 'M5',
    powerDelay: 0.2,
    fileName: 'sketch',
    paperSize: [pWidth * 10, pHeight * 10], // A4 size in mm
    margin: 0, // or [10, 10] (top/bottom and left/right margin) or [10,10,10,10] (top/left/bottom/right)
    flipX: false,
    flipY: false
})


const sketch = (props) => {
  // Set a random seed so we can reproduce this print later
  Random.setSeed(Date.now());
  
  const { width, height, units } = props;
  gCode.updateCoordsArea(width, height);
  // Holds all our 'path' objects
  // which could be from createPath, or SVGPath string, or polylines
  const paths = [];
  particles = [];
  particlesRef = [];
  circles = [];

  for (let i = 0; i < 10; i++) {
      let x = 0;
      let y = 0;
      const p = Random.insideCircle(12);
      const c = new Agent({
          x: (width/2) + p[0],
          y: (height/2) + p[1],
          width: width,
          height: height
      });

      particles.push(c);
  }

  for (let i = 0; i < particles.length; i++) {
      for (let j = 0; j < 200; j++) {
          particles[i].update(j);
      }
  }


  for (let i = particlesRef.length-1; i > 1; i--) {
      // if (i%2 == 0) {
          const x0 = particlesRef[i-1][0]
          const y0 = particlesRef[i-1][1]

          const x = particlesRef[i][0]
          const y = particlesRef[i][1]

          const d = distance(x0, y0, x, y);

          let c = createCircle(x, y);

          let counter = 0;

          if (isValid(c)) {
              while (isValid(c, d)) {
                c.r+=.001;
              }

              // c.r -= 5;
              circles.push(c);
          }
      // }
  }

  for (let i = 0; i < circles.length; i++) {
      const x1 = circles[i].x;
      const y1 = circles[i].y;
      const radius = circles[i].r;

      let circle = [];
      let r = Random.rangeFloor(0, 2)
      let sides = 2;

      if (r > 0) {
        sides = 20
      }
      const startAngle = Random.range(0, 2 * Math.PI)
      for (let i = 0; i <= sides; i++) {
          const angle = math.mapRange(i, 0, sides, startAngle, 2 * Math.PI + startAngle);
          const x = x1 + Math.cos(angle) * radius
          const y = y1 + Math.sin(angle) * radius

          circle.push([x,y])
      }

      paths.push(circle)
  }
  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
  let lines = pathsToPolylines(paths, { units });
//   console.log('lines', lines);

  // Clip to bounds, using a margin in working units
  const margin = 0; // in working 'units' based on settings
  const box = [ margin, margin, width - margin, height - margin ];
  // lines = clipPolylinesToBox(lines, box);

  gCode.addPolylines(lines)


  return gCode.downloadFile();
};


module.exports = () => {
    return sketch({width: pWidth, height:pHeight,  units: 'cm', optimize: false});
} 

function createCircle(x, y) {
  return {
    x: x,
    y: y,
    r: min
  }
}


function distance (x1,y1, x2,y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;

    return Math.sqrt(dx * dx + dy * dy);
}

function isValid(c, d) {
    // max = .7;
  if (c.r > max) {
    return false;
  }

  for (let i = 0; i < circles.length; i++) {
    const c2 = circles[i];
    const dx = c2.x - c.x;
    const dy = c2.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < c2.r + c.r) {
      return false;
    }
  }

  return true;
}





