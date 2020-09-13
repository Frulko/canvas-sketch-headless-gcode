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

  const { width, height, units } = props;
  gCode.updateCoordsArea(width, height);
  // Holds all our 'path' objects
  // which could be from createPath, or SVGPath string, or polylines
  const paths = [];
  let boxes = [];

  let prevHeight = 1;
  let prevWidth = 1;

  let numRow = Random.rangeFloor(4,10);
  let numCol = Random.rangeFloor(4,10);

  //STEP 1

  for (let j = 0; j <= numCol; j++) {
    let points = [];
    prevHeight = 1;
    let columnWidth = 1;

    if (j < numCol) {
        columnWidth = Random.rangeFloor(prevWidth, width - 1);
    } else {
        columnWidth = width - 1;
    }

    for (let i = 0; i <= numRow; i++) {
        points = [];
        let rowHeight = 1;

        if (i < numRow) {
            rowHeight = Random.rangeFloor(prevHeight, height - 1);
        } else {
            rowHeight = height - 1;
        }

        points.push([prevWidth, prevHeight], [columnWidth, prevHeight], [columnWidth, rowHeight], [prevWidth, rowHeight], [prevWidth, prevHeight]);

        let point1 = {
            x: prevWidth,
            y: prevHeight
        }

        let point2 = {
            x: columnWidth,
            y: rowHeight
        }


        prevHeight = rowHeight;
        boxes.push(points);

    }
    prevWidth = columnWidth;

  }

  //STEP 2
  for (let i = 0; i < boxes.length; i++) {
    const x1 = boxes[i][0][0];
    const y1 = boxes[i][0][1];
    const x2 = boxes[i][2][0];
    const y2 = boxes[i][2][1];

    const xCenter = (x1 + x2)/2
    const yCenter = (y1 + y2)/2

    const posRect = {
        x1,
        y1,
        x2,
        y2
    }

    // ADD CIRCLES
    const posX = xCenter;
    const posY = yCenter;
    const numCircles = Random.rangeFloor(10,100);
    const total = 40;
    const scalar = math.mapRange(numCircles,10,100,100, 10) / 100;
    const deltaX = 0;
    const deltaY = 0;

    for (let j = 0; j < numCircles; j++) {
      let circle = [];
      for (let k = 0; k <= total; k++) {
          const angle = math.mapRange(k, 0, total, 0, 2 * Math.PI);
          const x = (posX + deltaX) + Math.cos(angle) * (j * scalar) ;
          const y = (posY + deltaY) + Math.sin(angle) * (j * scalar) ;

          if (x < posRect.x2 && x > posRect.x1 && y < posRect.y2 && y > posRect.y1 ) {
              circle.push([x,y])
          } else {
            if(circle.length != 0) {
              paths.push(circle)
            }
              circle = [];
          }
      }

      if(circle.length != 0) {
        paths.push(circle);
      }
    }


  }
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

