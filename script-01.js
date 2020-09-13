const canvasSketch = require('canvas-sketch');
const { pathsToSVG, renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const math = require('canvas-sketch-util/math');
const {vec2} = require('gl-matrix')
const fs = require('fs');


const GCodeFile = require('./GCodeFile');

const pWidth = 23;
const pHeight = 34;

let circlePos = [];

// You can force a specific seed by replacing this with a string value
const defaultSeed = '';

// Set a random seed so we can reproduce this print later
Random.setSeed(Date.now());


const gCode = new GCodeFile({
    feedRate: 16000, // G1 movement (drawing speed)
  seekRate: 32000, // G0 movement (no drawing speed)
    onCommand: 'M03S90',
    offCommand: 'M03S20',
    powerDelay: 0.2,
    fileName: 'sketch',
    paperSize: [pWidth * 10, pHeight * 10], // A4 size in mm
    margin: 0, // or [10, 10] (top/bottom and left/right margin) or [10,10,10,10] (top/left/bottom/right)
    flipX: false,
    flipY: false
})


const sketch = (props) => {

  const { width, height, units } = props;
  gCode.updateCoordsArea(width, height);
  // Holds all our 'path' objects
  // which could be from createPath, or SVGPath string, or polylines
  const paths = [];
  let circlePos = [];
      let positions = []

      for (let j = .5; j < height-.5; j+=.2) {
        let line = [];
        for (let i = .5; i < width-.5; i+=.1) {

            let x1 = i;
            let y1 = j;
            // const s = Math.pow(n, powScalar);
            const nx = x1 / (width/2);
            const ny = y1 / (height/2);
            let vecRef = vec2.fromValues(nx, ny);

            let n = cursive(vecRef);
            const s = math.mapRange(n, 0,1,-.6,.6);


            line.push([
                x1,
                y1 + s
            ]);

        }
        positions.push(line);
      }



      let finalePositions = [];
      let rotations = [-0.5, 0, 0.5]

      for (let k = 0; k < 3; k++) {
          let tmpPositions = [];
          for (let i = 0; i < positions.length; i++) {
              let tmpPosition = []
              for (let j = 0; j < positions[i].length; j++) {
                  let vectorShape = vec2.fromValues(positions[i][j][0], positions[i][j][1]);
                  let origin = vec2.fromValues(0, 0);
                  vectorShape = vec2.rotate(vectorShape, vectorShape, origin, radians(rotations[k]))

                  tmpPosition.push([vectorShape[0], vectorShape[1]])
              }

              tmpPositions.push(tmpPosition)
          }
          finalePositions.push(tmpPositions)
      }

    paths.push(finalePositions)
  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
  let lines = pathsToPolylines(paths, { units });
  console.log('lines', lines);

  // Clip to bounds, using a margin in working units
  const margin = 0; // in working 'units' based on settings
  const box = [ margin, margin, width - margin, height - margin ];
  // lines = clipPolylinesToBox(lines, box);

  gCode.addPolylines(lines)


  return gCode.downloadFile();
};

const svg = sketch({width: pWidth, height:pHeight,  units: 'cm', optimize: false});
fs.writeFile('./output.gcode', svg, (err) => {
    if (err) throw err;
    console.log('Data written to file');
});

//UTILS
function cursive(p) {

  const steps = 2;
  const sigma = 2.5;
  let gamma = Math.pow(1.0/sigma, steps);
  let displace = vec2.fromValues(0, 0);

  for (let i = 0; i < steps; i+=1) {
    let p1 = vec2.fromValues(p[0], p[1]);
    let p2 = vec2.fromValues(p[0], p[1]);

    let value1 = vec2.scaleAndAdd(displace, displace, p1, gamma)
    let value2 = vec2.scaleAndAdd(displace, displace, p2, gamma)


    let scalar = vec2.fromValues(normalnoise(value1), normalnoise(value2))
    displace = vec2.scale(displace, scalar, 1.5);
    gamma *= sigma;
  }

  const e = vec2.scaleAndAdd(displace, displace, p, gamma)
  return normalnoise(e);
}


function normalnoise(p) {
  return 0.5 + 0.5 * Random.noise2D(p[0], p[1]);
}

function radians(degrees)
{
  var pi = Math.PI;
  return degrees * (pi/180);
}
